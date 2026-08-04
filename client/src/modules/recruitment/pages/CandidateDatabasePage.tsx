import { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useRecruitment } from '../context/RecruitmentContext';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../types';

const STATUS_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  HIRED: 'Hired',
};

export default function CandidateDatabasePage() {
  const { currentUserRole } = useApp();
  const { applications, jobPostings, changeApplicationStatus, isLoading } = useRecruitment();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
      if (jobFilter !== 'ALL' && app.jobPosting.id !== jobFilter) return false;
      if (search && !app.applicant.name.toLowerCase().includes(search.toLowerCase()) &&
          !app.applicant.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [applications, statusFilter, jobFilter, search]);

  if (currentUserRole !== 'manager') {
    return (
      <div className="p-8 text-center text-gray-500">
        You don't have access to the candidate database.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-xl font-semibold mb-6">Candidate Database</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="ALL">All roles</option>
          {jobPostings.map((job) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-gray-400 text-sm">No applications match these filters.</p>
      )}

      <div className="space-y-2">
        {filtered.map((app) => (
          <div key={app.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{app.applicant.name}</p>
              <p className="text-sm text-gray-500">
                {app.applicant.email} → {app.jobPosting.title}
              </p>
            </div>
            <select
              value={app.status}
              onChange={(e) => changeApplicationStatus(app.id, e.target.value as ApplicationStatus)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}