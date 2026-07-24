import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, CheckCircle2, Clock, Calendar, Users, Building, Filter, ChevronDown, ChevronRight, CheckSquare, Layers, ShieldCheck, UserCheck, Edit } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Project, ProjectChunk } from '../types';
import * as api from '../lib/api';

export default function ProjectView() {
  const { employees, hasPermission, highestRole, showToast, currentEmployeeId } = useApp();
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

  const [submitting, setSubmitting] = useState(false);

  const canCreateProject = hasPermission('project', 'create'); // Admin only
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
              Admin creates Projects & assigns PM → PM delegates Project Chunks to Dept Managers → Dept Managers assign Tasks to Employees.
            </p>
          </div>
        </div>

        {canCreateProject && (
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Project (Admin)
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
                        {chunks.map((chunk) => (
                          <div key={chunk.id} className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                  {chunk.assignedDepartment}
                                </span>
                                <h5 className="text-xs font-bold text-gray-900">{chunk.title}</h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" /> Dept Manager: {chunk.assignedManagerName || 'Unassigned'}
                                </span>
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

                            {/* Sub-Tasks assigned by Department Manager */}
                            <div className="pt-2 border-t border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Department Tasks ({chunk.tasks?.length || 0})
                              </span>
                              {(!chunk.tasks || chunk.tasks.length === 0) ? (
                                <p className="text-[11px] text-gray-400 italic">No tasks created by Dept Manager for employees yet.</p>
                              ) : (
                                <div className="space-y-1">
                                  {chunk.tasks.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between text-[11px] p-2 bg-gray-50 rounded-lg">
                                      <span className="font-semibold text-gray-800">{t.title}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Assignee: <strong>{t.employeeName}</strong></span>
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                          {t.status.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
                <label className="block font-semibold text-gray-700 mb-1">Assign Project Manager (PM) *</label>
                <select
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="">Select Project Manager...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId} - {emp.role})
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
                  onChange={(e) => setChunkDept(e.target.value)}
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
                    .filter((emp) => emp.id !== currentEmployeeId)
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
                  onChange={(e) => setEditChunkDept(e.target.value)}
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
                    .filter((emp) => emp.id !== currentEmployeeId)
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
    </div>
  );
}
