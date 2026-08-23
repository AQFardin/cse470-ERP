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

//Recruitment view
import { RecruitmentProvider } from './modules/recruitment/context/RecruitmentContext';
import CareersPage from './modules/recruitment/pages/CareersPage';
import ApplyPage from './modules/recruitment/pages/ApplyPage';
import StatusCheckPage from './modules/recruitment/pages/StatusCheckPage';
import JobPostingsAdminPage from './modules/recruitment/pages/JobPostingsAdminPage';
import CandidateDatabasePage from './modules/recruitment/pages/CandidateDatabasePage';

//products catalog 
import { CatalogProvider } from './modules/catalog/context/CatalogContext';
import CatalogPage from './modules/catalog/pages/CatalogPage';
import ProductDetailPage from './modules/catalog/pages/ProductDetailPage';
import CatalogAdminPage from './modules/catalog/pages/CatalogAdminPage';


//CRM
import { CrmProvider } from './modules/crm/context/CrmContext';
import CrmPage from './modules/crm/pages/CrmPage';

//Membership and subscription

import { SubscriptionProvider } from './modules/subscription/context/SubscriptionContext';
import SubscriptionsPage from './modules/subscription/pages/SubscriptionsPage';
//Refunds and returns
import { ReturnsProvider } from './modules/returns/context/ReturnsContext';
import ReturnsPage from './modules/returns/pages/ReturnsPage';

function AppContent() {
  const { path, navigate, params } = useSimpleRouter();
  const [pathname, search] = path.split('?');
  const jobIdParam = new URLSearchParams(search).get('job') || '';
  const { toasts, dismissToast } = useApp();

  // Search state to pass to Header and filter in EmployeeListView
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Determine if search bar should be visible in the header
  const showSearch = path === '/employees';

  // Render active route
  const renderActiveView = () => {
    switch (pathname) {
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
      case '/careers':
        return <CareersPage onNavigate={navigate} />;
      case '/careers/apply':
        return <ApplyPage jobId={jobIdParam} onNavigate={navigate} />;
      case '/status':
        return <StatusCheckPage />;
      case '/recruitment/postings':
        return <JobPostingsAdminPage />;
      case '/recruitment/candidates':
        return <CandidateDatabasePage />;
      case '/catalog':
        return <CatalogPage onNavigate={navigate} />;
      case '/catalog/manage':
        return <CatalogAdminPage />;
            case '/crm':
        return <CrmPage />;
      case '/subscriptions':
        return <SubscriptionsPage />;
            case '/returns':
        return <ReturnsPage />;
      default:
        // Handle employee detail route (/employees/:id)
        if (path.startsWith('/employees/') && params.id) {
          return <EmployeeDetailView id={params.id} onNavigate={navigate} />;
        }
        if (pathname.startsWith('/catalog/') && pathname !== '/catalog/manage') {
          const productId = pathname.split('/')[2];
          return <ProductDetailPage productId={productId} onNavigate={navigate} />;
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
      <RecruitmentProvider>
        <CatalogProvider>
          <CrmProvider>
            <SubscriptionProvider>
               <ReturnsProvider>
              <AppContent />
              </ReturnsProvider>
            </SubscriptionProvider>
          </CrmProvider>
        </CatalogProvider>
      </RecruitmentProvider>
    </AppProvider>
  );
}