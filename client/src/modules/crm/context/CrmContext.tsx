import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Customer, Lead, SalesPipeline, SalesReport } from '../types';
import * as api from '../api';

interface CrmContextType {
  customers: Customer[];
  leads: Lead[];
  pipelines: SalesPipeline[];
  reports: SalesReport[];
  loading: boolean;
  refreshCustomers: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshPipelines: () => Promise<void>;
  refreshReports: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider = ({ children }: { children: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<SalesPipeline[]>([]);
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCustomers = useCallback(async () => {
    setLoading(true);
    setCustomers(await api.fetchCustomers());
    setLoading(false);
  }, []);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setLeads(await api.fetchLeads());
    setLoading(false);
  }, []);

  const refreshPipelines = useCallback(async () => {
    setLoading(true);
    setPipelines(await api.fetchPipelines());
    setLoading(false);
  }, []);

  const refreshReports = useCallback(async () => {
    setLoading(true);
    setReports(await api.fetchReports());
    setLoading(false);
  }, []);

  return (
    <CrmContext.Provider value={{
      customers, leads, pipelines, reports, loading,
      refreshCustomers, refreshLeads, refreshPipelines, refreshReports
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
};