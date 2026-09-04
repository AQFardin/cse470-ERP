import React, { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Plus, CheckCircle2, Clock, Calendar, Users, Building, Filter, ChevronDown, ChevronRight, CheckSquare, Layers, ShieldCheck, UserCheck, Edit, User, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Project, ProjectChunk } from '../types';
import * as api from '../lib/api';

export default function ProjectView() {
  const { employees, hasPermission, highestRole, showToast, currentEmployeeId, refreshData } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [chunkModalOpen, setChunkModalOpen] = useState(false);
  const [editChunkModalOpen, setEditChunkModalOpen] = useState(false);

  // Selected Project for Chunk Creation
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Create Project Form (Admin)
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectDept, setProjectDept] = useState('engineering');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');

  // Create Project Chunk Form (Project Manager)
  const [chunkTitle, setChunkTitle] = useState('');
  const [chunkDesc, setChunkDesc] = useState('');
  const [chunkDept, setChunkDept] = useState('engineering');
  const [chunkManagerId, setChunkManagerId] = useState('');

  // Edit Project Chunk Form
  const [editingChunkId, setEditingChunkId] = useState('');
  const [editChunkTitle, setEditChunkTitle] = useState('');
  const [editChunkDesc, setEditChunkDesc] = useState('');
  const [editChunkDept, setEditChunkDept] = useState('engineering');
  const [editChunkManagerId, setEditChunkManagerId] = useState('');
  const [editChunkStatus, setEditChunkStatus] = useState('PLANNING');

  // Create Task for Chunk Form (Department Manager)
  const [chunkTaskModalOpen, setChunkTaskModalOpen] = useState(false);
  const [selectedChunkForTask, setSelectedChunkForTask] = useState<ProjectChunk | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDeadline, setTaskDeadline] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Flatten all chunks across projects for chunk selection
  const allChunks = useMemo(() => {
    return projects.flatMap((p) =>
      (p.chunks || []).map((c) => ({
        ...c,
        projectName: p.name,
      }))
    );
  }, [projects]);

  const canCreateProject = hasPermission('project', 'create'); // Project Manager / Admin
  const canCreateChunk = hasPermission('project', 'chunk_create'); // Project Manager / Admin

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.fetchProjects();
      setProjects(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !projectDept || !projectStartDate) {
      showToast('Please fill in required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createProjectAPI({
        name: projectName,
        description: projectDesc,
        department: projectDept,
        startDate: projectStartDate,
        projectManagerId: projectManagerId || undefined,
      });
      showToast('Project created & Project Manager assigned', 'success');
      setProjectModalOpen(false);
      setProjectName('');
      setProjectDesc('');
      loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Failed to create project', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !chunkTitle || !chunkDept) {
      showToast('Please fill in required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createProjectChunkAPI({
        projectId: selectedProjectId,
        title: chunkTitle,
        description: chunkDesc,
        assignedDepartment: chunkDept,
        assignedManagerId: chunkManagerId || undefined,
      });
      showToast('Project Chunk delegated to department manager', 'success');
      setChunkModalOpen(false);
      setChunkTitle('');
      setChunkDesc('');
      loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Failed to create project chunk', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChunkId || !editChunkTitle || !editChunkDept) {
      showToast('Please fill in required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.updateProjectChunkAPI(editingChunkId, {
        title: editChunkTitle,
        description: editChunkDesc,
        assignedDepartment: editChunkDept,
        assignedManagerId: editChunkManagerId || undefined,
        status: editChunkStatus,
      });
      showToast('Project Chunk updated successfully', 'success');
      setEditChunkModalOpen(false);
      loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Failed to update project chunk', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openTaskModalForChunk = (chunk: ProjectChunk) => {
    setSelectedChunkForTask(chunk);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setTaskDeadline(nextWeek.toISOString().split('T')[0]);

    // Find first regular employee in chunk's department
    const eligible = employees.filter((emp) => {
      const isManager = emp.systemRole === 'MANAGER' || emp.role.toLowerCase().includes('manager');
      const inDept = emp.departmentId.toLowerCase() === chunk.assignedDepartment.toLowerCase();
      return inDept && !isManager && emp.status !== 'inactive';
    });
    setTaskAssigneeId(eligible[0]?.id || '');
    setChunkTaskModalOpen(true);
  };

  const handleCreateChunkTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChunkForTask || !taskTitle.trim() || !taskAssigneeId || !taskDeadline) {
      showToast('Please fill in all required task fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createTaskAPI({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assignedToId: taskAssigneeId,
        assignedById: currentEmployeeId,
        priority: taskPriority,
        deadline: taskDeadline,
        projectId: selectedChunkForTask.projectId,
        projectChunkId: selectedChunkForTask.id,
      });
      showToast(`Task assigned under chunk "${selectedChunkForTask.title}"`, 'success');
      setChunkTaskModalOpen(false);
      loadProjects();
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">ACTIVE</span>;
      case 'PLANNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">PLANNING</span>;
      case 'ON_HOLD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">ON HOLD</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 border border-gray-500/20">COMPLETED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-950 via-purple-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Project Hierarchy & Delegation</h1>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Project Manager creates Projects & Chunks → Assigns Department Managers (not themselves) → Managers assign Tasks to Employees.
            </p>
          </div>
        </div>

        {canCreateProject && (
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        )}
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-sm">
          No projects found in system.
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const chunks = project.chunks || [];

            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:border-purple-300 transition-all">
                <div
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-gray-400 mt-1">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-purple-600" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                          {project.department}
                        </span>
                        {getStatusBadge(project.status)}
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-gray-500">{project.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 shrink-0">
                    <div className="flex items-center gap-1.5 font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>PM: <strong>{project.projectManagerName || 'Unassigned'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <span>{chunks.length} chunks</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Chunks & Delegation Section */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-600" />
                        Project Chunks (Delegated to Department Managers)
                      </h4>
                      {canCreateChunk && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectId(project.id);
                            setChunkModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Delegate Chunk to Department
                        </button>
                      )}
                    </div>

                    {chunks.length === 0 ? (
                      <p className="text-xs text-gray-400 italic p-3 bg-white rounded-xl border border-gray-200">
                        No Project Chunks delegated yet by the Project Manager.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {chunks.map((chunk) => {
                          const isChunkManager = chunk.assignedManagerId === currentEmployeeId;
                          const canAssignTasks = isChunkManager || hasPermission('task', 'create') || highestRole === 'ADMIN' || highestRole === 'PROJECT_MANAGER';

                          return (
                            <div key={chunk.id} className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                    {chunk.assignedDepartment}
                                  </span>
                                  <h5 className="text-xs font-bold text-gray-900">{chunk.title}</h5>
                                  {isChunkManager && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Your Assigned Chunk
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" /> Dept Manager: {chunk.assignedManagerName || 'Unassigned'}
                                  </span>
                                  {canAssignTasks && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTaskModalForChunk(chunk);
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                                      title="Add Task under this chunk"
                                    >
                                      <Plus className="w-3 h-3" /> Add Task
                                    </button>
                                  )}
                                  {canCreateChunk && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChunkId(chunk.id);
                                        setEditChunkTitle(chunk.title);
                                        setEditChunkDesc(chunk.description || '');
                                        setEditChunkDept(chunk.assignedDepartment);
                                        setEditChunkManagerId(chunk.assignedManagerId || '');
                                        setEditChunkStatus(chunk.status || 'PLANNING');
                                        setEditChunkModalOpen(true);
                                      }}
                                      className="p-1 rounded-lg border border-gray-200 hover:border-purple-300 bg-white hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-all cursor-pointer"
                                      title="Edit Chunk"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {chunk.description && (
                                <p className="text-[11px] text-gray-500">{chunk.description}</p>
                              )}

                              {/* Sub-Tasks assigned under this chunk */}
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3 text-indigo-500" />
                                    Tasks Under this Chunk ({chunk.tasks?.length || 0})
                                  </span>
                                </div>

                                {(!chunk.tasks || chunk.tasks.length === 0) ? (
                                  <p className="text-[11px] text-gray-400 italic bg-gray-50/60 p-2.5 rounded-lg border border-dashed border-gray-200">
                                    No tasks assigned to employees under this chunk yet. Click "+ Add Task" to assign one.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {chunk.tasks.map((t) => (
                                      <div key={t.id} className="p-2.5 bg-gray-50/80 hover:bg-gray-100/60 rounded-xl border border-gray-200/80 space-y-1.5 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                          <div className="space-y-0.5">
                                            <span className="font-bold text-xs text-gray-900">{t.title}</span>
                                            {t.description && (
                                              <p className="text-[11px] text-gray-500 line-clamp-1">{t.description}</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase font-mono ${
                                              t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                              t.priority === 'high' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                              'bg-blue-50 text-blue-600 border border-blue-200'
                                            }`}>
                                              {t.priority}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                                              t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                              t.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                                              'bg-amber-50 text-amber-600 border border-amber-200'
                                            }`}>
                                              {t.status.replace('-', ' ')}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-200/50">
                                          <span className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-gray-400" />
                                            Assigned to: <strong className="text-gray-900">{t.employeeName}</strong>
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3 text-indigo-500" />
                                            Assigned by: <strong className="text-gray-900">{t.assignedByName || 'Dept Manager'}</strong>
                                            {t.assignedById === currentEmployeeId && (
                                              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-bold text-[8px] rounded">YOU</span>
                                            )}
                                          </span>
                                          {t.deadline && (
                                            <span className="flex items-center gap-1 text-gray-400">
                                              <Clock className="w-3 h-3" /> Due: <strong className="text-gray-700">{t.deadline}</strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Modal: Create Project & Assign PM */}
      {projectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-purple-600" />
              Create Project & Assign Project Manager
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. NextGen Microservices Refactor..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assign Department Manager (Lead) *</label>
                <select
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="">Select Department Manager...</option>
                  {employees
                    .filter((emp) => {
                      const isDeptManager =
                        emp.systemRole === 'MANAGER' ||
                        emp.role.toLowerCase().includes('manager');
                      const isSelf = emp.id === currentEmployeeId;
                      // Cannot assign oneself, must be a department manager
                      return isDeptManager && !isSelf;
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.departmentId.toUpperCase()} - {emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Primary Department *</label>
                <select
                  value={projectDept}
                  onChange={(e) => setProjectDept(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="engineering">Engineering</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="High-level project scope..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PM Modal: Create Project Chunk for Department */}
      {chunkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Delegate Project Chunk to Department
            </h2>
            <form onSubmit={handleCreateChunk} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chunk Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Backend API Microservices..."
                  value={chunkTitle}
                  onChange={(e) => setChunkTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assign to Department *</label>
                <select
                  value={chunkDept}
                  onChange={(e) => { setChunkDept(e.target.value); setChunkManagerId(''); }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="engineering">Engineering</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department Manager (Select Manager)</label>
                <select
                  value={chunkManagerId}
                  onChange={(e) => setChunkManagerId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">Select Department Manager...</option>
                  {employees
                    .filter((emp) => {
                      // Only show department managers of the selected department
                      // Exclude Project Managers and regular employees
                      const isProjectManager =
                        emp.systemRole === 'PROJECT_MANAGER' ||
                        emp.role.toLowerCase().includes('project manager');
                      if (isProjectManager) return false;

                      const isDeptManager =
                        emp.systemRole === 'MANAGER' ||
                        emp.role.toLowerCase().includes('manager');

                      return isDeptManager && emp.departmentId === chunkDept;
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.departmentId.toUpperCase()} - {emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chunk Description</label>
                <textarea
                  value={chunkDesc}
                  onChange={(e) => setChunkDesc(e.target.value)}
                  placeholder="Deliverables required from this department..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChunkModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Delegating...' : 'Delegate Chunk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PM Modal: Edit Project Chunk */}
      {editChunkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" />
              Edit Project Chunk
            </h2>
            <form onSubmit={handleUpdateChunk} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chunk Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Backend API Microservices..."
                  value={editChunkTitle}
                  onChange={(e) => setEditChunkTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assign to Department *</label>
                <select
                  value={editChunkDept}
                  onChange={(e) => { setEditChunkDept(e.target.value); setEditChunkManagerId(''); }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="engineering">Engineering</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department Manager (Select Manager)</label>
                <select
                  value={editChunkManagerId}
                  onChange={(e) => setEditChunkManagerId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">Select Department Manager...</option>
                  {employees
                    .filter((emp) => {
                      // Only show department managers of the selected department
                      // Exclude Project Managers and regular employees
                      const isProjectManager =
                        emp.systemRole === 'PROJECT_MANAGER' ||
                        emp.role.toLowerCase().includes('project manager');
                      if (isProjectManager) return false;

                      const isDeptManager =
                        emp.systemRole === 'MANAGER' ||
                        emp.role.toLowerCase().includes('manager');

                      return isDeptManager && emp.departmentId === editChunkDept;
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.departmentId.toUpperCase()} - {emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chunk Status</label>
                <select
                  value={editChunkStatus}
                  onChange={(e) => setEditChunkStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chunk Description</label>
                <textarea
                  value={editChunkDesc}
                  onChange={(e) => setEditChunkDesc(e.target.value)}
                  placeholder="Deliverables required from this department..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditChunkModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Manager / PM Modal: Create Task for Project Chunk */}
      {chunkTaskModalOpen && selectedChunkForTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                Assign Task Under Project Chunk
              </h2>
              <button
                onClick={() => setChunkTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChunkTask} className="space-y-4 text-xs">
              {/* Option to select which chunk to add to */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Project Chunk *</label>
                <select
                  value={selectedChunkForTask.id}
                  onChange={(e) => {
                    const target = allChunks.find((c) => c.id === e.target.value);
                    if (target) {
                      setSelectedChunkForTask(target);
                      const eligible = employees.filter((emp) => {
                        const isManager = emp.systemRole === 'MANAGER' || emp.role.toLowerCase().includes('manager');
                        const inDept = emp.departmentId.toLowerCase() === target.assignedDepartment.toLowerCase();
                        return inDept && !isManager && emp.status !== 'inactive';
                      });
                      setTaskAssigneeId(eligible[0]?.id || '');
                    }
                  }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  {allChunks
                    .filter((c) => {
                      if (highestRole === 'ADMIN' || highestRole === 'PROJECT_MANAGER') return true;
                      const myEmp = employees.find((e) => e.id === currentEmployeeId);
                      return (
                        c.assignedManagerId === currentEmployeeId ||
                        (myEmp && c.assignedDepartment.toLowerCase() === myEmp.departmentId.toLowerCase())
                      );
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.projectName ? `${c.projectName} → ` : ''}{c.title} ({c.assignedDepartment.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement JWT authentication middleware..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Scope & Description</label>
                <textarea
                  placeholder="Detailed instructions for the assigned team member..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Assignee - filtered to eligible employees in chunk's department */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Assign to Employee ({selectedChunkForTask.assignedDepartment.toUpperCase()}) *
                </label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">Select Department Team Member...</option>
                  {employees
                    .filter((emp) => {
                      const isManager = emp.systemRole === 'MANAGER' || emp.role.toLowerCase().includes('manager');
                      const inDept = emp.departmentId.toLowerCase() === selectedChunkForTask.assignedDepartment.toLowerCase();
                      return inDept && !isManager && emp.status !== 'inactive';
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId || emp.id} - {emp.role})
                      </option>
                    ))}
                </select>
                {employees.filter((emp) => {
                  const isManager = emp.systemRole === 'MANAGER' || emp.role.toLowerCase().includes('manager');
                  const inDept = emp.departmentId.toLowerCase() === selectedChunkForTask.assignedDepartment.toLowerCase();
                  return inDept && !isManager && emp.status !== 'inactive';
                }).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No regular employees found in {selectedChunkForTask.assignedDepartment.toUpperCase()} department to assign tasks to.
                  </p>
                )}
              </div>

              {/* Priority & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChunkTaskModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !taskAssigneeId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Task to Chunk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
