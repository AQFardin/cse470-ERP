import type { Employee, LeaveRequest, Task, User, AuditLog, OffboardRequest, LeaveBalance, AttendanceLog, Ticket, Project, ProjectChunk } from '../types';

const API_BASE = '/api';

// ─── Current User ID (set by AppContext) ────────────────

let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

// ─── Data Mapping Helpers ───────────────────────────────

/** Map backend department enum to lowercase UI departmentId */
function mapDepartment(dept: string): string {
  return dept.toLowerCase(); // ENGINEERING → engineering, HR → hr, etc.
}

/** Map UI departmentId to backend enum */
function unmapDepartment(deptId: string): string {
  return deptId.toUpperCase(); // engineering → ENGINEERING
}

/** Map backend status enum to lowercase UI status */
function mapEmployeeStatus(status: string): Employee['status'] {
  switch (status) {
    case 'ACTIVE': return 'active';
    case 'ON_LEAVE': return 'on-leave';
    case 'INACTIVE': return 'inactive';
    default: return 'active';
  }
}

/** Map UI status to backend enum */
function unmapEmployeeStatus(status: Employee['status']): string {
  switch (status) {
    case 'active': return 'ACTIVE';
    case 'on-leave': return 'ON_LEAVE';
    case 'inactive': return 'INACTIVE';
    default: return 'ACTIVE';
  }
}

/** Map backend leave status to UI */
function mapLeaveStatus(status: string): LeaveRequest['status'] {
  switch (status) {
    case 'APPROVED': return 'approved';
    case 'DENIED': return 'denied';
    case 'PENDING': return 'pending';
    default: return 'pending';
  }
}

/** Map backend task status to UI */
function mapTaskStatus(status: string): Task['status'] {
  switch (status) {
    case 'TODO': return 'pending';
    case 'IN_PROGRESS': return 'in-progress';
    case 'COMPLETED': return 'completed';
    case 'OVERDUE': return 'pending'; // treat overdue as pending for UI
    default: return 'pending';
  }
}

/** Map UI task status to backend enum */
function unmapTaskStatus(status: Task['status']): string {
  switch (status) {
    case 'pending': return 'TODO';
    case 'in-progress': return 'IN_PROGRESS';
    case 'completed': return 'COMPLETED';
    default: return 'TODO';
  }
}

/** Map backend priority to UI */
function mapPriority(priority: string): Task['priority'] {
  return priority.toLowerCase() as Task['priority'];
}

/** Format date to YYYY-MM-DD */
function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

// ─── Backend → UI Mappers ───────────────────────────────

/** Map a backend employee record to the UI Employee type */
export function mapBackendEmployee(be: any): Employee {
  return {
    id: be.id,
    employeeId: be.employeeId || be.employee_id || 'EMP???',
    name: `${be.firstName} ${be.lastName}`,
    departmentId: mapDepartment(be.department),
    email: be.email,
    role: be.position || '',
    systemRole: be.role || (be.position && be.position.toLowerCase().includes('manager') ? 'MANAGER' : 'EMPLOYEE'),
    status: mapEmployeeStatus(be.status),
    salary: 85000, // Not stored in DB — use placeholder
    joiningDate: formatDate(be.hireDate),
    phone: be.phoneNumber || undefined,
    address: be.address || undefined,
    reportingManagerId: be.reportingManagerId || undefined,
    reportingManager: be.reportingManager || undefined,
  };
}

/** Map a backend leave request to UI LeaveRequest type */
export function mapBackendLeaveRequest(be: any): LeaveRequest {
  const emp = be.employee;
  const approver = be.approver;
  return {
    id: be.id,
    employeeId: be.employeeId,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
    departmentId: emp ? mapDepartment(emp.department) : 'finance',
    type: be.type || 'OTHER',
    startDate: formatDate(be.startDate),
    endDate: formatDate(be.endDate),
    reason: be.reason,
    status: mapLeaveStatus(be.status),
    requestDate: formatDate(be.createdAt),
    approverId: be.approverId || undefined,
    approverName: approver ? `${approver.firstName} ${approver.lastName}` : undefined,
  };
}

/** Map a backend task assignment to UI Task type */
export function mapBackendTask(be: any): Task {
  const assignee = be.assignedTo;
  return {
    id: be.id,
    title: be.title,
    description: be.description || '',
    employeeId: be.assignedToId,
    employeeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unknown',
    priority: mapPriority(be.priority),
    status: mapTaskStatus(be.status),
    deadline: formatDate(be.deadline),
  };
}

// ─── API Functions ──────────────────────────────────────

