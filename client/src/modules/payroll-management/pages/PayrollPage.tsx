import { useState } from 'react';
import { LayoutDashboard, CalendarRange, Wallet, BarChart3, FileText } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import PayrollDashboardPage from './PayrollDashboardPage';
import PayrollPeriodsPage from './PayrollPeriodsPage';
import SalaryStructuresPage from './SalaryStructuresPage';
import PayrollReportsPage from './PayrollReportsPage';
import PayslipPage from './PayslipPage';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: PayrollDashboardPage, perm: 'view_reports' },
  { key: 'periods', label: 'Payroll Periods', icon: CalendarRange, Component: PayrollPeriodsPage, perm: 'view' },
  { key: 'salary', label: 'Salary Structures', icon: Wallet, Component: SalaryStructuresPage, perm: 'manage_salary_structure' },
  { key: 'reports', label: 'Reports', icon: BarChart3, Component: PayrollReportsPage, perm: 'view_reports' },
  { key: 'payslip', label: 'Payslip', icon: FileText, Component: PayslipPage, perm: 'view_payslip' },
];

export default function PayrollPage() {
  const { hasPermission } = useApp();
  const tabs = ALL_TABS.filter((t) => hasPermission('payroll', t.perm));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'payslip');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return <div className="p-12 text-center text-gray-400 text-sm">You don't have permission to view Payroll.</div>;
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-8 pt-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${isActive ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
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
