export interface Employee {
  id: string;        // Backend UUID (used for API calls)
  employeeId: string; // Display ID like EMP001
  name: string;       // firstName + lastName combined
  departmentId: string; // lowercase: finance, hr, marketing, sales, engineering
  email: string;
  role: string;       // position field from backend
  systemRole?: string; // System access role mapping
  status: 'active' | 'inactive' | 'on-leave';
  salary: number;     // Not in DB, mock value
  joiningDate: string; // hireDate formatted as YYYY-MM-DD
  phone?: string;     // phoneNumber from backend
  address?: string;
  reportingManagerId?: string;
  reportingManager?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
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
  type: string;          // SICK, VACATION, PERSONAL, MATERNITY, UNPAID, EXTENDED, LEGAL, OTHER
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestDate: string;
  approverId?: string;
  approverName?: string;
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

// ─── RBAC Types ─────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  roles: string[];
  permissions?: string[];
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    status: string;
    avatarUrl?: string;
    reportingManagerId?: string;
  };
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  targetEntity: string;
  targetId: string;
  beforeSnapshot: any;
  afterSnapshot: any;
  timestamp: string;
}

export interface OffboardRequest {
  id: string;
  employeeId: string;
  requestedById: string;
  requestedByName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  effectiveDate: string;
  createdAt: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    position?: string;
    status?: string;
  };
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  balance: number;
  year: number;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    status: string;
  };
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  hoursWorked?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'REMOTE';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'INTERNAL_IT' | 'MANAGER_ASSIST' | 'CUSTOMER_SUPPORT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  raisedById: string;
  raisedByName: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
}

export interface ProjectChunk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedDepartment: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  createdAt: string;
  tasks?: Task[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  department: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  startDate: string;
  endDate?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  createdByName?: string;
  taskCount?: number;
  chunks?: ProjectChunk[];
  tasks?: Task[];
}
