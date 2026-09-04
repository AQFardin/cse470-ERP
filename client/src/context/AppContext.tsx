import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Employee, Department, LeaveRequest, Task, User } from '../types';
import * as api from '../lib/api';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  // User & RBAC
  currentUser: User | null;
  allUsers: User[];
  switchUser: (userId: string) => void;
  hasPermission: (module: string, action: string) => boolean;
  highestRole: string; // For display purposes

  // Backward compat
  currentUserRole: 'manager' | 'employee';
  currentEmployeeId: string;
  
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  dashboardStats: any;
  
  // Actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deactivateEmployee: (id: string, currentStatus: string) => Promise<void>;
  
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'requestDate' | 'status' | 'employeeName' | 'departmentId'>) => Promise<void>;
  updateLeaveRequestStatus: (id: string, status: 'approved' | 'denied') => Promise<void>;
  
  addTask: (task: Omit<Task, 'id' | 'status' | 'employeeName'>) => Promise<void>;
  updateTaskStatus: (id: string, status: 'pending' | 'in-progress' | 'completed') => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  refreshData: () => Promise<void>;
  
  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
  
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Hardcoded departments since backend uses an enum
const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'finance', name: 'Finance', color: 'emerald', manager: 'Sarah Jenkins', budget: '$1,450,000', description: 'Accounting' },
  { id: 'hr', name: 'HR', color: 'rose', manager: 'Marcus Vance', budget: '$620,000', description: 'Human Resources' },
  { id: 'marketing', name: 'Marketing', color: 'purple', manager: 'Alice Manager', budget: '$980,000', description: 'Marketing' },
  { id: 'sales', name: 'Sales', color: 'blue', manager: 'David Miller', budget: '$1,850,000', description: 'Sales' },
  { id: 'engineering', name: 'Engineering', color: 'teal', manager: 'Elena Rostova', budget: '$3,200,000', description: 'Engineering' },
  { id: 'operations', name: 'Operations', color: 'amber', manager: 'Sarah Chen', budget: '$1,100,000', description: 'Operations' },
];

