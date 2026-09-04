import type { JobPosting, Application, ApplicationStatus } from './types';

const API_BASE = '/api';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return body;
}

// Job Postings

export async function fetchActiveJobPostings(): Promise<JobPosting[]> {
  const res = await fetchJSON('/job-postings/active');
  return res.data || [];
}

export async function fetchAllJobPostings(): Promise<JobPosting[]> {
  const res = await fetchJSON('/job-postings');
  return res.data || [];
}

export async function createJobPosting(data: {
  title: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  postedById: string;
}): Promise<JobPosting> {
  const res = await fetchJSON('/job-postings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateJobPosting(id: string, data: Partial<{
  title: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  status: 'ACTIVE' | 'CLOSED';
}>): Promise<JobPosting> {
  const res = await fetchJSON(`/job-postings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// ─── Applications (public submission) ───────────────────

export async function submitApplication(data: {
  name: string;
  email: string;
  phone?: string;
  jobPostingId: string;
  coverLetter?: string;
  resumeFile: File;
}): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('email', data.email);
  if (data.phone) formData.append('phone', data.phone);
  formData.append('jobPostingId', data.jobPostingId);
  if (data.coverLetter) formData.append('coverLetter', data.coverLetter);
  formData.append('resume', data.resumeFile);

  const res = await fetch(`${API_BASE}/applicants/apply`, {
    method: 'POST',
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return body;
}

// ─── Status Check (public) ──────────────────────────────

export async function checkStatusByEmail(email: string): Promise<{
  name: string;
  email: string;
  applications: Application[];
}> {
  const res = await fetchJSON(`/applicants/status?email=${encodeURIComponent(email)}`);
  return res.data;
}

//Candidate Database

export async function fetchAllApplications(params?: {
  jobPostingId?: string;
  status?: string;
  search?: string;
}): Promise<Application[]> {
  const query = new URLSearchParams();
  if (params?.jobPostingId) query.set('jobPostingId', params.jobPostingId);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetchJSON(`/applications${qs}`);
  return res.data || [];
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  changedById?: string
): Promise<Application> {
  const res = await fetchJSON(`/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, changedById }),
  });
  return res.data;
}