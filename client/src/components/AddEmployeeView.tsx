import React, { useState } from 'react';
import { ArrowLeft, UserPlus, ShieldAlert, Sparkles, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AddEmployeeViewProps {
  onNavigate: (path: string) => void;
}

export default function AddEmployeeView({ onNavigate }: AddEmployeeViewProps) {
  const { addEmployee, departments, currentUserRole } = useApp();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');
  const [systemRole, setSystemRole] = useState('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'finance');
  const [salary, setSalary] = useState(85000);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Valid email is required';
    if (!role.trim()) nextErrors.role = 'Job title/position is required';
    if (!joiningDate) nextErrors.joiningDate = 'Joining date is required';
    if (salary <= 0) nextErrors.salary = 'Base annual salary must be positive';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = () => {
    if (currentUserRole !== 'manager') return;
    if (!validate()) return;

    addEmployee({
      employeeId: 'TBD', // Backend generates this
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      role: role.trim(),
      systemRole,
      departmentId,
      salary,
      joiningDate,
      status: 'active' // New hire starts as active
    });

    // Navigate back to the employees list
    onNavigate('/employees');
  };

  // If user is an employee, block access to the form
  if (currentUserRole !== 'manager') {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-full bg-gray-50/40">
        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-gray-800">Access Restricted</span>
        <span className="text-xs text-gray-400 mt-1 max-w-sm">
          Adding employee roster records is a Manager privilege. Please toggle View Mode to 'Manager' in the header toolbar.
        </span>
        <button 
          onClick={() => onNavigate('/employees')}
          className="text-xs text-indigo-600 font-bold hover:underline mt-4 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/40 min-h-full max-w-3xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('/employees')}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Talent Acquisition
          </span>
          <h1 className="text-xl font-display font-bold text-gray-900 mt-0.5">Add Employee</h1>
        </div>
      </div>

      {/* Main Form container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.firstName ? 'border-rose-400' : 'border-gray-200'
              }`}
              placeholder="e.g. Liam"
              autoFocus
            />
            {errors.firstName && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.firstName}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.lastName ? 'border-rose-400' : 'border-gray-200'
              }`}
              placeholder="e.g. Vance"
            />
            {errors.lastName && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.lastName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.email ? 'border-rose-400' : 'border-gray-200'
              }`}
              placeholder="e.g. liam@gmail.com"
            />
            {errors.email && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              placeholder="+1 (555) 014-9876"
            />
          </div>

          {/* Residential Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 789 Pine Ave, Berkeley, CA"
            />
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Job Title / Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.role ? 'border-rose-400' : 'border-gray-200'
              }`}
              placeholder="e.g. Frontend Engineer"
            />
            {errors.role && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.role}
              </p>
            )}
          </div>

          {/* System Role (RBAC) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">System Access Level</label>
            <select
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="EMPLOYEE">Employee (Base)</option>
              <option value="MANAGER">Department Manager</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="ADMIN">System Administrator</option>
              <option value="HR">HR Manager</option>
              <option value="SALES">Sales Representative</option>
              <option value="SUPPORT">Support Agent</option>
              <option value="VENDOR">Vendor/Contractor</option>
            </select>
          </div>

          {/* Department Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Department Assignment</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Annual Salary */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Annual Salary (USD)</label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.salary ? 'border-rose-400' : 'border-gray-200'
              }`}
              placeholder="e.g. 85000"
            />
            {errors.salary && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.salary}
              </p>
            )}
          </div>

          {/* Joining Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Hire Date</label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-xl text-xs transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                errors.joiningDate ? 'border-rose-400' : 'border-gray-200'
              }`}
            />
            {errors.joiningDate && (
              <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.joiningDate}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 select-none">
          <button
            onClick={() => onNavigate('/employees')}
            className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-500 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add to Roster
          </button>
        </div>
      </div>
    </div>
  );
}
