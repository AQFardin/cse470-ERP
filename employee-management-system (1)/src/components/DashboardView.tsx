import React from 'react';
import { 
  Users, 
  CalendarRange, 
  CheckSquare, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Clock,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';

interface DashboardViewProps {
  onNavigate: (path: string) => void;
  onOpenAssignTaskModal?: () => void;
}

export default function DashboardView({ onNavigate, onOpenAssignTaskModal }: DashboardViewProps) {
  const { 
    currentUserRole, 
    employees, 
    leaveRequests, 
    tasks, 
    currentEmployeeId,
    updateLeaveRequestStatus,
    updateTaskStatus
  } = useApp();

  // ------------------ MANAGER CALCULATIONS ------------------
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onLeaveEmployees = employees.filter(e => e.status === 'on-leave').length;
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;

  const pendingRequestsList = leaveRequests.filter(r => r.status === 'pending');
  const recentTasks = tasks.slice(0, 5);

  // ------------------ EMPLOYEE CALCULATIONS ------------------
  const myTasks = tasks.filter(t => t.employeeId === currentEmployeeId);
  const myPendingTasksCount = myTasks.filter(t => t.status !== 'completed').length;
  
  // Custom mock leave balance (e.g. 15 days total, minus approved leave days)
  const myApprovedLeaveDays = leaveRequests
    .filter(r => r.employeeId === currentEmployeeId && r.status === 'approved')
    .reduce((acc, curr) => {
      const start = new Date(curr.startDate);
      const end = new Date(curr.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return acc + diffDays;
    }, 0);
  const myLeaveBalance = Math.max(0, 18 - myApprovedLeaveDays);

  const myUpcomingDeadlinesCount = myTasks.filter(t => {
    if (t.status === 'completed') return false;
    const today = new Date();
    const deadline = new Date(t.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7; // within next 7 days
  }).length;

  // Stagger animation setup
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gray-50/40 min-h-full">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            {currentUserRole === 'manager' ? 'Executive Dashboard' : 'My Performance Center'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {currentUserRole === 'manager' 
              ? 'Real-time resource tracking, team statistics, and organizational oversight.' 
              : 'Keep track of your current deliverables, pending leave requests, and schedules.'}
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {currentUserRole === 'manager' ? (
            <>
              <button
                onClick={() => onNavigate('/employees/new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer scale-100 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Add Employee
              </button>
              <button
                onClick={() => onNavigate('/tasks')}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-500" /> Assign Task
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('/leave-requests')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <CalendarRange className="w-4 h-4" /> Request Leave
            </button>
          )}
        </div>
      </div>

      {/* -------------------- STAT CARDS -------------------- */}
      {currentUserRole === 'manager' ? (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {/* Total headcount */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Workforce</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{totalEmployees}</h3>
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +12%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Active employees */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active Records</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{activeEmployees}</h3>
                <span className="text-[10px] font-medium text-gray-400">on-site</span>
              </div>
            </div>
          </motion.div>

          {/* On leave */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Calendar className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">On Leave</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{onLeaveEmployees}</h3>
                <span className="text-[10px] font-medium text-amber-600">out of office</span>
              </div>
            </div>
          </motion.div>

          {/* Pending Requests */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pending Leave</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{pendingRequests}</h3>
                <span className="text-[10px] font-medium text-rose-500">needs review</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {/* My pending tasks */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
              <CheckSquare className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">My Action Items</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{myPendingTasksCount}</h3>
                <span className="text-[10px] font-medium text-gray-400">assigned tasks</span>
              </div>
            </div>
          </motion.div>

          {/* Leave balance */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
              <CalendarRange className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">PTO Balance</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{myLeaveBalance}</h3>
                <span className="text-[10px] font-medium text-teal-600">days available</span>
              </div>
            </div>
          </motion.div>

          {/* Upcoming deadlines */}
          <motion.div variants={cardVariants} className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Deadlines (7 Days)</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-display font-bold text-gray-900">{myUpcomingDeadlinesCount}</h3>
                <span className="text-[10px] font-medium text-amber-600">requires attention</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* -------------------- DYNAMIC GRID MODULES -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main grid columns (takes 2 span) */}
        <div className="lg:col-span-2 space-y-6">
          {currentUserRole === 'manager' ? (
            /* Manager view: Recent Leave Requests Table */
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Recent Leave Requests</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Approve or deny submitted leave applications</p>
                </div>
                <button 
                  onClick={() => onNavigate('/leave-requests')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingRequestsList.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">All leave requests resolved</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingRequestsList.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50/50 transition-all">
                          <td className="py-3.5 px-4 font-semibold text-gray-800">{req.employeeName}</td>
                          <td className="py-3.5 px-4 text-gray-500 font-medium font-mono">
                            {req.startDate} to {req.endDate}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 max-w-[200px] truncate">{req.reason}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateLeaveRequestStatus(req.id, 'approved')}
                                className="p-1 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateLeaveRequestStatus(req.id, 'denied')}
                                className="p-1 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                                title="Deny"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Employee view: My Tasks List */
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">My Deliverables</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Task assignments with status controls</p>
                </div>
                <button 
                  onClick={() => onNavigate('/tasks')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Manage Tasks <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myTasks.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-2">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">No tasks assigned to you currently</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myTasks.map((task) => (
                    <div key={task.id} className="p-4 hover:bg-gray-50/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold font-mono rounded-lg uppercase tracking-wider ${
                            task.priority === 'urgent' ? 'bg-rose-50 border border-rose-200 text-rose-600' :
                            task.priority === 'high' ? 'bg-orange-50 border border-orange-200 text-orange-600' :
                            task.priority === 'medium' ? 'bg-amber-50 border border-amber-200 text-amber-600' :
                            'bg-gray-50 border border-gray-200 text-gray-500'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs font-bold text-gray-800">{task.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 max-w-xl">{task.description}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                          <Clock className="w-3.5 h-3.5 text-gray-300" /> Deadline: {task.deadline}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side panel (Tasks overview / statistics) */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs p-5">
            <h2 className="text-sm font-semibold text-gray-900">Task Overview</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Distribution of workflow deliverable state</p>
            
            <div className="space-y-3.5 mt-5">
              {currentUserRole === 'manager' ? (
                // Manager summary counts
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending Approval
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {tasks.filter(t => t.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> Active Progress
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {tasks.filter(t => t.status === 'in-progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {tasks.filter(t => t.status === 'completed').length}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                      {(() => {
                        const total = tasks.length || 1;
                        const p = (tasks.filter(t => t.status === 'pending').length / total) * 100;
                        const ip = (tasks.filter(t => t.status === 'in-progress').length / total) * 100;
                        const c = (tasks.filter(t => t.status === 'completed').length / total) * 100;
                        return (
                          <>
                            <div style={{ width: `${p}%` }} className="bg-amber-400 h-full" />
                            <div style={{ width: `${ip}%` }} className="bg-indigo-500 h-full" />
                            <div style={{ width: `${c}%` }} className="bg-emerald-500 h-full" />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              ) : (
                // Employee specific summary counts
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> To Do
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {myTasks.filter(t => t.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> In Progress
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {myTasks.filter(t => t.status === 'in-progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                    </span>
                    <span className="font-mono font-bold text-gray-800">
                      {myTasks.filter(t => t.status === 'completed').length}
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                      {(() => {
                        const total = myTasks.length || 1;
                        const p = (myTasks.filter(t => t.status === 'pending').length / total) * 100;
                        const ip = (myTasks.filter(t => t.status === 'in-progress').length / total) * 100;
                        const c = (myTasks.filter(t => t.status === 'completed').length / total) * 100;
                        return (
                          <>
                            <div style={{ width: `${p}%` }} className="bg-amber-400 h-full" />
                            <div style={{ width: `${ip}%` }} className="bg-indigo-500 h-full" />
                            <div style={{ width: `${c}%` }} className="bg-emerald-500 h-full" />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-gradient-to-br from-indigo-900 to-[#1e1b4b] text-white rounded-xl p-5 shadow-sm border border-indigo-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-28 h-28 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-bold font-mono text-indigo-300 uppercase tracking-wider block">Featured Metric</span>
            <span className="text-sm font-semibold mt-1.5 block leading-snug">Average Annual Salary Across Departments</span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-display">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0
                }).format(employees.reduce((acc, curr) => acc + curr.salary, 0) / (employees.length || 1))}
              </span>
              <span className="text-[10px] font-medium text-indigo-300">avg/year</span>
            </div>
            <p className="text-[10px] text-indigo-200/70 mt-2">Calculated from {employees.length} full-time salaries across 5 departments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
