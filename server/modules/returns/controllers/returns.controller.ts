import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== ORDERS (minimal, to support returns) =====================

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true, items: { include: { sku: true } } }
    });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, items } = req.body as {
      customerId: string;
      items: { skuId: string; quantity: number; price: number }[];
    };
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await prisma.order.create({
      data: {
        customerId,
        totalAmount,
        items: { create: items.map((i) => ({ skuId: i.skuId, quantity: i.quantity, price: i.price })) }
      },
      include: { items: { include: { sku: true } }, customer: true }
    });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== RETURN REQUESTS =====================

export const getReturnRequests = async (req: Request, res: Response) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      include: {
        customer: true,
        order: true,
        orderItem: { include: { sku: true } },
        refundTransaction: true,
        creditNote: true
      }
    });
    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createReturnRequest = async (req: Request, res: Response) => {
  try {
    const { customerId, orderId, orderItemId, reason } = req.body as {
      customerId: string;
      orderId: string;
      orderItemId: string;
      reason: string;
    };
    const returnRequest = await prisma.returnRequest.create({
      data: { customerId, orderId, orderItemId, reason },
      include: { orderItem: { include: { sku: true } } }
    });
    res.status(201).json(returnRequest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Approve: generates a credit note AND restocks inventory, atomically
export const approveReturnRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { orderItem: { include: { sku: true } } }
    });
    if (!returnRequest) {
      res.status(404).json({ error: 'Return request not found' });
      return;
    }
    if (returnRequest.status !== 'PENDING') {
      res.status(400).json({ error: `Return request is already ${returnRequest.status}` });
      return;
    }

    const refundAmount = Number(returnRequest.orderItem.price) * returnRequest.orderItem.quantity;

    const [updatedReturn, creditNote] = await prisma.$transaction([
      prisma.returnRequest.update({ where: { id }, data: { status: 'APPROVED' } }),
      prisma.creditNote.create({ data: { returnRequestId: id, amount: refundAmount } }),
      prisma.sKU.update({
        where: { id: returnRequest.orderItem.skuId },
        data: { quantity: { increment: returnRequest.orderItem.quantity } }
      })
    ]);

    res.json({ returnRequest: updatedReturn, creditNote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectReturnRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const returnRequest = await prisma.returnRequest.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    res.json(returnRequest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== REFUND TRANSACTIONS =====================

export const createRefundTransaction = async (req: Request, res: Response) => {
  try {
    const { returnRequestId } = req.params as { returnRequestId: string };
    const { amount, method } = req.body as { amount: number; method?: string };

    const returnRequest = await prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
    if (!returnRequest || returnRequest.status !== 'APPROVED') {
      res.status(400).json({ error: 'Return must be approved before issuing a refund' });
      return;
    }

    const refund = await prisma.refundTransaction.create({
      data: { returnRequestId, amount, method: method || 'ORIGINAL_PAYMENT' }
    });
    res.status(201).json(refund);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};