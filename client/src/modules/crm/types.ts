export interface Customer {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  interactions?: InteractionHistory[];
  pipelines?: SalesPipeline[];
}

export interface InteractionHistory {
  id: string;
  interactionId: string;
  date: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  notes?: string;
  customerId: string;
}

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  email: string;
  source: 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'SOCIAL_MEDIA' | 'EVENT' | 'OTHER';
  qualificationStat: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'CONVERTED';
  score: number;
  convertedCustomerId?: string;
}

export interface SalesPipeline {
  id: string;
  pipelineId: string;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  dealValue: number;
  expectedCloseDate: string;
  customerId: string;
  employeeId: string;
  customer?: Customer;
  employee?: { id: string; firstName: string; lastName: string };
}

export interface SalesReport {
  id: string;
  reportId: string;
  period: string;
  region: string;
  revenue: number;
  dealsClosed: number;
  dealsLost: number;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string };
}

