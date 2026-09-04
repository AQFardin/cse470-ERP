import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  User, 
  HelpCircle,
  Briefcase,
  Lock,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';

export default function TasksView() {
  const { 
    currentUserRole, 
    tasks, 
    addTask, 
    updateTaskStatus, 
    deleteTask, 
    employees, 
    currentEmployeeId 
  } = useApp();

  // Task creation form state (manager only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [deadline, setDeadline] = useState('');
  const [formError, setFormError] = useState('');

  // Default dropdown selection
  React.useEffect(() => {
    if (employees.length > 0 && !assignedEmployeeId) {
      setAssignedEmployeeId(employees[0].id);
    }
  }, [employees, assignedEmployeeId]);

  // Filters for displaying tasks
  const myTasks = useMemo(() => {
    if (currentUserRole === 'manager') {
      return tasks; // Managers see all tasks
    } else {
      return tasks.filter(t => t.employeeId === currentEmployeeId); // Employees see only their own
    }
  }, [tasks, currentUserRole, currentEmployeeId]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Task description is required.');
      return;
    }
    if (!deadline) {
      setFormError('Deadline date is required.');
      return;
    }

    const assignedEmp = employees.find(e => e.id === assignedEmployeeId);

    addTask({
      title: title.trim(),
      description: description.trim(),
      employeeId: assignedEmployeeId,
      employeeName: assignedEmp ? assignedEmp.name : 'Unknown',
      priority,
      deadline
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
  };

  // Badge helpers
  const renderPriorityBadge = (p: Task['priority']) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg uppercase tracking-wider font-mono">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg uppercase tracking-wider font-mono">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg uppercase tracking-wider font-mono">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg uppercase tracking-wider font-mono">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/40 min-h-full">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Task Assignments</h1>
        <p className="text-xs text-gray-500 mt-1">
          {currentUserRole === 'manager' 
            ? 'Assign deliverables to active team members, set deadlines, and track completion progress.' 
            : 'Track deliverables assigned to you and update active statuses.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Left Form Column (Manager only) */}
        {currentUserRole === 'manager' ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs h-fit space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Delegation Dispatch
              </span>
              <h2 className="text-sm font-bold text-gray-900 mt-0.5">Assign New Deliverable</h2>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Redesign checkout landing page"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Detailed Scope</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe instructions, context, or deliverables..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Assign to Employee</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Priority Standing</label>
                <div className="grid grid-cols-4 gap-1 select-none">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 px-1 font-semibold text-[10px] uppercase tracking-wider font-mono rounded-lg border text-center transition-all cursor-pointer ${
                          isSelected
                            ? p === 'urgent'
                              ? 'bg-rose-50 border-rose-300 text-rose-600 font-bold'
                              : p === 'high'
                              ? 'bg-orange-50 border-orange-300 text-orange-600 font-bold'
                              : p === 'medium'
                              ? 'bg-amber-50 border-amber-300 text-amber-600 font-bold'
                              : 'bg-gray-100 border-gray-300 text-gray-700 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Deliverable Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md text-center flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Delegate Assignment
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-indigo-50/60 border border-indigo-100/50 p-5 rounded-xl text-xs text-indigo-800 lg:col-span-1 h-fit space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Checklist System
            </div>
            <p className="leading-relaxed">
              As an employee, your assignments are synchronized directly from management. Click on status control pills (<strong>To Do, In Progress, Completed</strong>) on each card to log your progress in real-time.
            </p>
          </div>
        )}

        {/* 2. Right Task Grid (takes remaining columns) */}
        <div className={`lg:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Deliverables ({myTasks.length})</span>
          </div>

          {myTasks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center flex flex-col items-center justify-center shadow-xs">
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-gray-800">No tasks logged</span>
              <span className="text-xs text-gray-400 mt-1">There are currently no tasks allocated.</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              {myTasks.map((task) => (
                <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition-all relative group">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-gray-400 font-semibold">{task.id}</span>
                      {renderPriorityBadge(task.priority)}
                      <h3 className="text-sm font-bold text-gray-900 truncate">{task.title}</h3>
                    </div>
                    
                    <p className="text-xs text-gray-500 max-w-xl pr-4">{task.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[10px] text-gray-400 font-mono font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-300" /> Assigned to: <strong>{task.employeeName}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-300" /> Due: <strong>{task.deadline}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions / Status pills */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    {(['pending', 'in-progress', 'completed'] as const).map((st) => {
                      const isActive = task.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => updateTaskStatus(task.id, st)}
                          className={`px-2.5 py-1 text-[10px] font-semibold capitalize rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? st === 'completed'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/10'
                                : st === 'in-progress'
                                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 ring-1 ring-indigo-500/10'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 ring-1 ring-amber-500/10'
                              : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-400'
                          }`}
                        >
                          {st.replace('-', ' ')}
                        </button>
                      );
                    })}

                    {/* Delete action (manager only) */}
                    {currentUserRole === 'manager' && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 rounded-lg border border-transparent text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                        title="Remove Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
