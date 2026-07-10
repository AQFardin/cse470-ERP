import type { Employee, LeaveRequest, Task } from '../types';

const API_BASE = '/api';

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
    status: mapEmployeeStatus(be.status),
    salary: 85000, // Not stored in DB — use placeholder
    joiningDate: formatDate(be.hireDate),
    phone: be.phoneNumber || undefined,
    address: be.address || undefined,
  };
}

/** Map a backend leave request to UI LeaveRequest type */
export function mapBackendLeaveRequest(be: any): LeaveRequest {
  const emp = be.employee;
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
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
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
  hireDate: string;
  address?: string;
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
