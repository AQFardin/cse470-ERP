import React from 'react';
import { Search, ShieldAlert, Sparkles, User, Bell, ChevronDown, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  onMenuToggle?: () => void;
}

export default function Header({ searchQuery, setSearchQuery, showSearch, onMenuToggle }: HeaderProps) {
  const { currentUserRole, setCurrentUserRole, employees, currentEmployeeId } = useApp();

  const me = employees.find(e => e.id === currentEmployeeId);

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center justify-between shrink-0 select-none gap-4">
      {/* Search Bar or empty */}
      <div className="flex-1 max-w-sm flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {showSearch ? (
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee roster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Workspace Active
          </div>
        )}
      </div>

      {/* Right Tools: Role Toggle, Notifications, Avatar */}
      <div className="flex items-center gap-6">
        {/* Customized Pill Toggle for Role Switcher */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-gray-400">View Mode</span>
          <div className="p-1 bg-gray-100 border border-gray-200/60 rounded-xl flex gap-0.5 relative">
            <button
              onClick={() => {
                setCurrentUserRole('manager');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all relative z-10 cursor-pointer ${
                currentUserRole === 'manager' 
                  ? 'text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {currentUserRole === 'manager' && (
                <motion.div
                  layoutId="role-bg"
                  className="absolute inset-0 bg-white rounded-lg border border-gray-200/50 shadow-xs"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">Manager</span>
            </button>
            <button
              onClick={() => {
                setCurrentUserRole('employee');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all relative z-10 cursor-pointer ${
                currentUserRole === 'employee' 
                  ? 'text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {currentUserRole === 'employee' && (
                <motion.div
                  layoutId="role-bg"
                  className="absolute inset-0 bg-white rounded-lg border border-gray-200/50 shadow-xs"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">Employee</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <button className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative cursor-pointer">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>

        {/* User Dropdown */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {me ? me.name.split(' ').map(n => n[0]).join('') : 'FA'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-gray-800 leading-tight">{me?.name || 'Fardin Ahmed'}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{me?.role || 'Financial Analyst'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