async function fetchJSON(url: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach user ID for RBAC
  if (currentUserId) {
    headers['x-current-user-id'] = currentUserId;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Auth / Users ───────────────────────────────────────

export async function fetchUsers(): Promise<User[]> {
  const res = await fetchJSON('/auth/users');
  return res.data || [];
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetchJSON('/auth/me');
  return res.data;
}

export async function fetchAuditLogs(filters?: { targetEntity?: string; limit?: number }): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.targetEntity) params.set('targetEntity', filters.targetEntity);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchJSON(`/auth/audit-logs${qs}`);
  return (res.data || []).map((log: any) => ({
    ...log,
    actorName: log.actor?.name || 'Unknown',
    beforeSnapshot: log.beforeSnapshot ? JSON.parse(log.beforeSnapshot) : null,
    afterSnapshot: log.afterSnapshot ? JSON.parse(log.afterSnapshot) : null,
  }));
}

// ─── Employees ──────────────────────────────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetchJSON('/employees');
  return (res.data || []).map(mapBackendEmployee);
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const res = await fetchJSON(`/employees/${id}`);
  return mapBackendEmployee(res.data);
}

export async function createEmployee(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  department: string;
  position: string;
  systemRole?: string;
  hireDate: string;
  address?: string;
  reportingManagerId?: string;
}): Promise<Employee> {
  const res = await fetchJSON('/employees', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      department: unmapDepartment(data.department),
    }),
  });
  return mapBackendEmployee(res.data);
}

export async function updateEmployeeAPI(id: string, data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  address?: string;
}): Promise<Employee> {
  const payload: any = { ...data };
  if (data.department) {
    payload.department = unmapDepartment(data.department);
  }
  const res = await fetchJSON(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapBackendEmployee(res.data);
}

export async function toggleEmployeeStatusAPI(id: string, status: Employee['status']): Promise<Employee> {
  const res = await fetchJSON(`/employees/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: unmapEmployeeStatus(status) }),
  });
  return mapBackendEmployee(res.data);
}

export async function fetchDashboardStats() {
  const res = await fetchJSON('/employees/stats');
  return res.data;
}

// ─── Leave Requests ─────────────────────────────────────

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await fetchJSON('/leave-requests');
  return (res.data || []).map(mapBackendLeaveRequest);
}

export async function createLeaveRequestAPI(data: {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<LeaveRequest> {
  const res = await fetchJSON('/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapBackendLeaveRequest(res.data);
}

export async function reviewLeaveRequestAPI(id: string, status: 'approved' | 'denied', reviewedById?: string): Promise<LeaveRequest> {
  const backendStatus = status === 'approved' ? 'APPROVED' : 'DENIED';
  const res = await fetchJSON(`/leave-requests/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status: backendStatus, reviewedById }),
  });
  return mapBackendLeaveRequest(res.data);
}

// ─── Tasks ──────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetchJSON('/tasks');
  return (res.data || []).map(mapBackendTask);
}

export async function createTaskAPI(data: {
  title: string;
  description: string;
  assignedToId: string;
  assignedById: string;
  priority: string;
  deadline: string;
}): Promise<Task> {
  const res = await fetchJSON('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      priority: data.priority.toUpperCase(),
    }),
  });
  return mapBackendTask(res.data);
}

