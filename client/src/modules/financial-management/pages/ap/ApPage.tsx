import { useState } from 'react';
import { LayoutDashboard, Receipt, Wallet, FileText, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import ApDashboardPage from './ApDashboardPage';
import ApBillsPage from './ApBillsPage';
import ApPaymentsPage from './ApPaymentsPage';
import VendorStatementPage from './VendorStatementPage';
import ApAgingPage from './ApAgingPage';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: ApDashboardPage, perm: 'view_reports' },
  { key: 'bills', label: 'Bills', icon: Receipt, Component: ApBillsPage, perm: 'view' },
  { key: 'payments', label: 'Payments', icon: Wallet, Component: ApPaymentsPage, perm: 'view_payment' },
  { key: 'statement', label: 'Vendor Statement', icon: FileText, Component: VendorStatementPage, perm: 'view_reports' },
  { key: 'aging', label: 'Aging', icon: AlertTriangle, Component: ApAgingPage, perm: 'view_reports' },
];

export default function ApPage() {
  const { hasPermission } = useApp();
  const tabs = ALL_TABS.filter((t) => hasPermission('ap', t.perm));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'bills');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return <div className="p-12 text-center text-gray-400 text-sm">You don't have permission to view Accounts Payable.</div>;
  }

  return (
    <div>
      <div className="border-b border-gray-100 bg-gray-50/60 px-8 pt-3">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${isActive ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
