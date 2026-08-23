import { useEffect, useState } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import * as api from '../api';

const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

const stageColors: Record<string, string> = {
  PROSPECTING: 'bg-gray-100 text-gray-600 border-gray-200',
  QUALIFICATION: 'bg-blue-50 text-blue-700 border-blue-200',
  PROPOSAL: 'bg-amber-50 text-amber-700 border-amber-200',
  NEGOTIATION: 'bg-purple-50 text-purple-700 border-purple-200',
  CLOSED_WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED_LOST: 'bg-red-50 text-red-700 border-red-200',
};

export default function PipelinePage() {
  const { pipelines, refreshPipelines, loading } = useCrm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pipelineId: '', dealValue: '', expectedCloseDate: '', customerId: '', employeeId: '' });

  useEffect(() => { refreshPipelines(); }, []);

  const handleCreate = async () => {
    if (!form.pipelineId || !form.dealValue || !form.customerId || !form.employeeId) return;
    await api.createPipeline({ ...form, dealValue: Number(form.dealValue) });
    setForm({ pipelineId: '', dealValue: '', expectedCloseDate: '', customerId: '', employeeId: '' });
    setShowForm(false);
    refreshPipelines();
  };

  const handleStageChange = async (id: string, stage: string) => {
    await api.advanceStage(id, stage);
    refreshPipelines();
  };

  const totalValue = pipelines.reduce((sum, p) => sum + Number(p.dealValue), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Track deals through every stage</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase mb-2"><TrendingUp className="w-4 h-4" /> Open Deals</div>
          <div className="text-2xl font-semibold text-gray-900">{pipelines.filter(p => !p.stage.startsWith('CLOSED')).length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase mb-2"><DollarSign className="w-4 h-4" /> Pipeline Value</div>
          <div className="text-2xl font-semibold text-gray-900">${totalValue.toLocaleString()}</div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Deal</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input" placeholder="Pipeline ID" value={form.pipelineId} onChange={e => setForm({ ...form, pipelineId: e.target.value })} />
            <input className="input" type="number" placeholder="Deal Value ($)" value={form.dealValue} onChange={e => setForm({ ...form, dealValue: e.target.value })} />
            <input className="input" type="date" value={form.expectedCloseDate} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })} />
            <input className="input" placeholder="Customer ID" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} />
            <input className="input" placeholder="Employee ID" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Deal</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading pipeline...</div>
        ) : pipelines.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No deals yet. Add your first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Deal</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Expected Close</th>
                <th className="px-6 py-3">Stage</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.pipelineId}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">${Number(p.dealValue).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(p.expectedCloseDate).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={p.stage}
                      onChange={e => handleStageChange(p.id, e.target.value)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer ${stageColors[p.stage]}`}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
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