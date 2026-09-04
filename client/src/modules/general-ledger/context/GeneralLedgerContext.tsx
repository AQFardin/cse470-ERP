import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Account, AccountType } from '../types';
import * as glApi from '../api';

interface GeneralLedgerContextType {
  accounts: Account[];
  activeAccounts: Account[];
  isLoading: boolean;
  refreshAccounts: () => Promise<void>;
  addAccount: (data: { code: string; name: string; type: AccountType; parentId?: string | null; description?: string }) => Promise<void>;
  editAccount: (id: string, data: Partial<{ name: string; description: string | null; parentId: string | null; isActive: boolean }>) => Promise<void>;
}

const GeneralLedgerContext = createContext<GeneralLedgerContextType | undefined>(undefined);

export const GeneralLedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, showToast } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await glApi.fetchAccounts();
      setAccounts(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load chart of accounts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Wait for AppContext to finish resolving the impersonated user (and attaching
  // its id to every outgoing request) before making any General Ledger calls —
  // otherwise these fire with no x-current-user-id header and get 401s.
  useEffect(() => {
    if (currentUser) {
      refreshAccounts();
    }
  }, [currentUser]);

  const addAccount: GeneralLedgerContextType['addAccount'] = async (data) => {
    try {
      await glApi.createAccount(data);
      await refreshAccounts();
      showToast(`Account "${data.code} ${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const editAccount: GeneralLedgerContextType['editAccount'] = async (id, data) => {
    try {
      await glApi.updateAccount(id, data);
      await refreshAccounts();
      showToast('Account updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <GeneralLedgerContext.Provider value={{ accounts, activeAccounts, isLoading, refreshAccounts, addAccount, editAccount }}>
      {children}
    </GeneralLedgerContext.Provider>
  );
};

export const useGeneralLedger = () => {
  const context = useContext(GeneralLedgerContext);
  if (context === undefined) {
    throw new Error('useGeneralLedger must be used within a GeneralLedgerProvider');
  }
  return context;
};
