import { useState } from 'react';
import { Receipt, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import ApPage from './ap/ApPage';
import ArPage from './ar/ArPage';

const TOP_TABS = [
  { key: 'ap', label: 'Accounts Payable', icon: Receipt, Component: ApPage, module: 'ap' },
  { key: 'ar', label: 'Accounts Receivable', icon: FileSpreadsheet, Component: ArPage, module: 'ar' },
];

export default function FinancialManagementPage() {
  const { hasPermission } = useApp();
  const tabs = TOP_TABS.filter((t) => hasPermission(t.module, 'view') || hasPermission(t.module, 'view_reports'));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'ap');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return <div className="p-12 text-center text-gray-400 text-sm">You don't have permission to view Financial Management.</div>;
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-8 pt-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${isActive ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
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
