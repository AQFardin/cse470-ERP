import { Request, Response } from 'express';
import { JournalStatus } from '@prisma/client';
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

// ─── GET /general-ledger/journals ────────────────────────
export async function getJournals(req: Request, res: Response) {
  try {
    const { status, dateFrom, dateTo, search, accountId, page, pageSize } = req.query;
    const result = await ledgerService.listJournalEntries({
      status: status && status !== 'ALL' ? (status as JournalStatus) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      search: search ? String(search) : undefined,
      accountId: accountId ? String(accountId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch journal entries');
  }
}

// ─── GET /general-ledger/journals/:id ─────────────────────
export async function getJournal(req: Request, res: Response) {
  try {
    const entry = await ledgerService.getJournalEntryById(req.params.id as string);
    res.json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to fetch journal entry');
  }
}

// ─── POST /general-ledger/journals ───────────────────────
export async function createJournal(req: Request, res: Response) {
  try {
    const { transactionDate, description, currency, lines, idempotencyKey } = req.body;
    const entry = await ledgerService.createJournalEntry(
      { transactionDate, description, currency, lines, idempotencyKey },
      req.currentUser!.id
    );
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to create journal entry');
  }
}

// ─── PUT /general-ledger/journals/:id ─────────────────────
export async function updateJournal(req: Request, res: Response) {
  try {
    const { transactionDate, description, currency, lines } = req.body;
    const entry = await ledgerService.updateJournalEntry(
      req.params.id as string,
      { transactionDate, description, currency, lines },
      req.currentUser!.id
    );
    res.json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to update journal entry');
  }
}

// ─── DELETE /general-ledger/journals/:id ──────────────────
export async function deleteJournal(req: Request, res: Response) {
  try {
    await ledgerService.deleteJournalEntry(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Journal entry deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete journal entry');
  }
}

// ─── POST /general-ledger/journals/:id/post ───────────────
export async function postJournal(req: Request, res: Response) {
  try {
    const entry = await ledgerService.postJournalEntry(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to post journal entry');
  }
}

// ─── POST /general-ledger/journals/:id/lock ───────────────
export async function lockJournal(req: Request, res: Response) {
  try {
    const entry = await ledgerService.lockJournalEntry(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to lock journal entry');
  }
}

// ─── POST /general-ledger/journals/:id/reverse ────────────
export async function reverseJournal(req: Request, res: Response) {
  try {
    const { transactionDate, description } = req.body || {};
    const entry = await ledgerService.reverseJournalEntry(req.params.id as string, req.currentUser!.id, {
      transactionDate,
      description,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    handleError(res, error, 'Failed to reverse journal entry');
  }
}
