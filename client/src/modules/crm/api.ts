const BASE_URL = 'http://localhost:3001/api/crm';

// Customers
export const fetchCustomers = () => fetch(`${BASE_URL}/customers`).then(r => r.json());
export const fetchCustomerById = (id: string) => fetch(`${BASE_URL}/customers/${id}`).then(r => r.json());
export const createCustomer = (data: any) =>
  fetch(`${BASE_URL}/customers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const updateCustomer = (id: string, data: any) =>
  fetch(`${BASE_URL}/customers/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteCustomer = (id: string) =>
  fetch(`${BASE_URL}/customers/${id}`, { method: 'DELETE' });

// Interactions
export const addInteraction = (customerId: string, data: any) =>
  fetch(`${BASE_URL}/customers/${customerId}/interactions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteInteraction = (id: string) =>
  fetch(`${BASE_URL}/interactions/${id}`, { method: 'DELETE' });

// Leads
export const fetchLeads = () => fetch(`${BASE_URL}/leads`).then(r => r.json());
export const fetchLeadById = (id: string) => fetch(`${BASE_URL}/leads/${id}`).then(r => r.json());
export const createLead = (data: any) =>
  fetch(`${BASE_URL}/leads`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const calculateLeadScore = (id: string) =>
  fetch(`${BASE_URL}/leads/${id}/calculate-score`, { method: 'POST' }).then(r => r.json());
export const convertLead = (id: string, data: any) =>
  fetch(`${BASE_URL}/leads/${id}/convert`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const markLeadLost = (id: string) =>
  fetch(`${BASE_URL}/leads/${id}/mark-lost`, { method: 'POST' }).then(r => r.json());
export const deleteLead = (id: string) =>
  fetch(`${BASE_URL}/leads/${id}`, { method: 'DELETE' });

// Pipeline
export const fetchPipelines = () => fetch(`${BASE_URL}/pipelines`).then(r => r.json());
export const createPipeline = (data: any) =>
  fetch(`${BASE_URL}/pipelines`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const advanceStage = (id: string, stage: string) =>
  fetch(`${BASE_URL}/pipelines/${id}/advance-stage`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage })
  }).then(r => r.json());
export const deletePipeline = (id: string) =>
  fetch(`${BASE_URL}/pipelines/${id}`, { method: 'DELETE' });

// Reports
export const fetchReports = (filters?: { employeeId?: string; region?: string; period?: string }) => {
  const params = new URLSearchParams(filters as any).toString();
  return fetch(`${BASE_URL}/reports${params ? `?${params}` : ''}`).then(r => r.json());
};
export const createReport = (data: any) =>
  fetch(`${BASE_URL}/reports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteReport = (id: string) =>
  fetch(`${BASE_URL}/reports/${id}`, { method: 'DELETE' });