export async function updateTaskAPI(id: string, data: {
  status?: string;
  title?: string;
  description?: string;
  priority?: string;
}): Promise<Task> {
  const payload: any = { ...data };
  if (data.status) {
    payload.status = unmapTaskStatus(data.status as Task['status']);
  }
  if (data.priority) {
    payload.priority = data.priority.toUpperCase();
  }
  const res = await fetchJSON(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapBackendTask(res.data);
}

export async function deleteTaskAPI(id: string): Promise<void> {
  await fetchJSON(`/tasks/${id}`, { method: 'DELETE' });
}

// ─── Offboarding ────────────────────────────────────────

export async function fetchOffboardRequests(): Promise<OffboardRequest[]> {
  const res = await fetchJSON('/offboarding');
  return res.data || [];
}

export async function createOffboardRequestAPI(data: {
  employeeId: string;
  reason: string;
  effectiveDate: string;
}): Promise<OffboardRequest> {
  const res = await fetchJSON('/offboarding', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function reviewOffboardRequestAPI(id: string, status: 'APPROVED' | 'REJECTED'): Promise<OffboardRequest> {
  const res = await fetchJSON(`/offboarding/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

// ─── Leave Balances ─────────────────────────────────────

export async function fetchAllLeaveBalances(year?: number): Promise<LeaveBalance[]> {
  const qs = year ? `?year=${year}` : '';
  const res = await fetchJSON(`/leave-balances${qs}`);
  return res.data || [];
}

export async function fetchEmployeeLeaveBalances(employeeId: string, year?: number): Promise<LeaveBalance[]> {
  const qs = year ? `?year=${year}` : '';
  const res = await fetchJSON(`/leave-balances/${employeeId}${qs}`);
  return res.data || [];
}

export async function correctLeaveBalanceAPI(id: string, balance: number, reason: string): Promise<LeaveBalance> {
  const res = await fetchJSON(`/leave-balances/${id}/correct`, {
    method: 'PATCH',
    body: JSON.stringify({ balance, reason }),
  });
  return res.data;
}

// ─── Attendance ─────────────────────────────────────────

export async function clockInAPI(): Promise<AttendanceLog> {
  const res = await fetchJSON('/attendance/clock-in', { method: 'POST' });
  return res.data;
}

export async function clockOutAPI(): Promise<AttendanceLog> {
  const res = await fetchJSON('/attendance/clock-out', { method: 'POST' });
  return res.data;
}

export async function fetchTodayAttendance(): Promise<AttendanceLog | null> {
  const res = await fetchJSON('/attendance/today');
  return res.data;
}

export async function fetchEmployeeAttendance(employeeId: string, month?: number, year?: number): Promise<AttendanceLog[]> {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchJSON(`/attendance/${employeeId}${qs}`);
  return res.data || [];
}

export async function fetchTeamAttendanceCalendar(): Promise<any> {
  const res = await fetchJSON('/attendance/team-calendar');
  return res.data;
}

// ─── Help Desk / Tickets ────────────────────────────────

export async function fetchTickets(filters?: { category?: string; status?: string }): Promise<Ticket[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchJSON(`/tickets${qs}`);
  return (res.data || []).map((t: any) => ({
    ...t,
    raisedByName: t.raisedBy?.name || 'Unknown',
    assignedToName: t.assignedTo?.name || undefined,
  }));
}

export async function createTicketAPI(data: {
  title: string;
  description: string;
  category: string;
  priority?: string;
}): Promise<Ticket> {
  const res = await fetchJSON('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return {
    ...res.data,
    raisedByName: res.data.raisedBy?.name || 'Unknown',
    assignedToName: res.data.assignedTo?.name || undefined,
  };
}

export async function updateTicketAPI(id: string, data: {
  status?: string;
  assignedToId?: string;
  priority?: string;
}): Promise<Ticket> {
  const res = await fetchJSON(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return {
    ...res.data,
    raisedByName: res.data.raisedBy?.name || 'Unknown',
    assignedToName: res.data.assignedTo?.name || undefined,
  };
}

// ─── Project Management ─────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetchJSON('/projects');
  return (res.data || []).map((p: any) => ({
    ...p,
    createdByName: p.createdBy?.name || 'Unknown',
    projectManagerName: p.projectManager ? `${p.projectManager.firstName} ${p.projectManager.lastName}` : undefined,
    taskCount: p._count?.tasks || 0,
    chunks: (p.chunks || []).map((c: any) => ({
      ...c,
      assignedManagerName: c.assignedManager ? `${c.assignedManager.firstName} ${c.assignedManager.lastName}` : undefined,
      tasks: (c.tasks || []).map(mapBackendTask),
    })),
    tasks: (p.tasks || []).map(mapBackendTask),
  }));
}

export async function createProjectAPI(data: {
  name: string;
  description?: string;
  department: string;
  startDate: string;
  endDate?: string;
  status?: string;
  projectManagerId?: string;
}): Promise<Project> {
  const res = await fetchJSON('/projects', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      department: unmapDepartment(data.department),
    }),
  });
  return {
    ...res.data,
    createdByName: res.data.createdBy?.name || 'Unknown',
    taskCount: 0,
  };
}

export async function createProjectChunkAPI(data: {
  projectId: string;
  title: string;
  description?: string;
  assignedDepartment: string;
  assignedManagerId?: string;
}): Promise<ProjectChunk> {
  const res = await fetchJSON('/projects/chunks', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      assignedDepartment: unmapDepartment(data.assignedDepartment),
    }),
  });
  return {
    ...res.data,
    assignedManagerName: res.data.assignedManager ? `${res.data.assignedManager.firstName} ${res.data.assignedManager.lastName}` : undefined,
  };
}

export async function updateProjectAPI(id: string, data: {
  name?: string;
  description?: string;
  status?: string;
  projectManagerId?: string;
}): Promise<Project> {
  const res = await fetchJSON(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateProjectChunkAPI(chunkId: string, data: {
  title?: string;
  description?: string;
  assignedDepartment?: string;
  assignedManagerId?: string;
  status?: string;
}): Promise<ProjectChunk> {
  const payload: any = { ...data };
  if (data.assignedDepartment) {
    payload.assignedDepartment = unmapDepartment(data.assignedDepartment);
  }
  const res = await fetchJSON(`/projects/chunks/${chunkId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return {
    ...res.data,
    assignedManagerName: res.data.assignedManager ? `${res.data.assignedManager.firstName} ${res.data.assignedManager.lastName}` : undefined,
  };
}

