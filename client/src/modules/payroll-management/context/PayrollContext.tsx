import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import type { SalaryComponent, TaxRule } from '../types';
import * as payrollApi from '../api';

interface PayrollContextType {
  salaryComponents: SalaryComponent[];
  activeAllowanceComponents: SalaryComponent[];
  taxRules: TaxRule[];
  activeTaxRules: TaxRule[];
  isLoading: boolean;
  refreshSalaryComponents: () => Promise<void>;
  refreshTaxRules: () => Promise<void>;
  addSalaryComponent: (data: { name: string; category: 'ALLOWANCE' | 'DEDUCTION'; isTaxable?: boolean }) => Promise<void>;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, showToast } = useApp();
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSalaryComponents = useCallback(async () => {
    try {
      setSalaryComponents(await payrollApi.fetchSalaryComponents());
    } catch (err: any) {
      showToast(err.message || 'Failed to load salary components', 'error');
    }
  }, [showToast]);

  const refreshTaxRules = useCallback(async () => {
    try {
      setTaxRules(await payrollApi.fetchTaxRules());
    } catch (err: any) {
      showToast(err.message || 'Failed to load tax rules', 'error');
    }
  }, [showToast]);

  // Same rule as the GL/Financial-Management contexts: wait for AppContext to
  // resolve the impersonated user before firing requests.
  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      Promise.all([refreshSalaryComponents(), refreshTaxRules()]).finally(() => setIsLoading(false));
    }
  }, [currentUser]);

  const addSalaryComponent: PayrollContextType['addSalaryComponent'] = async (data) => {
    try {
      await payrollApi.createSalaryComponent(data);
      await refreshSalaryComponents();
      showToast(`Salary component "${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const activeAllowanceComponents = salaryComponents.filter((c) => c.isActive && c.category === 'ALLOWANCE');
  const activeTaxRules = taxRules.filter((r) => r.isActive);

  return (
    <PayrollContext.Provider value={{ salaryComponents, activeAllowanceComponents, taxRules, activeTaxRules, isLoading, refreshSalaryComponents, refreshTaxRules, addSalaryComponent }}>
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (context === undefined) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
};
