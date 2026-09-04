import React from 'react';
import { ChevronRight, Home, Users, CalendarRange, CheckSquare, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumbs({ currentPath, onNavigate }: BreadcrumbsProps) {
  const { employees } = useApp();

  // Parse path to tokens
  const getBreadcrumbs = () => {
    const items = [{ name: 'Workspace', path: '/', icon: Home }];

    if (currentPath === '/') {
      items.push({ name: 'Dashboard', path: '/', icon: Home });
    } else if (currentPath === '/employees') {
      items.push({ name: 'Employees', path: '/employees', icon: Users });
    } else if (currentPath === '/employees/new') {
      items.push({ name: 'Employees', path: '/employees', icon: Users });
      items.push({ name: 'New Hire', path: '/employees/new', icon: UserPlus });
    } else if (currentPath.startsWith('/employees/')) {
      items.push({ name: 'Employees', path: '/employees', icon: Users });
      const empId = currentPath.split('/')[2];
      const emp = employees.find(e => e.id === empId);
      items.push({ 
        name: emp ? emp.name : empId, 
        path: currentPath, 
        icon: Users 
      });
    } else if (currentPath === '/leave-requests') {
      items.push({ name: 'Leave Requests', path: '/leave-requests', icon: CalendarRange });
    } else if (currentPath === '/tasks') {
      items.push({ name: 'Tasks', path: '/tasks', icon: CheckSquare });
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center gap-1.5 py-3 px-6 bg-gray-50/50 border-b border-gray-200/80 text-xs text-gray-500 font-medium select-none">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;

        return (
          <React.Fragment key={crumb.path + idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            
            <button
              onClick={() => !isLast && onNavigate(crumb.path)}
              disabled={isLast}
              className={`flex items-center gap-1 transition-all ${
                isLast 
                  ? 'text-gray-800 font-semibold cursor-default' 
                  : 'hover:text-gray-900 cursor-pointer text-gray-500'
              }`}
            >
              {isLast ? (
                <span className="truncate">{crumb.name}</span>
              ) : (
                <span className="truncate">{crumb.name}</span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
