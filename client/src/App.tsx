import StockTakeView from "./components/StockTakeView";
import InventoryView from "./components/InventoryView";
import InventoryItemsView from "./components/InventoryItemsView";
import WarehouseView from "./components/WarehouseView";
import StockTransferView from "./components/StockTransferView";

import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useSimpleRouter } from "./hooks/useSimpleRouter";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Breadcrumbs from "./components/Breadcrumbs";
import Toast from "./components/Toast";

// Page Views
import DashboardView from "./components/DashboardView";
import EmployeeListView from "./components/EmployeeListView";
import EmployeeDetailView from "./components/EmployeeDetailView";
import AddEmployeeView from "./components/AddEmployeeView";
import LeaveRequestsView from "./components/LeaveRequestsView";
import TasksView from "./components/TasksView";

// Recruitment
import { RecruitmentProvider } from "./modules/recruitment/context/RecruitmentContext";
import CareersPage from "./modules/recruitment/pages/CareersPage";
import ApplyPage from "./modules/recruitment/pages/ApplyPage";
import StatusCheckPage from "./modules/recruitment/pages/StatusCheckPage";
import JobPostingsAdminPage from "./modules/recruitment/pages/JobPostingsAdminPage";
import CandidateDatabasePage from "./modules/recruitment/pages/CandidateDatabasePage";

// Catalog
import { CatalogProvider } from "./modules/catalog/context/CatalogContext";
import CatalogPage from "./modules/catalog/pages/CatalogPage";
import ProductDetailPage from "./modules/catalog/pages/ProductDetailPage";
import CatalogAdminPage from "./modules/catalog/pages/CatalogAdminPage";

function AppContent() {
  const { path, navigate, params } = useSimpleRouter();

  const [pathname, search] = path.split("?");
  const jobIdParam = new URLSearchParams(search || "").get("job") || "";

  const { toasts, dismissToast } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const showSearch = pathname === "/employees";

  const renderActiveView = () => {
    switch (pathname) {
      case "/":
        return <DashboardView onNavigate={navigate} />;

      case "/employees":
        return (
          <EmployeeListView
            onNavigate={navigate}
            searchQuery={searchQuery}
          />
        );

      case "/employees/new":
        return <AddEmployeeView onNavigate={navigate} />;

      case "/leave-requests":
        return <LeaveRequestsView />;

      case "/tasks":
        return <TasksView />;

      // =========================
      // INVENTORY
      // =========================

      case "/inventory":
        return <InventoryView />;

      case "/inventory/warehouses":
        return <WarehouseView />;

      case "/inventory/items":
        return <InventoryItemsView />;

      case "/inventory/transfers":
  return <StockTransferView />;

case "/inventory/stock-take":
  return <StockTakeView />;
      // =========================
      // RECRUITMENT
      // =========================

      case "/careers":
        return <CareersPage onNavigate={navigate} />;

      case "/careers/apply":
        return (
          <ApplyPage
            jobId={jobIdParam}
            onNavigate={navigate}
          />
        );

      case "/status":
        return <StatusCheckPage />;

      case "/recruitment/postings":
        return <JobPostingsAdminPage />;

      case "/recruitment/candidates":
        return <CandidateDatabasePage />;

      // =========================
      // CATALOG
      // =========================

      case "/catalog":
        return <CatalogPage onNavigate={navigate} />;

      case "/catalog/manage":
        return <CatalogAdminPage />;

      default:
        if (pathname.startsWith("/employees/") && params.id) {
          return (
            <EmployeeDetailView
              id={params.id}
              onNavigate={navigate}
            />
          );
        }

        if (
          pathname.startsWith("/catalog/") &&
          pathname !== "/catalog/manage"
        ) {
          const productId = pathname.split("/")[2];

          return (
            <ProductDetailPage
              productId={productId}
              onNavigate={navigate}
            />
          );
        }

        return <DashboardView onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-white text-gray-800 relative">

      {/* Mobile Sidebar */}
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

      {/* Desktop Sidebar */}
      <Sidebar
        currentPath={path}
        onNavigate={navigate}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/20">

        {/* Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearch={showSearch}
          onMenuToggle={() =>
            setMobileSidebarOpen((prev) => !prev)
          }
        />

        {/* Breadcrumbs */}
        <Breadcrumbs
          currentPath={path}
          onNavigate={navigate}
        />

        {/* Page */}
        <div className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        toasts={toasts}
        onClose={dismissToast}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RecruitmentProvider>
        <CatalogProvider>
          <AppContent />
        </CatalogProvider>
      </RecruitmentProvider>
    </AppProvider>
  );
}