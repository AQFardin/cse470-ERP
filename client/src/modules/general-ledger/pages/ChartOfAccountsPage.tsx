import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, Ban, CheckCircle2, Pencil } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../context/GeneralLedgerContext';
import type { Account, AccountType } from '../types';

const TYPE_OPTIONS: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const TYPE_BADGE: Record<AccountType, string> = {
  ASSET: 'bg-blue-50 text-blue-700 border-blue-200',
  LIABILITY: 'bg-amber-50 text-amber-700 border-amber-200',
  EQUITY: 'bg-purple-50 text-purple-700 border-purple-200',
  REVENUE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function ChartOfAccountsPage() {
  const { hasPermission } = useApp();
  const { accounts, isLoading, addAccount, editAccount } = useGeneralLedger();

  const canCreate = hasPermission('general_ledger', 'create_chart_of_account');
  const canEdit = hasPermission('general_ledger', 'edit_chart_of_account');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AccountType>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ASSET');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return accounts
      .filter((a) => (typeFilter === 'ALL' ? true : a.type === typeFilter))
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, typeFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setCode('');
    setName('');
    setType('ASSET');
    setParentId('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setCode(account.code);
    setName(account.name);
    setType(account.type);
    setParentId(account.parentId || '');
    setDescription(account.description || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!code.trim() || !name.trim()) {
      setFormError('Account code and name are required');
      return;
    }
    try {
      setSubmitting(true);
      if (editing) {
        await editAccount(editing.id, { name, description: description || null, parentId: parentId || null });
      } else {
        await addAccount({ code, name, type, parentId: parentId || null, description });
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (account: Account) => {
    try {
      await editAccount(account.id, { isActive: !account.isActive });
    } catch {
      // toast already shown by context
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Chart of Accounts</h1>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              The account hierarchy every journal entry posts against.
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
        >
          <option value="ALL">All Types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading chart of accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No accounts found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Parent</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id} className={!a.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{a.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${TYPE_BADGE[a.type]}`}>{a.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.parent ? `${a.parent.code} ${a.parent.name}` : '—'}</td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">ACTIVE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/20">INACTIVE</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(a)}
                          className={`p-1.5 rounded-lg cursor-pointer ${a.isActive ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={a.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {a.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              {editing ? 'Edit Account' : 'New Account'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 font-medium">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Account Code *</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editing}
                    placeholder="e.g. 1150"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    disabled={!!editing}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                  >
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Account Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Petty Cash"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Parent Account</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer"
                >
                  <option value="">None (top-level)</option>
                  {accounts.filter((a) => a.id !== editing?.id).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
