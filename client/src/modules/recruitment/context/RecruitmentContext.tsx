import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { JobPosting, Application, ApplicationStatus } from '../types';
import * as recruitmentApi from '../api';

interface RecruitmentContextType {
  jobPostings: JobPosting[];
  activeJobPostings: JobPosting[];
  applications: Application[];
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  createJobPosting: (data: {
    title: string;
    description: string;
    requirements: string;
    location: string;
    department: string;
  }) => Promise<void>;
  updateJobPosting: (id: string, data: Partial<{
    title: string;
    description: string;
    requirements: string;
    location: string;
    department: string;
    status: 'ACTIVE' | 'CLOSED';
  }>) => Promise<void>;
  changeApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
}

const RecruitmentContext = createContext<RecruitmentContextType | undefined>(undefined);

export const RecruitmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentEmployeeId, showToast } = useApp();

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [activeJobPostings, setActiveJobPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [all, active, apps] = await Promise.all([
        recruitmentApi.fetchAllJobPostings(),
        recruitmentApi.fetchActiveJobPostings(),
        recruitmentApi.fetchAllApplications(),
      ]);
      setJobPostings(all);
      setActiveJobPostings(active);
      setApplications(apps);
    } catch (err: any) {
      showToast(err.message || 'Failed to load recruitment data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const createJobPosting: RecruitmentContextType['createJobPosting'] = async (data) => {
    try {
      await recruitmentApi.createJobPosting({ ...data, postedById: currentEmployeeId });
      await refreshAll();
      showToast(`Job posting "${data.title}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateJobPosting: RecruitmentContextType['updateJobPosting'] = async (id, data) => {
    try {
      await recruitmentApi.updateJobPosting(id, data);
      await refreshAll();
      showToast('Job posting updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const changeApplicationStatus = async (id: string, status: ApplicationStatus) => {
    try {
      await recruitmentApi.updateApplicationStatus(id, status, currentEmployeeId);
      await refreshAll();
      showToast(`Application status updated to ${status.replace('_', ' ')}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <RecruitmentContext.Provider
      value={{ jobPostings, activeJobPostings, applications, isLoading, refreshAll, createJobPosting, updateJobPosting, changeApplicationStatus }}
    >
      {children}
    </RecruitmentContext.Provider>
  );
};

export const useRecruitment = () => {
  const context = useContext(RecruitmentContext);
  if (context === undefined) {
    throw new Error('useRecruitment must be used within a RecruitmentProvider');
  }
  return context;
};