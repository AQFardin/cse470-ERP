import { useState } from 'react';
import { LayoutDashboard, Settings2, CalendarRange, BarChart3 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import ComplianceDashboardPage from './ComplianceDashboardPage';
import TaxConfigurationPage from './TaxConfigurationPage';
import TaxPeriodsPage from './TaxPeriodsPage';
import TaxReportsPage from './TaxReportsPage';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: ComplianceDashboardPage, perm: 'view_compliance' },
  { key: 'configuration', label: 'Tax Configuration', icon: Settings2, Component: TaxConfigurationPage, perm: 'view_compliance' },
  { key: 'periods', label: 'Tax Periods', icon: CalendarRange, Component: TaxPeriodsPage, perm: 'view_compliance' },
  { key: 'reports', label: 'Reports', icon: BarChart3, Component: TaxReportsPage, perm: 'view_tax_reports' },
];

export default function CompliancePage() {
  const { hasPermission } = useApp();
  const tabs = ALL_TABS.filter((t) => hasPermission('compliance', t.perm));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'dashboard');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return <div className="p-12 text-center text-gray-400 text-sm">You don't have permission to view Compliance & Tax.</div>;
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
