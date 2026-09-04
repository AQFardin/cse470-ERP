import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, Department, LeaveRequest, Task } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_DEPARTMENTS, INITIAL_LEAVE_REQUESTS, INITIAL_TASKS } from '../data';

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
  departments: Department[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  
  // Actions
  addEmployee: (employee: Omit<Employee, 'id'> & { id?: string }) => void;
  updateEmployee: (employee: Employee) => void;
  deactivateEmployee: (id: string) => void;
  
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'requestDate' | 'status'>) => void;
  updateLeaveRequestStatus: (id: string, status: 'approved' | 'denied') => void;
  
  addTask: (task: Omit<Task, 'id' | 'status'>) => void;
  updateTaskStatus: (id: string, status: 'pending' | 'in-progress' | 'completed') => void;
  deleteTask: (id: string) => void;
  
  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<'manager' | 'employee'>(() => {
    const saved = localStorage.getItem('currentUserRole');
    return (saved as 'manager' | 'employee') || 'manager';
  });
  
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
    return localStorage.getItem('currentEmployeeId') || 'EMP001'; // Default: Fardin Ahmed
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leaveRequests');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('currentUserRole', currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    localStorage.setItem('currentEmployeeId', currentEmployeeId);
  }, [currentEmployeeId]);

  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

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

  // Actions
  const addEmployee = (newEmpData: Omit<Employee, 'id'> & { id?: string }) => {
    const nextId = newEmpData.id || `EMP0${Math.floor(Math.random() * 900) + 100}`;
    const newEmp: Employee = {
      ...newEmpData,
      id: nextId,
    };
    setEmployees((prev) => [...prev, newEmp]);
    showToast(`Successfully added employee ${newEmp.name} (${nextId})`, 'success');
  };

  const updateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedEmp.id ? updatedEmp : emp))
    );
    // Also update any references if needed (e.g., in requests, tasks - though we use id, name is cached in some places)
    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.employeeId === updatedEmp.id
          ? { ...req, employeeName: updatedEmp.name, departmentId: updatedEmp.departmentId }
          : req
      )
    );
    setTasks((prev) =>
      prev.map((tsk) =>
        tsk.employeeId === updatedEmp.id
          ? { ...tsk, employeeName: updatedEmp.name }
          : tsk
      )
    );
    showToast(`Updated profile for ${updatedEmp.name}`, 'success');
  };

  const deactivateEmployee = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const newStatus = emp.status === 'inactive' ? 'active' : 'inactive';
          showToast(
            `${emp.name} is now marked as ${newStatus}`,
            newStatus === 'active' ? 'success' : 'warning'
          );
          return { ...emp, status: newStatus };
        }
        return emp;
      })
    );
  };

  const addLeaveRequest = (reqData: Omit<LeaveRequest, 'id' | 'requestDate' | 'status'>) => {
    const id = `LRV${Math.floor(Math.random() * 900) + 100}`;
    const newReq: LeaveRequest = {
      ...reqData,
      id,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0],
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    showToast(`Leave request submitted for ${newReq.employeeName}`, 'success');
  };

  const updateLeaveRequestStatus = (id: string, status: 'approved' | 'denied') => {
    setLeaveRequests((prev) =>
      prev.map((req) => {
        if (req.id === id) {
          // If approved, set employee status to 'on-leave', if denied/approved from leave, we handle
          if (status === 'approved') {
            setEmployees((prevEmps) =>
              prevEmps.map((emp) =>
                emp.id === req.employeeId ? { ...emp, status: 'on-leave' } : emp
              )
            );
          }
          showToast(`Leave request ${id} has been ${status}`, status === 'approved' ? 'success' : 'error');
          return { ...req, status };
        }
        return req;
      })
    );
  };

  const addTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    const id = `TSK${Math.floor(Math.random() * 900) + 100}`;
    const newTask: Task = {
      ...taskData,
      id,
      status: 'pending',
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Task "${newTask.title}" assigned to ${newTask.employeeName}`, 'success');
  };

  const updateTaskStatus = (id: string, status: 'pending' | 'in-progress' | 'completed') => {
    setTasks((prev) =>
      prev.map((tsk) => {
        if (tsk.id === id) {
          showToast(`Task status updated to "${status.replace('-', ' ')}"`, 'success');
          return { ...tsk, status };
        }
        return tsk;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((tsk) => tsk.id !== id));
    showToast('Task removed successfully', 'info');
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
