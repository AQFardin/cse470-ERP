import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useSimpleRouter } from './hooks/useSimpleRouter';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Breadcrumbs from './components/Breadcrumbs';
import Toast from './components/Toast';

// Page Views
import DashboardView from './components/DashboardView';
import EmployeeListView from './components/EmployeeListView';
import EmployeeDetailView from './components/EmployeeDetailView';
import AddEmployeeView from './components/AddEmployeeView';
import LeaveRequestsView from './components/LeaveRequestsView';
import TasksView from './components/TasksView';

function AppContent() {
  const { path, navigate, params } = useSimpleRouter();
  const { toasts, dismissToast } = useApp();

  // Search state to pass to Header and filter in EmployeeListView
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Determine if search bar should be visible in the header
  const showSearch = path === '/employees';

  // Render active route
  const renderActiveView = () => {
    switch (path) {
      case '/':
        return <DashboardView onNavigate={navigate} />;
      case '/employees':
        return <EmployeeListView onNavigate={navigate} searchQuery={searchQuery} />;
      case '/employees/new':
        return <AddEmployeeView onNavigate={navigate} />;
      case '/leave-requests':
        return <LeaveRequestsView />;
      case '/tasks':
        return <TasksView />;
      default:
        // Handle employee detail route (/employees/:id)
        if (path.startsWith('/employees/') && params.id) {
          return <EmployeeDetailView id={params.id} onNavigate={navigate} />;
        }
        return <DashboardView onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-white text-gray-800 relative">
      {/* Mobile slide-out drawer */}
      <Sidebar 
        currentPath={path} 
        onNavigate={(targetPath) => {
          navigate(targetPath);
          setMobileSidebarOpen(false);
        }} 
        isMobile={true}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Left fixed Sidebar with active item states & collapse */}
      <Sidebar currentPath={path} onNavigate={navigate} />

      {/* Right main workspace layout */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/20">
        
        {/* Header toolbar */}
        <Header 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          showSearch={showSearch} 
          onMenuToggle={() => setMobileSidebarOpen(prev => !prev)}
        />

        {/* Contextual path navigation breadcrumbs */}
        <Breadcrumbs currentPath={path} onNavigate={navigate} />

        {/* Scrollable active view container */}
        <div className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </div>
      </div>

      {/* Floating System-Wide Alerts Toast Overlay */}
      <Toast toasts={toasts} onClose={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
