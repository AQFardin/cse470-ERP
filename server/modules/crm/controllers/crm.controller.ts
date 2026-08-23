import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== CUSTOMER =====================

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        interactions: true,
        pipelines: true
      }
    });
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        interactions: { orderBy: { date: 'desc' } },
        pipelines: { include: { employee: true } },
        convertedFromLead: true
      }
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, name, email, phone, address } = req.body as {
      customerId: string;
      name: string;
      email: string;
      phone?: string;
      address?: string;
    };
    const customer = await prisma.customer.create({
      data: { customerId, name, email, phone, address }
    });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, email, phone, address } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, email, phone, address }
    });
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.customer.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== INTERACTION HISTORY =====================

export const addInteraction = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };
    const { interactionId, date, type, notes } = req.body as {
      interactionId: string;
      date: string;
      type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
      notes?: string;
    };
    const interaction = await prisma.interactionHistory.create({
      data: {
        interactionId,
        date: new Date(date),
        type,
        notes,
        customerId
      }
    });
    res.status(201).json(interaction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteInteraction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.interactionHistory.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== LEAD =====================

export const getLeads = async (req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      include: { convertedCustomer: true }
    });
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { convertedCustomer: true }
    });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const { leadId, name, email, source } = req.body as {
      leadId: string;
      name: string;
      email: string;
      source: 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'SOCIAL_MEDIA' | 'EVENT' | 'OTHER';
    };
    const lead = await prisma.lead.create({
      data: { leadId, name, email, source }
    });
    res.status(201).json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// implements Lead.calculateScore()
// Simple standard scoring model: points awarded per known signal.
// Adjust weights later if your team wants a different formula.
export const calculateScore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    let score = 0;
    if (lead.source === 'REFERRAL') score += 30;
    if (lead.source === 'WEBSITE') score += 15;
    if (lead.source === 'EVENT') score += 20;
    if (lead.qualificationStat === 'CONTACTED') score += 10;
    if (lead.qualificationStat === 'QUALIFIED') score += 25;

    const updated = await prisma.lead.update({
      where: { id },
      data: { score }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// implements Lead.convertToCustomer()
export const convertToCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { customerId, phone, address } = req.body as {
      customerId: string;
      phone?: string;
      address?: string;
    };

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    if (lead.convertedCustomerId) {
      res.status(409).json({ error: 'Lead already converted' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        customerId,
        name: lead.name,
        email: lead.email,
        phone,
        address
      }
    });

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        qualificationStat: 'CONVERTED',
        convertedCustomerId: customer.id
      }
    });

    res.status(201).json({ customer, lead: updatedLead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// implements Lead.markLost()
export const markLost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lead = await prisma.lead.update({
      where: { id },
      data: { qualificationStat: 'LOST' }
    });
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.lead.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== SALES PIPELINE =====================

export const getPipelines = async (req: Request, res: Response) => {
  try {
    const pipelines = await prisma.salesPipeline.findMany({
      include: { customer: true, employee: true }
    });
    res.json(pipelines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createPipeline = async (req: Request, res: Response) => {
  try {
    const { pipelineId, dealValue, expectedCloseDate, customerId, employeeId } = req.body as {
      pipelineId: string;
      dealValue: number;
      expectedCloseDate: string;
      customerId: string;
      employeeId: string;
    };
    const pipeline = await prisma.salesPipeline.create({
      data: {
        pipelineId,
        dealValue,
        expectedCloseDate: new Date(expectedCloseDate),
        customerId,
        employeeId
      }
    });
    res.status(201).json(pipeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// implements SalesPipeline.advanceStage()
export const advanceStage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { stage } = req.body as {
      stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
    };
    const pipeline = await prisma.salesPipeline.update({
      where: { id },
      data: { stage }
    });
    res.json(pipeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePipeline = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.salesPipeline.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== SALES REPORT =====================

export const getReports = async (req: Request, res: Response) => {
  try {
    const { employeeId, region, period } = req.query as {
      employeeId?: string;
      region?: string;
      period?: string;
    };

    const reports = await prisma.salesReport.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(region ? { region } : {}),
        ...(period ? { period } : {})
      },
      include: { employee: true }
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createReport = async (req: Request, res: Response) => {
  try {
    const { reportId, period, region, revenue, dealsClosed, dealsLost, employeeId } = req.body as {
      reportId: string;
      period: string;
      region: string;
      revenue?: number;
      dealsClosed?: number;
      dealsLost?: number;
      employeeId: string;
    };
    const report = await prisma.salesReport.create({
      data: {
        reportId,
        period,
        region,
        revenue: revenue || 0,
        dealsClosed: dealsClosed || 0,
        dealsLost: dealsLost || 0,
        employeeId
      }
    });
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.salesReport.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};