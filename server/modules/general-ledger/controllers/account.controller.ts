import { Request, Response } from 'express';
import { AccountType } from '@prisma/client';
import * as ledgerService from '../services/ledger.service';
import { LedgerError } from '../services/ledger.service';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof LedgerError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── GET /general-ledger/accounts ────────────────────────
export async function getAccounts(req: Request, res: Response) {
  try {
    const { type, isActive, search } = req.query;
    const accounts = await ledgerService.listAccounts({
      type: type ? (type as AccountType) : undefined,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search: search ? String(search) : undefined,
    });
    res.json({ success: true, data: accounts, count: accounts.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch accounts');
  }
}

// ─── GET /general-ledger/accounts/:id ────────────────────
export async function getAccount(req: Request, res: Response) {
  try {
    const account = await ledgerService.getAccountById(req.params.id as string);
    res.json({ success: true, data: account });
  } catch (error) {
    handleError(res, error, 'Failed to fetch account');
  }
}

// ─── POST /general-ledger/accounts ───────────────────────
export async function createAccount(req: Request, res: Response) {
  try {
    const { code, name, type, parentId, description } = req.body;
    const account = await ledgerService.createAccount(
      { code, name, type, parentId, description },
      req.currentUser!.id
    );
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    handleError(res, error, 'Failed to create account');
  }
}

// ─── PUT /general-ledger/accounts/:id ────────────────────
export async function updateAccount(req: Request, res: Response) {
  try {
    const { name, description, parentId, isActive, type } = req.body;
    const account = await ledgerService.updateAccount(
      req.params.id as string,
      { name, description, parentId, isActive, type },
      req.currentUser!.id
    );
    res.json({ success: true, data: account });
  } catch (error) {
    handleError(res, error, 'Failed to update account');
  }
}
