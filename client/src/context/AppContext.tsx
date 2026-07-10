import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee, Department, LeaveRequest, Task } from '../types';
import * as api from '../lib/api';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  currentUserRole: 'manager' | 'employee';
  setCurrentUserRole: (role: 'manager' | 'employee') => void;
  currentEmployeeId: string;
  setCurrentEmployeeId: (id: string) => void;
  
  employees: Employee[];
  departments: Department[]; // We'll keep this local for UI mapping since backend doesn't have a departments table
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
  { id: 'marketing', name: 'Marketing', color: 'purple', manager: 'Chloe Bennett', budget: '$980,000', description: 'Marketing' },
  { id: 'sales', name: 'Sales', color: 'blue', manager: 'David Miller', budget: '$1,850,000', description: 'Sales' },
  { id: 'engineering', name: 'Engineering', color: 'teal', manager: 'Elena Rostova', budget: '$3,200,000', description: 'Engineering' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<'manager' | 'employee'>(() => {
    return (localStorage.getItem('currentUserRole') as 'manager' | 'employee') || 'manager';
  });
  
  // Need to wait for data load before we set current employee
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
    return localStorage.getItem('currentEmployeeId') || '';
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync to local storage for role and id
  useEffect(() => {
    localStorage.setItem('currentUserRole', currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    if (currentEmployeeId) {
      localStorage.setItem('currentEmployeeId', currentEmployeeId);
    }
  }, [currentEmployeeId]);

  // Initial Data Load from Backend
  const refreshData = async () => {
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
      
      // Auto-select first employee if none selected
      if (!currentEmployeeId && emps.length > 0) {
        setCurrentEmployeeId(emps[0].id);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to connect to backend API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions wrapped with API calls
  const addEmployee = async (newEmpData: Omit<Employee, 'id'>) => {
    try {
      await api.createEmployee({
        firstName: newEmpData.name.split(' ')[0] || 'Unknown',
        lastName: newEmpData.name.split(' ').slice(1).join(' ') || 'Name',
        email: newEmpData.email,
        phoneNumber: newEmpData.phone,
        department: newEmpData.departmentId,
        position: newEmpData.role,
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
      await api.toggleEmployeeStatusAPI(id, newStatus);
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
      await api.reviewLeaveRequestAPI(id, status, currentEmployeeId); // Use current user as reviewer
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
        assignedById: currentEmployeeId, // Current user is assigner
        priority: taskData.priority,
        deadline: taskData.deadline
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
        currentUserRole,
        setCurrentUserRole,
        currentEmployeeId,
        setCurrentEmployeeId,
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
