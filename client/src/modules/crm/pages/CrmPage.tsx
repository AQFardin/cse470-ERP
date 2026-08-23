import { useState } from 'react';
import { Contact, Target, TrendingUp, BarChart3 } from 'lucide-react';
import CustomersPage from './CustomersPage';
import LeadsPage from './LeadsPage';
import PipelinePage from './PipelinePage';
import ReportsPage from './ReportsPage';

const TABS = [
  { key: 'customers', label: 'Customers', icon: Contact, Component: CustomersPage },
  { key: 'leads', label: 'Leads', icon: Target, Component: LeadsPage },
  { key: 'pipeline', label: 'Pipeline', icon: TrendingUp, Component: PipelinePage },
  { key: 'reports', label: 'Reports', icon: BarChart3, Component: ReportsPage },
];

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState('customers');
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component || CustomersPage;

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-8 pt-4">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <ActiveComponent />
    </div>
  );
}