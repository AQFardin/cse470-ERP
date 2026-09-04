import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Vendor, CustomerRef } from '../types';
import * as finApi from '../api';

interface FinancialManagementContextType {
  vendors: Vendor[];
  activeVendors: Vendor[];
  customers: CustomerRef[];
  isLoading: boolean;
  refreshVendors: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  addVendor: (data: { name: string; email?: string; phone?: string; address?: string }) => Promise<void>;
  editVendor: (id: string, data: Partial<{ name: string; email: string | null; phone: string | null; address: string | null; isActive: boolean }>) => Promise<void>;
}

const FinancialManagementContext = createContext<FinancialManagementContextType | undefined>(undefined);

export const FinancialManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, showToast } = useApp();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshVendors = useCallback(async () => {
    try {
      const data = await finApi.fetchVendors();
      setVendors(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load vendors', 'error');
    }
  }, [showToast]);

  const refreshCustomers = useCallback(async () => {
    try {
      const data = await finApi.fetchCustomers();
      setCustomers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customers', 'error');
    }
  }, [showToast]);

  // Same rule as GeneralLedgerContext: wait for AppContext to resolve the
  // impersonated user before firing any requests, so they carry the header.
  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      Promise.all([refreshVendors(), refreshCustomers()]).finally(() => setIsLoading(false));
    }
  }, [currentUser]);

  const addVendor: FinancialManagementContextType['addVendor'] = async (data) => {
    try {
      await finApi.createVendor(data);
      await refreshVendors();
      showToast(`Vendor "${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const editVendor: FinancialManagementContextType['editVendor'] = async (id, data) => {
    try {
      await finApi.updateVendor(id, data);
      await refreshVendors();
      showToast('Vendor updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const activeVendors = vendors.filter((v) => v.isActive);

  return (
    <FinancialManagementContext.Provider value={{ vendors, activeVendors, customers, isLoading, refreshVendors, refreshCustomers, addVendor, editVendor }}>
      {children}
    </FinancialManagementContext.Provider>
  );
};

export const useFinancialManagement = () => {
  const context = useContext(FinancialManagementContext);
  if (context === undefined) {
    throw new Error('useFinancialManagement must be used within a FinancialManagementProvider');
  }
  return context;
};
