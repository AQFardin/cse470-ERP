import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarRange, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Building2,
  Lock,
  UserCheck,
  X,
  Briefcase,
  UsersRound,
  Package,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ 
  currentPath, 
  onNavigate, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
  const { currentUserRole, employees, currentEmployeeId } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const me = employees.find(e => e.id === currentEmployeeId);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Leave Requests', path: '/leave-requests', icon: CalendarRange },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Job Postings', path: '/recruitment/postings', icon: Briefcase },
    { name: 'Candidates', path: '/recruitment/candidates', icon: UsersRound },
    { name: 'Product Catalog', path: '/catalog', icon: Package },
  ];

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-40 md:hidden cursor-pointer"
            />
            
            {/* Mobile Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-[260px] bg-[#09090b] border-r border-[#27272a] flex flex-col justify-between select-none z-50 md:hidden"
            >
              <div className="flex flex-col flex-1">
                {/* Brand Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-[#27272a] gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-semibold text-sm tracking-tight text-[#fafafa]">Acme Portal</span>
                      <span className="text-[10px] font-medium text-indigo-400 font-mono">HR PLATFORM</span>
                    </div>
                  </div>
                  {/* Close button for mobile drawer */}
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="px-3 py-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === '/' 
                      ? currentPath === '/' 
                      : currentPath.startsWith(item.path);

                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          onNavigate(item.path);
                          if (onClose) onClose();
                        }}
                        className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group cursor-pointer ${
                          isActive 
                            ? 'text-white' 
                            : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-[#18181b] rounded-xl border border-[#27272a]" />
                        )}
                        {isActive && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg bg-indigo-500" />
                        )}
                        <Icon className={`w-[18px] h-[18px] shrink-0 relative z-10 ${isActive ? 'text-indigo-400' : 'text-[#a1a1aa] group-hover:text-[#fafafa]'}`} />
                        <span className="relative z-10 truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile section */}
              <div className="flex flex-col">
                <div className="p-3 border-t border-[#27272a] overflow-hidden">
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-[#18181b]/50 border border-[#27272a]/40">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                      {me ? me.name.split(' ').map(n => n[0]).join('') : 'ME'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#fafafa] truncate">{me?.name || 'Fardin Ahmed'}</span>
                      <span className="text-[10px] text-[#a1a1aa] truncate flex items-center gap-1 font-medium font-mono uppercase">
                        {currentUserRole === 'manager' ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-amber-500" /> Manager
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-2.5 h-2.5 text-emerald-500" /> Employee
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop Sidebar (hidden on mobile, flex on md and up)
  return (
    <motion.div
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="hidden md:flex h-full bg-[#09090b] border-r border-[#27272a] flex-col justify-between select-none shrink-0"
    >
      <div className="flex flex-col flex-1">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-[#27272a] gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
            <Building2 className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="font-display font-semibold text-sm tracking-tight text-[#fafafa]">Acme Portal</span>
              <span className="text-[10px] font-medium text-indigo-400 font-mono">HR PLATFORM</span>
            </motion.div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Check active state
            // Exact match or prefix match for subpaths (like /employees/:id matches /employees)
            const isActive = item.path === '/' 
              ? currentPath === '/' 
              : currentPath.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group cursor-pointer ${
                  isActive 
                    ? 'text-white' 
                    : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]'
                }`}
              >
                {/* Active background pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-[#18181b] rounded-xl border border-[#27272a]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Active left indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <Icon className={`w-[18px] h-[18px] shrink-0 relative z-10 ${isActive ? 'text-indigo-400' : 'text-[#a1a1aa] group-hover:text-[#fafafa]'}`} />
                
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role / Profile section & collapse trigger */}
      <div className="flex flex-col">
        {/* Logged in User Widget */}
        <div className="p-3 border-t border-[#27272a] overflow-hidden">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#18181b]/50 border border-[#27272a]/40">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 select-none">
              {me ? me.name.split(' ').map(n => n[0]).join('') : 'ME'}
            </div>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-xs font-semibold text-[#fafafa] truncate">{me?.name || 'Fardin Ahmed'}</span>
                <span className="text-[10px] text-[#a1a1aa] truncate flex items-center gap-1 font-medium font-mono uppercase">
                  {currentUserRole === 'manager' ? (
                    <>
                      <Lock className="w-2.5 h-2.5 text-amber-500" /> Manager
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-2.5 h-2.5 text-emerald-500" /> Employee
                    </>
                  )}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Collapse button */}
        <div className="p-3 flex justify-end border-t border-[#27272a]/60">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
