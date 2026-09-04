import { useEffect, useState } from 'react';
import { Plus, Target, Zap, UserCheck, XCircle } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import * as api from '../api';

const SOURCE_OPTIONS = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER'];

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-amber-50 text-amber-700 border-amber-200',
  QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-gray-100 text-gray-500 border-gray-200',
  CONVERTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function LeadsPage() {
  const { leads, refreshLeads, loading } = useCrm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: '', name: '', email: '', source: 'WEBSITE' });

  useEffect(() => { refreshLeads(); }, []);

  const handleCreate = async () => {
    if (!form.leadId || !form.name || !form.email) return;
    await api.createLead(form);
    setForm({ leadId: '', name: '', email: '', source: 'WEBSITE' });
    setShowForm(false);
    refreshLeads();
  };

  const handleScore = async (id: string) => { await api.calculateLeadScore(id); refreshLeads(); };
  const handleConvert = async (id: string) => {
    const customerId = prompt('New Customer ID for converted lead:');
    if (!customerId) return;
    await api.convertLead(id, { customerId });
    refreshLeads();
  };
  const handleLost = async (id: string) => { await api.markLeadLost(id); refreshLeads(); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Track, score, and convert prospects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Lead</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input" placeholder="Lead ID" value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })} />
            <input className="input" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <select className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Lead</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No leads yet. Add your first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Lead</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{l.name}</div>
                    <div className="text-xs text-gray-400">{l.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{l.source.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[l.qualificationStat]}`}>
                      {l.qualificationStat}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{l.score}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleScore(l.id)} title="Recalculate score" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Zap className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleConvert(l.id)} title="Convert to customer" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleLost(l.id)} title="Mark lost" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}