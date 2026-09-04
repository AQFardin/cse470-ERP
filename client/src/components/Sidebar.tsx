import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarRange, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Lock,
  UserCheck,
  X,
  ScrollText,
  UserMinus,
  Wallet,
  Clock,
  Shield,
  Crown,
  HeartHandshake,
  Headphones,
  ShoppingBag,
  Users as UsersIcon,
  User as UserIcon,
  ExternalLink,
  FolderKanban,
  LifeBuoy,
  Briefcase,
  Package,
  Contact2,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const ROLE_ICON_MAP: Record<string, React.ElementType> = {
  ADMIN: Crown,
  PROJECT_MANAGER: FolderKanban,
  MANAGER: Shield,
  HR: HeartHandshake,
  IT: LifeBuoy,
  SALES: ShoppingBag,
  SUPPORT: Headphones,
  EMPLOYEE: UserCheck,
  VENDOR: UsersIcon,
};

export default function Sidebar({ 
  currentPath, 
  onNavigate, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
  const { currentUser, currentEmployeeId, hasPermission, highestRole } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Employees button is shown ONLY to users with team or company-wide roster view permissions (Manager / HR / Admin)
  const canViewRoster = hasPermission('employee_records', 'view_all') || hasPermission('employee_records', 'view_team');

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, show: true },
    { name: 'Employees', path: '/employees', icon: Users, show: canViewRoster },
    { name: 'Projects', path: '/projects', icon: FolderKanban, show: true },
    { name: 'Leave Requests', path: '/leave-requests', icon: CalendarRange, show: true },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, show: true },
    { name: 'Help Desk', path: '/help-desk', icon: LifeBuoy, show: true },
    { name: 'Leave Balances', path: '/leave-balances', icon: Wallet, show: true },
    { name: 'Offboarding', path: '/offboarding', icon: UserMinus, show: hasPermission('offboarding', 'view') || hasPermission('offboarding', 'request') },
    { name: 'Attendance', path: '/attendance', icon: Clock, show: true },
    { name: 'Audit Logs', path: '/audit-logs', icon: ScrollText, show: hasPermission('audit', 'view') },
    // ─── New Modules from main branch ───────────────────────
    { name: 'Careers', path: '/careers', icon: Briefcase, show: true },
    { name: 'Recruitment', path: '/recruitment/postings', icon: Contact2, show: hasPermission('employee_records', 'create') },
    { name: 'Catalog', path: '/catalog', icon: Package, show: true },
    { name: 'CRM', path: '/crm', icon: ShoppingBag, show: true },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard, show: true },
    { name: 'Returns', path: '/returns', icon: RotateCcw, show: true },
  ].filter(item => item.show);

  const RoleIcon = ROLE_ICON_MAP[highestRole] || UserCheck;

  const handleProfileClick = () => {
    const empId = currentUser?.employeeId || currentEmployeeId;
    if (empId) {
      onNavigate(`/employees/${empId}`);
      if (isMobile && onClose) onClose();
    }
  };

  const renderNavContent = (collapsed: boolean, isMobileMode: boolean) => (
    <>
      {/* Brand Header */}
      <div className={`h-16 flex items-center ${isMobileMode ? 'justify-between' : ''} px-5 border-b border-[#27272a] gap-3 overflow-hidden`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
            <Building2 className="w-4 h-4" />
          </div>
          {(!collapsed || isMobileMode) && (
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
        {isMobileMode && onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <div className="px-3 py-4 space-y-1 overflow-y-auto flex-1">
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
                if (isMobileMode && onClose) onClose();
              }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group cursor-pointer ${
                isActive 
                  ? 'text-white' 
                  : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]'
              }`}
            >
              {isActive && (
                isMobileMode ? (
                  <div className="absolute inset-0 bg-[#18181b] rounded-xl border border-[#27272a]" />
                ) : (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-[#18181b] rounded-xl border border-[#27272a]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )
              )}
              {isActive && (
                isMobileMode ? (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg bg-indigo-500" />
                ) : (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )
              )}

              <Icon className={`w-[18px] h-[18px] shrink-0 relative z-10 ${isActive ? 'text-indigo-400' : 'text-[#a1a1aa] group-hover:text-[#fafafa]'}`} />
              
              {(!collapsed || isMobileMode) && (
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
    </>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-40 md:hidden cursor-pointer"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-[260px] bg-[#09090b] border-r border-[#27272a] flex flex-col justify-between select-none z-50 md:hidden"
            >
              <div className="flex flex-col flex-1">
                {renderNavContent(false, true)}
              </div>

              {/* Bottom-left Clickable Profile Widget (Mobile) */}
              <div className="flex flex-col">
                <div className="p-3 border-t border-[#27272a] overflow-hidden">
                  <button
                    onClick={handleProfileClick}
                    title="View My Account Profile"
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-[#18181b]/70 hover:bg-[#27272a] border border-[#27272a] hover:border-indigo-500/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                        {currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : 'ME'}
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-xs font-semibold text-[#fafafa] group-hover:text-indigo-300 truncate">{currentUser?.name || 'My Profile'}</span>
                        <span className="text-[10px] text-[#a1a1aa] truncate flex items-center gap-1 font-medium font-mono uppercase">
                          <RoleIcon className="w-2.5 h-2.5" /> {highestRole}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-indigo-400 shrink-0" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop Sidebar
  return (
    <motion.div
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="hidden md:flex h-full bg-[#09090b] border-r border-[#27272a] flex-col justify-between select-none shrink-0"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {renderNavContent(isCollapsed, false)}
      </div>

      {/* Role / Clickable Profile section & collapse trigger */}
      <div className="flex flex-col">
        <div className="p-3 border-t border-[#27272a] overflow-hidden">
          <button
            onClick={handleProfileClick}
            title="View My Account Profile"
            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#18181b]/70 hover:bg-[#27272a] border border-[#27272a] hover:border-indigo-500/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                {currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : 'ME'}
              </div>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col min-w-0 text-left"
                >
                  <span className="text-xs font-semibold text-[#fafafa] group-hover:text-indigo-300 truncate">{currentUser?.name || 'My Profile'}</span>
                  <span className="text-[10px] text-[#a1a1aa] truncate flex items-center gap-1 font-medium font-mono uppercase">
                    <RoleIcon className="w-2.5 h-2.5" /> {highestRole}
                  </span>
                </motion.div>
              )}
            </div>
            {!isCollapsed && (
              <ExternalLink className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-indigo-400 shrink-0" />
            )}
          </button>
        </div>

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
