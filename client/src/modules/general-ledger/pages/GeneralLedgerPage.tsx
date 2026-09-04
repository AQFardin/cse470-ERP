import { useState } from 'react';
import { BookOpen, ScrollText, BookMarked, Scale, FileBarChart, CalendarRange } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import ChartOfAccountsPage from './ChartOfAccountsPage';
import JournalEntriesPage from './JournalEntriesPage';
import GeneralLedgerReportPage from './GeneralLedgerReportPage';
import TrialBalancePage from './TrialBalancePage';
import FinancialStatementsPage from './FinancialStatementsPage';
import FiscalPeriodsPage from './FiscalPeriodsPage';

const ALL_TABS = [
  { key: 'accounts', label: 'Chart of Accounts', icon: BookOpen, Component: ChartOfAccountsPage, perm: 'view_chart_of_accounts' },
  { key: 'journals', label: 'Journal Entries', icon: ScrollText, Component: JournalEntriesPage, perm: 'view_journal' },
  { key: 'ledger', label: 'General Ledger', icon: BookMarked, Component: GeneralLedgerReportPage, perm: 'view_general_ledger' },
  { key: 'trial-balance', label: 'Trial Balance', icon: Scale, Component: TrialBalancePage, perm: 'view_trial_balance' },
  { key: 'statements', label: 'Financial Statements', icon: FileBarChart, Component: FinancialStatementsPage, perm: 'view_financial_statements' },
  { key: 'fiscal-periods', label: 'Fiscal Periods', icon: CalendarRange, Component: FiscalPeriodsPage, perm: 'view_fiscal_periods' },
];

export default function GeneralLedgerPage() {
  const { hasPermission } = useApp();
  const tabs = ALL_TABS.filter((t) => hasPermission('general_ledger', t.perm));
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'accounts');
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.Component;

  if (tabs.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 text-sm">
        You don't have permission to view any General Ledger data.
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-8 pt-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
