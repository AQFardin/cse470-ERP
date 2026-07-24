import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, Menu, Shield, UserCheck, Crown, HeartHandshake, Headphones, ShoppingBag, Users as UsersIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  onMenuToggle?: () => void;
}

const ROLE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  ADMIN: { icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  MANAGER: { icon: Shield, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  HR: { icon: HeartHandshake, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  SALES: { icon: ShoppingBag, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  SUPPORT: { icon: Headphones, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  EMPLOYEE: { icon: UserCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  VENDOR: { icon: UsersIcon, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
};

export default function Header({ searchQuery, setSearchQuery, showSearch, onMenuToggle }: HeaderProps) {
  const { currentUser, allUsers, switchUser, highestRole } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleConfig = ROLE_CONFIG[highestRole] || ROLE_CONFIG.EMPLOYEE;
  const RoleIcon = roleConfig.icon;

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

      {/* Right Tools */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${roleConfig.bgColor} border border-current/10`}>
          <RoleIcon className={`w-3.5 h-3.5 ${roleConfig.color}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${roleConfig.color}`}>
            {highestRole}
          </span>
        </div>

        {/* Notifications */}
        <button className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative cursor-pointer">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>

        {/* User Impersonation Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-4 border-l border-gray-100 cursor-pointer hover:bg-gray-50 rounded-xl py-1 pr-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : '??'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-gray-800 leading-tight">{currentUser?.name || 'Loading...'}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{currentUser?.employee?.position || ''}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-black/8 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Switch User (Impersonate)</p>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {allUsers.map((user) => {
                    const isActive = currentUser?.id === user.id;
                    const uRoles = (user.roles || []).filter(r => r !== 'EMPLOYEE');
                    const displayRole = uRoles.length > 0 ? uRoles[0] : 'EMPLOYEE';
                    const config = ROLE_CONFIG[displayRole] || ROLE_CONFIG.EMPLOYEE;
                    const Icon = config.icon;

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                          isActive ? 'bg-indigo-50/80' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                              {user.name}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Icon className={`w-3 h-3 ${config.color}`} />
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                              {uRoles.join(' + ') || 'EMPLOYEE'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">
                          {user.employee?.employeeId || ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
