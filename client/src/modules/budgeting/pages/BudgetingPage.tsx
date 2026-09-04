import { useState } from 'react';
import { LayoutDashboard, Wallet, Building2, TrendingUp } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import BudgetingDashboardPage from './BudgetingDashboardPage';
import BudgetsPage from './BudgetsPage';
import DepartmentDashboardPage from './DepartmentDashboardPage';
import ForecastPage from './ForecastPage';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: BudgetingDashboardPage, perm: 'view_reports' },
  { key: 'budgets', label: 'Budgets', icon: Wallet, Component: BudgetsPage, perm: 'view' },
  { key: 'departments', label: 'Departments', icon: Building2, Component: DepartmentDashboardPage, perm: 'view_reports' },
  { key: 'forecast', label: 'Forecast', icon: TrendingUp, Component: ForecastPage, perm: 'view_forecast' },
];

export default function BudgetingPage() {
  const { hasPermission } = useApp();
  const tabs = ALL_TABS.filter((t) => hasPermission('budget', t.perm));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'budgets');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return <div className="p-12 text-center text-gray-400 text-sm">You don't have permission to view Budgeting & Forecasting.</div>;
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-8 pt-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${isActive ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
