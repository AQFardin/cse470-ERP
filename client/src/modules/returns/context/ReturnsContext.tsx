import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Order, ReturnRequest } from '../types';
import * as returnsApi from '../api';

interface ReturnsContextType {
  orders: Order[];
  returnRequests: ReturnRequest[];
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  addOrder: (data: { customerId: string; items: { skuId: string; quantity: number; price: number }[] }) => Promise<void>;
  addReturnRequest: (data: { customerId: string; orderId: string; orderItemId: string; reason: string }) => Promise<void>;
  approveReturn: (id: string) => Promise<void>;
  rejectReturn: (id: string) => Promise<void>;
  issueRefund: (returnRequestId: string, data: { amount: number; method?: string }) => Promise<void>;
}

const ReturnsContext = createContext<ReturnsContextType | undefined>(undefined);

export const ReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [o, r] = await Promise.all([returnsApi.fetchOrders(), returnsApi.fetchReturnRequests()]);
      setOrders(o);
      setReturnRequests(r);
    } catch (err: any) {
      showToast(err.message || 'Failed to load returns data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  const addOrder: ReturnsContextType['addOrder'] = async (data) => {
    try {
      await returnsApi.createOrder(data);
      await refreshAll();
      showToast('Order created', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addReturnRequest: ReturnsContextType['addReturnRequest'] = async (data) => {
    try {
      await returnsApi.createReturnRequest(data);
      await refreshAll();
      showToast('Return request submitted', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const approveReturn = async (id: string) => {
    try {
      await returnsApi.approveReturnRequest(id);
      await refreshAll();
      showToast('Return approved — credit note issued, inventory restocked', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const rejectReturn = async (id: string) => {
    try {
      await returnsApi.rejectReturnRequest(id);
      await refreshAll();
      showToast('Return rejected', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const issueRefund: ReturnsContextType['issueRefund'] = async (returnRequestId, data) => {
    try {
      await returnsApi.createRefundTransaction(returnRequestId, data);
      await refreshAll();
      showToast('Refund issued', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <ReturnsContext.Provider value={{ orders, returnRequests, isLoading, refreshAll, addOrder, addReturnRequest, approveReturn, rejectReturn, issueRefund }}>
      {children}
    </ReturnsContext.Provider>
  );
};

export const useReturns = () => {
  const context = useContext(ReturnsContext);
  if (context === undefined) throw new Error('useReturns must be used within a ReturnsProvider');
  return context;
};