// Role priority for display
const ROLE_PRIORITY: Record<string, number> = {
  ADMIN: 10, PROJECT_MANAGER: 9, MANAGER: 8, HR: 7, IT: 6, SALES: 5, SUPPORT: 4, EMPLOYEE: 2, VENDOR: 1,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toast functions
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load data from backend
  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const [emps, leaves, tsks, stats] = await Promise.all([
        api.fetchEmployees(),
        api.fetchLeaveRequests(),
        api.fetchTasks(),
        api.fetchDashboardStats()
      ]);
      
      setEmployees(emps);
      setLeaveRequests(leaves);
      setTasks(tsks);
      setDashboardStats(stats);
    } catch (error: any) {
      showToast(error.message || 'Failed to connect to backend API', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, showToast]);

  // Load users list on mount (no auth needed)
  useEffect(() => {
    (async () => {
      try {
        const users = await api.fetchUsers();
        setAllUsers(users);
        
        // Auto-select saved user or first user
        const savedUserId = localStorage.getItem('currentUserId');
        const initialUser = savedUserId
          ? users.find((u) => u.id === savedUserId) || users[0]
          : users[0];

        if (initialUser) {
          api.setCurrentUserId(initialUser.id);
          const fullUser = await api.fetchCurrentUser();
          setCurrentUser(fullUser);
          localStorage.setItem('currentUserId', initialUser.id);
        }
      } catch (error: any) {
        showToast(error.message || 'Failed to load users', 'error');
        setIsLoading(false);
      }
    })();
  }, []);

  // Refresh data when user changes
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // Switch impersonated user
  const switchUser = useCallback(async (userId: string) => {
    try {
      api.setCurrentUserId(userId);
      const fullUser = await api.fetchCurrentUser();
      setCurrentUser(fullUser);
      localStorage.setItem('currentUserId', userId);
      showToast(`Switched to ${fullUser.name}`, 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to switch user', 'error');
    }
  }, [showToast]);

  // Permission check helper
  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!currentUser?.permissions) return false;
    return currentUser.permissions.includes(`${module}.${action}`);
  }, [currentUser]);

  // Derive highest role for display
  const highestRole = currentUser?.roles
    ? currentUser.roles.reduce((best, r) => (ROLE_PRIORITY[r] || 0) > (ROLE_PRIORITY[best] || 0) ? r : best, currentUser.roles[0] || 'EMPLOYEE')
    : 'EMPLOYEE';

  // Backward compat: map to 'manager' | 'employee'
  const currentUserRole: 'manager' | 'employee' = 
    currentUser?.roles?.some(r => ['ADMIN', 'MANAGER', 'HR'].includes(r)) ? 'manager' : 'employee';

  const currentEmployeeId = currentUser?.employeeId || '';

  // ─── Actions ──────────────────────────────────────────

  const addEmployee = async (newEmpData: Omit<Employee, 'id'>) => {
    try {
      await api.createEmployee({
        firstName: newEmpData.name.split(' ')[0] || 'Unknown',
        lastName: newEmpData.name.split(' ').slice(1).join(' ') || 'Name',
        email: newEmpData.email,
        phoneNumber: newEmpData.phone,
        department: newEmpData.departmentId,
        position: newEmpData.role,
        systemRole: newEmpData.systemRole,
        hireDate: newEmpData.joiningDate,
        address: newEmpData.address
      });
      await refreshData();
      showToast(`Successfully added employee ${newEmpData.name}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateEmployee = async (updatedEmp: Employee) => {
    try {
      await api.updateEmployeeAPI(updatedEmp.id, {
        firstName: updatedEmp.name.split(' ')[0],
        lastName: updatedEmp.name.split(' ').slice(1).join(' '),
        email: updatedEmp.email,
        phoneNumber: updatedEmp.phone,
        department: updatedEmp.departmentId,
        position: updatedEmp.role,
        address: updatedEmp.address
      });
      await refreshData();
      showToast(`Updated profile for ${updatedEmp.name}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deactivateEmployee = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      await api.toggleEmployeeStatusAPI(id, newStatus as Employee['status']);
      await refreshData();
      showToast(`Employee is now marked as ${newStatus}`, newStatus === 'active' ? 'success' : 'warning');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addLeaveRequest = async (reqData: Omit<LeaveRequest, 'id' | 'requestDate' | 'status' | 'employeeName' | 'departmentId'>) => {
    try {
      await api.createLeaveRequestAPI({
        employeeId: reqData.employeeId,
        type: reqData.type || 'OTHER',
        startDate: reqData.startDate,
        endDate: reqData.endDate,
        reason: reqData.reason
      });
      await refreshData();
      showToast(`Leave request submitted successfully`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateLeaveRequestStatus = async (id: string, status: 'approved' | 'denied') => {
    try {
      await api.reviewLeaveRequestAPI(id, status, currentEmployeeId);
      await refreshData();
      showToast(`Leave request has been ${status}`, status === 'approved' ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'status' | 'employeeName'>) => {
    try {
      await api.createTaskAPI({
        title: taskData.title,
        description: taskData.description,
        assignedToId: taskData.employeeId,
        assignedById: currentEmployeeId,
        priority: taskData.priority,
        deadline: taskData.deadline,
        projectId: taskData.projectId,
        projectChunkId: taskData.projectChunkId,
      });
      await refreshData();
      showToast(`Task "${taskData.title}" assigned successfully`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: 'pending' | 'in-progress' | 'completed') => {
    try {
      await api.updateTaskAPI(id, { status });
      await refreshData();
      showToast(`Task status updated to "${status.replace('-', ' ')}"`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTaskAPI(id);
      await refreshData();
      showToast('Task removed successfully', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        switchUser,
        hasPermission,
        highestRole,
        currentUserRole,
        currentEmployeeId,
        employees,
        departments: INITIAL_DEPARTMENTS,
        leaveRequests,
        tasks,
        dashboardStats,
        isLoading,
        addEmployee,
        updateEmployee,
        deactivateEmployee,
        addLeaveRequest,
        updateLeaveRequestStatus,
        addTask,
        updateTaskStatus,
        deleteTask,
        refreshData,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
