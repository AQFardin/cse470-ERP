import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ArrowUpDown, 
  ChevronRight, 
  Building2, 
  Filter, 
  Grid, 
  List,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { motion } from 'motion/react';

interface EmployeeListViewProps {
  onNavigate: (path: string) => void;
  searchQuery: string;
}

type SortField = 'id' | 'name' | 'departmentId' | 'status' | 'joiningDate';
type SortOrder = 'asc' | 'desc';

export default function EmployeeListView({ onNavigate, searchQuery }: EmployeeListViewProps) {
  const { employees, departments, currentUserRole } = useApp();
  
  // Tab control: 'all' or departmentId
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Handle click sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Tab filter
      const matchesTab = activeTab === 'all' || emp.departmentId === activeTab;
      
      // 2. Search query filter
      const matchesSearch = searchQuery === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchesTab && matchesSearch;
    });
  }, [employees, activeTab, searchQuery]);

  // Sort employees
  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];
    
    sorted.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });
    
    return sorted;
  }, [filteredEmployees, sortField, sortOrder]);

  // Helper for status badge
  const renderStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        );
      case 'on-leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> On Leave
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
          </span>
        );
      default:
        return null;
    }
  };

  // Helper for department badge
  const renderDepartmentBadge = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return <span className="text-gray-500 text-xs">-</span>;

    // Mapping department colors to styling
    const colorClasses: Record<string, string> = {
      emerald: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      rose: 'bg-rose-50 border border-rose-200 text-rose-700',
      purple: 'bg-purple-50 border border-purple-200 text-purple-700',
      blue: 'bg-blue-50 border border-blue-200 text-blue-700',
      teal: 'bg-teal-50 border border-teal-200 text-teal-700',
    };

    const dotColorClasses: Record<string, string> = {
      emerald: 'bg-emerald-500',
      rose: 'bg-rose-500',
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
      teal: 'bg-teal-500',
    };

    const chosenClass = colorClasses[dept.color] || 'bg-gray-50 border border-gray-200 text-gray-700';
    const chosenDotClass = dotColorClasses[dept.color] || 'bg-gray-400';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-sans tracking-wide leading-none capitalize ${chosenClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${chosenDotClass}`} />
        {dept.name}
      </span>
    );
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-1 shrink-0" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-500 ml-1 shrink-0" />
      : <ArrowDown className="w-3 h-3 text-indigo-500 ml-1 shrink-0" />;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/40 min-h-full">
      {/* Title & Add Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-xs text-gray-500 mt-1">
            Access and manage user contact profiles, department allocations, and employment standings.
          </p>
        </div>

        {currentUserRole === 'manager' && (
          <button
            onClick={() => onNavigate('/employees/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer scale-100 active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Tabs navigation: All Employees | Departments */}
      <div className="border-b border-gray-200 flex items-center justify-between gap-4 overflow-x-auto select-none no-scrollbar">
        <div className="flex gap-2 min-w-max pb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'border-indigo-600 text-indigo-600 font-bold' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            All Employees
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveTab(dept.id)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer capitalize ${
                activeTab === dept.id 
                  ? 'border-indigo-600 text-indigo-600 font-bold' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap hidden sm:block">
          Showing {sortedEmployees.length} of {employees.length} records
        </div>
      </div>

      {/* Roster Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {sortedEmployees.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-gray-800">No employees found</span>
            <span className="text-xs text-gray-400 mt-1">Try adjusting your search keywords or active filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 select-none text-gray-400 font-bold uppercase tracking-wider">
                  <th onClick={() => handleSort('id')} className="py-3 px-6 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center font-bold">
                      Employee ID <SortIndicator field="id" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('name')} className="py-3 px-6 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center font-bold">
                      Name <SortIndicator field="name" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('departmentId')} className="py-3 px-6 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center font-bold">
                      Department <SortIndicator field="departmentId" />
                    </div>
                  </th>
                  <th className="py-3 px-6 font-bold">Email</th>
                  <th onClick={() => handleSort('status')} className="py-3 px-6 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center font-bold">
                      Status <SortIndicator field="status" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('joiningDate')} className="py-3 px-6 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center font-bold">
                      Joining Date <SortIndicator field="joiningDate" />
                    </div>
                  </th>
                  <th className="py-3 px-6 text-right font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {sortedEmployees.map((emp, idx) => (
                  <tr 
                    key={emp.id}
                    onClick={() => onNavigate(`/employees/${emp.id}`)}
                    className="hover:bg-gray-50/60 transition-all cursor-pointer group"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-6 font-mono text-gray-400 group-hover:text-gray-800 font-semibold">{emp.id}</td>
                    
                    {/* Name + Role */}
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-all">{emp.name}</span>
                        <span className="text-gray-400 text-[10px] font-mono uppercase tracking-wide mt-0.5">{emp.role}</span>
                      </div>
                    </td>
                    
                    {/* Department Badge */}
                    <td className="py-3.5 px-6">
                      {renderDepartmentBadge(emp.departmentId)}
                    </td>
                    
                    {/* Email */}
                    <td className="py-3.5 px-6 text-gray-500 font-normal">{emp.email}</td>
                    
                    {/* Status Badge */}
                    <td className="py-3.5 px-6">
                      {renderStatusBadge(emp.status)}
                    </td>
                    
                    {/* Joining Date */}
                    <td className="py-3.5 px-6 text-gray-500 font-mono">{emp.joiningDate}</td>
                    
                    {/* Arrow navigation shortcut icon */}
                    <td className="py-3.5 px-6 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-all inline group-hover:translate-x-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
