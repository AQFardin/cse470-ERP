export interface Employee {
  id: string;        // Backend UUID (used for API calls)
  employeeId: string; // Display ID like EMP001
  name: string;       // firstName + lastName combined
  departmentId: string; // lowercase: finance, hr, marketing, sales, engineering
  email: string;
  role: string;       // position field from backend
  status: 'active' | 'inactive' | 'on-leave';
  salary: number;     // Not in DB, mock value
  joiningDate: string; // hireDate formatted as YYYY-MM-DD
  phone?: string;     // phoneNumber from backend
  address?: string;
}

export interface Department {
  id: string;
  name: string;
  color: string;
  manager: string;
  budget: string;
  description: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;    // Backend UUID
  employeeName: string;  // Derived from employee relation
  departmentId: string;  // Derived from employee relation
  type: string;          // SICK, VACATION, PERSONAL, OTHER
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
  employeeId: string;     // assignedToId from backend
  employeeName: string;   // Derived from assignedTo relation
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  deadline: string;
}
