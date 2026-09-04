import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Save, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Briefcase, 
  ShieldAlert,
  UserCheck,
  Power,
  CalendarRange,
  CheckSquare,
  Lock,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Employee } from '../types';

interface EmployeeDetailViewProps {
  id: string;
  onNavigate: (path: string) => void;
}

export default function EmployeeDetailView({ id, onNavigate }: EmployeeDetailViewProps) {
  const { 
    employees, 
    departments, 
    hasPermission, 
    updateEmployee, 
    deactivateEmployee,
    leaveRequests,
    tasks
  } = useApp();
  const canEdit = hasPermission('employee_records', 'edit');

  const employee = employees.find(e => e.id === id);

  // Local form state
  const [name, setName] = useState(employee?.name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [address, setAddress] = useState(employee?.address || '');
  const [role, setRole] = useState(employee?.role || '');
  const [departmentId, setDepartmentId] = useState(employee?.departmentId || '');
  const [salary, setSalary] = useState(employee?.salary || 0);
  const [joiningDate, setJoiningDate] = useState(employee?.joiningDate || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state if id shifts
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setPhone(employee.phone || '');
      setAddress(employee.address || '');
      setRole(employee.role);
      setDepartmentId(employee.departmentId);
      setSalary(employee.salary);
      setJoiningDate(employee.joiningDate);
      setErrors({});
    }
  }, [id, employee]);

  // If employee not found
  if (!employee) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-full bg-gray-50/40">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-gray-800">Employee record not found</span>
        <button 
          onClick={() => onNavigate('/employees')}
          className="text-xs text-indigo-600 font-bold hover:underline mt-2 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee Roster
        </button>
      </div>
    );
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Full name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Valid email is required';
    if (!role.trim()) nextErrors.role = 'Job title is required';
    if (!joiningDate) nextErrors.joiningDate = 'Hire date is required';
    if (salary <= 0) nextErrors.salary = 'Base salary must be positive';
    
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    updateEmployee({
      ...employee,
      name,
      email,
      phone,
      address,
      role,
      departmentId,
      salary,
      joiningDate
    });
  };

  // Activity section
  const myRequests = leaveRequests.filter(r => r.employeeId === employee.id);
  const myTasks = tasks.filter(t => t.employeeId === employee.id);


  return (
    <div className="p-4 md:p-6 space-y-5 bg-gray-50/40 min-h-full">
      {/* Header block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button
          onClick={() => onNavigate('/employees')}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => deactivateEmployee(employee.id, employee.status)}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  employee.status === 'inactive'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                }`}
              >
                <Power className="w-4 h-4" />
                {employee.status === 'inactive' ? 'Activate Record' : 'Deactivate Record'}
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid: Profile detail Card + Activity Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Main Profile Info Form (takes 2 columns) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          
          {/* Header banner background */}
          <div className="h-28 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-b border-gray-100 px-6 py-4 flex items-end relative select-none">
            <div className="flex items-center gap-4 relative z-10 top-[-4px]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 border-4 border-white text-white font-bold text-xl flex items-center justify-center shadow-md">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex flex-col mt-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{name}</h2>
                  {employee.status === 'active' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-200">ACTIVE</span>
                  )}
                  {employee.status === 'on-leave' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full border border-amber-200">ON LEAVE</span>
                  )}
                  {employee.status === 'inactive' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-50 rounded-full border border-gray-200">INACTIVE</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono font-medium">{employee.id} &bull; {role}</span>
              </div>
            </div>
          </div>

          <div className="pt-7 p-6 space-y-6">
            {!canEdit && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs text-indigo-700">
                <Lock className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>You are currently in <strong>Read-Only View</strong>. Record changes can only be persisted by HR or authorized administrators.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all ${
                    errors.name ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-indigo-100'
                  } disabled:opacity-75 disabled:bg-gray-50`}
                  placeholder="Employee Full Name"
                />
                {errors.name && <p className="text-rose-500 text-[10px] mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all ${
                    errors.email ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-indigo-100'
                  } disabled:opacity-75 disabled:bg-gray-50`}
                  placeholder="email@company.com"
                />
                {errors.email && <p className="text-rose-500 text-[10px] mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-gray-50"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-gray-50"
                  placeholder="Address Line, City, State"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Job Title / Position</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all ${
                    errors.role ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-indigo-100'
                  } disabled:opacity-75 disabled:bg-gray-50`}
                  placeholder="e.g. Frontend Dev"
                />
                {errors.role && <p className="text-rose-500 text-[10px] mt-1">{errors.role}</p>}
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Department Link</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-75 disabled:bg-gray-50"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Annual Base Pay (USD)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  disabled={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all ${
                    errors.salary ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-indigo-100'
                  } disabled:opacity-75 disabled:bg-gray-50`}
                  placeholder="Annual Salary"
                />
                {errors.salary && <p className="text-rose-500 text-[10px] mt-1">{errors.salary}</p>}
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Official Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all ${
                    errors.joiningDate ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-indigo-100'
                  } disabled:opacity-75 disabled:bg-gray-50`}
                />
                {errors.joiningDate && <p className="text-rose-500 text-[10px] mt-1">{errors.joiningDate}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Side Activity Logs */}
        <div className="space-y-6">
          {/* Recent leave requests */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <CalendarRange className="w-4 h-4 text-indigo-500" /> Leave Records
            </h3>
            
            {myRequests.length === 0 ? (
              <span className="text-xs text-gray-400 font-medium block text-center py-4">No leave requests logged</span>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div key={req.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 font-mono text-[10px]">{req.id}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${
                        req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        req.status === 'denied' ? 'bg-rose-50 border-rose-200 text-rose-500' :
                        'bg-amber-50 border-amber-200 text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800">{req.reason}</p>
                    <p className="text-[10px] text-gray-400 font-mono font-medium">{req.startDate} to {req.endDate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Tasks */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <CheckSquare className="w-4 h-4 text-indigo-500" /> Core Assignments
            </h3>

            {myTasks.length === 0 ? (
              <span className="text-xs text-gray-400 font-medium block text-center py-4">No task assignments logged</span>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task) => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 font-mono text-[10px]">{task.id}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${
                        task.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        task.status === 'in-progress' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                        'bg-amber-50 border-amber-200 text-amber-600'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800">{task.title}</p>
                    <p className="text-[10px] text-gray-400">Deadline: {task.deadline}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
