export type JobPostingStatus = 'ACTIVE' | 'CLOSED';

export type ApplicationStatus =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'HIRED';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'HIRED',
];

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  department: string;
  status: JobPostingStatus;
  datePosted: string;
  dateClosed?: string | null;
  _count?: { applications: number };
}

export interface Applicant {
  name: string;
  email: string;
  phone?: string | null;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  dateApplied: string;
  updatedAt: string;
  applicant: Applicant;
  jobPosting: JobPosting;
}