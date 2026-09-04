import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useRecruitment } from '../context/RecruitmentContext';

const DEPARTMENTS = ['ENGINEERING', 'HR', 'FINANCE', 'MARKETING', 'SALES', 'OPERATIONS'];

export default function JobPostingsAdminPage() {
  const { currentUserRole } = useApp();
  const { jobPostings, createJobPosting, updateJobPosting, isLoading } = useRecruitment();

  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    department: DEPARTMENTS[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUserRole !== 'manager') {
    return (
      <div className="p-8 text-center text-gray-500">
        You don't have access to manage job postings.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createJobPosting(form);
      setForm({ title: '', description: '', requirements: '', location: '', department: DEPARTMENTS[0] });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    await updateJobPosting(id, { status: currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE' });
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-xl font-semibold mb-6">Manage Job Postings</h1>

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-8 space-y-3">
        <h2 className="font-medium text-sm text-gray-600">Post a new job</h2>
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Requirements"
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          required
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post job'}
        </button>
      </form>

      <h2 className="font-medium text-sm text-gray-600 mb-3">All postings</h2>
      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      <div className="space-y-2">
        {jobPostings.map((job) => (
          <div key={job.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{job.title}</p>
              <p className="text-sm text-gray-500">
                {job.department} · {job.location} · {job._count?.applications ?? 0} applicants
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  job.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {job.status}
              </span>
              <button
                onClick={() => toggleStatus(job.id, job.status)}
                className="text-sm text-gray-600 underline"
              >
                {job.status === 'ACTIVE' ? 'Close' : 'Reopen'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}