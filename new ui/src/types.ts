export interface Employee {
  id: string;
  name: string;
  departmentId: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'on-leave';
  salary: number;
  joiningDate: string;
  phone?: string;
  address?: string;
}

export interface Department {
  id: string;
  name: string;
  color: string; // e.g., 'emerald', 'orange', 'rose', 'blue', 'slate'
  manager: string;
  budget: string;
  description: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestDate: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  deadline: string;
}
