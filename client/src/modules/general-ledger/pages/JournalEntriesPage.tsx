import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollText, Plus, Search, Eye, Pencil, Trash2, Send, Lock, Undo2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../context/GeneralLedgerContext';
import * as glApi from '../api';
import type { JournalEntry, JournalStatus } from '../types';
import { fmtMoney, fmtDate, STATUS_BADGE } from '../format';

interface LineDraft {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

function emptyLine(): LineDraft {
  return { accountId: '', description: '', debit: '', credit: '' };
}

export default function JournalEntriesPage() {
  const { hasPermission, showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();

  const canCreate = hasPermission('general_ledger', 'create_journal');
  const canEditDraft = hasPermission('general_ledger', 'edit_draft_journal');
  const canDeleteDraft = hasPermission('general_ledger', 'delete_draft_journal');
  const canPost = hasPermission('general_ledger', 'post_journal');
  const canLock = hasPermission('general_ledger', 'lock_journal');
  const canReverse = hasPermission('general_ledger', 'reverse_journal');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'ALL' | JournalStatus>('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await glApi.fetchJournalEntries({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: 15,
      });
      setEntries(res.entries);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Failed to load journal entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo, page, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, search, dateFrom, dateTo]);

  // ─── Create / Edit modal ────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const totals = useMemo(() => {
    let d = 0, c = 0;
    for (const l of lines) {
      d += Number(l.debit) || 0;
      c += Number(l.credit) || 0;
    }
    return { debit: d, credit: c, difference: Math.round((d - c) * 100) / 100, balanced: Math.abs(d - c) < 0.005 && d > 0 };
  }, [lines]);

  const openCreate = () => {
    setEditingId(null);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setLines([emptyLine(), emptyLine()]);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTransactionDate(fmtDate(entry.transactionDate));
    setDescription(entry.description);
    setLines(entry.lines.map((l) => ({
      accountId: l.accountId,
      description: l.description || '',
      debit: Number(l.debit) > 0 ? String(l.debit) : '',
      credit: Number(l.credit) > 0 ? String(l.credit) : '',
    })));
    setFormError('');
    setFormOpen(true);
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));

  const buildPayloadLines = () =>
    lines
      .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        description: l.description || undefined,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

  const submitEntry = async (postImmediately: boolean) => {
    setFormError('');
    if (!description.trim()) {
      setFormError('Description is required');
      return;
    }
    const payloadLines = buildPayloadLines();
    if (payloadLines.length < 2) {
      setFormError('At least two lines with an account and an amount are required');
      return;
    }
    try {
      setSubmitting(true);
      let entry: JournalEntry;
      if (editingId) {
        entry = await glApi.updateJournalEntry(editingId, { transactionDate, description, lines: payloadLines });
      } else {
        entry = await glApi.createJournalEntry({ transactionDate, description, lines: payloadLines });
      }
      if (postImmediately) {
        entry = await glApi.postJournalEntry(entry.id);
      }
      showToast(`Journal entry ${entry.entryNumber} ${postImmediately ? 'posted' : 'saved as draft'}`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Detail modal ───────────────────────────────────────
  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const entry = await glApi.fetchJournalEntry(id);
      setDetail(entry);
    } catch (err: any) {
      showToast(err.message || 'Failed to load journal entry', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      const result = await action();
      showToast(successMsg, 'success');
      setDetail(null);
      load();
      return result;
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    if (!confirm(`Delete draft journal entry ${entry.entryNumber}? This cannot be undone.`)) return;
    runAction(() => glApi.deleteJournalEntry(entry.id), 'Draft journal entry deleted');
  };

  const handlePost = (entry: JournalEntry) => {
    if (!confirm(`Post journal entry ${entry.entryNumber}? It will become part of the General Ledger and Trial Balance.`)) return;
    runAction(() => glApi.postJournalEntry(entry.id), `${entry.entryNumber} posted`);
  };

  const handleLock = (entry: JournalEntry) => {
    if (!confirm(`Lock journal entry ${entry.entryNumber}? Locked entries are permanently immutable.`)) return;
    runAction(() => glApi.lockJournalEntry(entry.id), `${entry.entryNumber} locked`);
  };

  const handleReverse = (entry: JournalEntry) => {
    if (!confirm(`Create a reversing entry for ${entry.entryNumber}? This posts a new entry with debits/credits swapped; the original is never modified.`)) return;
    runAction(() => glApi.reverseJournalEntry(entry.id), `Reversal of ${entry.entryNumber} created and posted`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Journal Entries</h1>
            <p className="text-xs text-emerald-200/80 mt-0.5">Double-entry transactions — draft, post, lock, and reverse.</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Journal Entry
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 min-w-[160px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entry # or description..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="LOCKED">Locked</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading journal entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No journal entries found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Entry #</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created By</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => {
                const debit = e.lines.reduce((s, l) => s + Number(l.debit), 0);
                const credit = e.lines.reduce((s, l) => s + Number(l.credit), 0);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">{e.entryNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(e.transactionDate)}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtMoney(debit)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtMoney(credit)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[e.status]}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.createdBy?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openDetail(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {e.status === 'DRAFT' && canEditDraft && (
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {e.status === 'DRAFT' && canDeleteDraft && (
                          <button onClick={() => handleDelete(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {e.status === 'DRAFT' && canPost && (
                          <button onClick={() => handlePost(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Post">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {e.status === 'POSTED' && canLock && (
                          <button onClick={() => handleLock(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="Lock">
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(e.status === 'POSTED' || e.status === 'LOCKED') && canReverse && !e.reversedBy && !e.reversalOfId && (
                          <button onClick={() => handleReverse(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer" title="Reverse">
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{total} entries · page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-emerald-600" />
                {editingId ? 'Edit Draft Journal Entry' : 'New Journal Entry'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Transaction Date *</label>
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" required />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description *</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Office rent payment" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-700 text-xs">Journal Lines *</label>
                <button type="button" onClick={addLine} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">+ Add Line</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="text-left px-3 py-2 w-2/5">Account</th>
                      <th className="text-left px-3 py-2">Line Description</th>
                      <th className="text-right px-3 py-2 w-24">Debit</th>
                      <th className="text-right px-3 py-2 w-24">Credit</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5">
                          <select
                            value={l.accountId}
                            onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs cursor-pointer"
                          >
                            <option value="">Select account...</option>
                            {activeAccounts.map((a) => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.description} onChange={(e) => updateLine(idx, { description: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min="0" step="0.01"
                            value={l.debit}
                            onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min="0" step="0.01"
                            value={l.credit}
                            onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right"
                          />
                        </td>
                        <td className="px-1">
                          {lines.length > 2 && (
                            <button type="button" onClick={() => removeLine(idx)} className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live balance indicator (spec section 16) */}
            <div className={`rounded-xl p-4 flex items-center justify-between text-xs font-semibold ${totals.balanced ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              <div className="flex gap-6">
                <span>Total Debit: <span className="font-mono">{fmtMoney(totals.debit)}</span></span>
                <span>Total Credit: <span className="font-mono">{fmtMoney(totals.credit)}</span></span>
                <span>Difference: <span className="font-mono">{fmtMoney(Math.abs(totals.difference))}</span></span>
              </div>
              <span>{totals.balanced ? 'Balanced' : 'Unbalanced'}</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !totals.balanced}
                onClick={() => submitEntry(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              {canPost && (
                <button
                  type="button"
                  disabled={submitting || !totals.balanced}
                  onClick={() => submitEntry(true)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                >
                  {submitting ? 'Saving...' : 'Save & Post'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {detailLoading || !detail ? (
              <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 font-mono">{detail.entryNumber}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{detail.description}</p>
                  </div>
                  <button onClick={() => setDetail(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-1 rounded-full font-semibold border ${STATUS_BADGE[detail.status]}`}>{detail.status}</span>
                  <span className="text-gray-500">Date: {fmtDate(detail.transactionDate)}</span>
                  <span className="text-gray-500">Currency: {detail.currency}</span>
                </div>

                {detail.reversalOf && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-xs">
                    This is a reversal of <strong className="font-mono">{detail.reversalOf.entryNumber}</strong>: {detail.reversalOf.description}
                  </div>
                )}
                {detail.reversedBy && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-xs">
                    This entry was reversed by <strong className="font-mono">{detail.reversedBy.entryNumber}</strong>: {detail.reversedBy.description}
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="text-left px-3 py-2">Account</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-3 py-2">Debit</th>
                        <th className="text-right px-3 py-2">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 font-mono">{l.account?.code} {l.account?.name}</td>
                          <td className="px-3 py-2 text-gray-500">{l.description || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{Number(l.debit) > 0 ? fmtMoney(l.debit) : ''}</td>
                          <td className="px-3 py-2 text-right font-mono">{Number(l.credit) > 0 ? fmtMoney(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      <tr>
                        <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtMoney(detail.lines.reduce((s, l) => s + Number(l.debit), 0))}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtMoney(detail.lines.reduce((s, l) => s + Number(l.credit), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                  <div>Created by <strong className="text-gray-700">{detail.createdBy?.name || '—'}</strong> on {new Date(detail.createdAt).toLocaleString()}</div>
                  <div>{detail.postedBy ? <>Posted by <strong className="text-gray-700">{detail.postedBy.name}</strong> on {detail.postedAt && new Date(detail.postedAt).toLocaleString()}</> : 'Not yet posted'}</div>
                  {detail.lockedAt && <div className="col-span-2">Locked on {new Date(detail.lockedAt).toLocaleString()}</div>}
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {detail.status === 'DRAFT' && canEditDraft && (
                    <button onClick={() => { setDetail(null); openEdit(detail); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {detail.status === 'DRAFT' && canDeleteDraft && (
                    <button onClick={() => handleDelete(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                  {detail.status === 'DRAFT' && canPost && (
                    <button onClick={() => handlePost(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer">
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  )}
                  {detail.status === 'POSTED' && canLock && (
                    <button onClick={() => handleLock(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer">
                      <Lock className="w-3.5 h-3.5" /> Lock
                    </button>
                  )}
                  {(detail.status === 'POSTED' || detail.status === 'LOCKED') && canReverse && !detail.reversedBy && !detail.reversalOfId && (
                    <button onClick={() => handleReverse(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl cursor-pointer">
                      <Undo2 className="w-3.5 h-3.5" /> Reverse
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
