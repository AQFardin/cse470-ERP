import { useEffect, useState, useMemo } from 'react';
import { Plus, BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { useCrm } from '../context/CrmContext';
import * as api from '../api';

export default function ReportsPage() {
  const { reports, refreshReports, loading } = useCrm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reportId: '', period: '', region: '', revenue: '', dealsClosed: '', dealsLost: '', employeeId: '' });

  useEffect(() => { refreshReports(); }, []);

  const handleCreate = async () => {
    if (!form.reportId || !form.period || !form.region || !form.employeeId) return;
    await api.createReport({
      ...form,
      revenue: Number(form.revenue) || 0,
      dealsClosed: Number(form.dealsClosed) || 0,
      dealsLost: Number(form.dealsLost) || 0,
    });
    setForm({ reportId: '', period: '', region: '', revenue: '', dealsClosed: '', dealsLost: '', employeeId: '' });
    setShowForm(false);
    refreshReports();
  };

  const totalRevenue = reports.reduce((sum, r) => sum + Number(r.revenue), 0);
  const totalClosed = reports.reduce((sum, r) => sum + r.dealsClosed, 0);
  const totalLost = reports.reduce((sum, r) => sum + r.dealsLost, 0);

  // Revenue by period (aggregated + sorted)
  const revenueByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => map.set(r.period, (map.get(r.period) || 0) + Number(r.revenue)));
    return Array.from(map.entries())
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [reports]);

  // Revenue by region (aggregated)
  const revenueByRegion = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => map.set(r.region, (map.get(r.region) || 0) + Number(r.revenue)));
    return Array.from(map.entries()).map(([region, revenue]) => ({ region, revenue }));
  }, [reports]);

  // Deals closed vs lost by period
  const dealsComparison = useMemo(() => {
    const map = new Map<string, { period: string; closed: number; lost: number }>();
    reports.forEach(r => {
      const entry = map.get(r.period) || { period: r.period, closed: 0, lost: 0 };
      entry.closed += r.dealsClosed;
      entry.lost += r.dealsLost;
      map.set(r.period, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [reports]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Sales Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Performance by salesperson, region, and period</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase mb-2"><DollarSign className="w-4 h-4" /> Total Revenue</div>
          <div className="text-2xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase mb-2"><TrendingUp className="w-4 h-4" /> Deals Closed</div>
          <div className="text-2xl font-semibold text-emerald-600">{totalClosed}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase mb-2"><TrendingDown className="w-4 h-4" /> Deals Lost</div>
          <div className="text-2xl font-semibold text-red-500">{totalLost}</div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input" placeholder="Report ID" value={form.reportId} onChange={e => setForm({ ...form, reportId: e.target.value })} />
            <input className="input" placeholder="Period (e.g. 2026-Q3)" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
            <input className="input" placeholder="Region" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} />
            <input className="input" placeholder="Employee ID" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} />
            <input className="input" type="number" placeholder="Revenue" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} />
            <input className="input" type="number" placeholder="Deals Closed" value={form.dealsClosed} onChange={e => setForm({ ...form, dealsClosed: e.target.value })} />
            <input className="input" type="number" placeholder="Deals Lost" value={form.dealsLost} onChange={e => setForm({ ...form, dealsLost: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Report</button>
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Period</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Region</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByRegion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Deals Closed vs Lost by Period</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dealsComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="closed" fill="#10b981" name="Closed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="lost" fill="#ef4444" name="Lost" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No reports yet. Add your first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Region</th>
                <th className="px-6 py-3">Revenue</th>
                <th className="px-6 py-3">Closed</th>
                <th className="px-6 py-3">Lost</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.period}</td>
                  <td className="px-6 py-4 text-gray-600">{r.region}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">${Number(r.revenue).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className="text-emerald-600 font-medium">{r.dealsClosed}</span></td>
                  <td className="px-6 py-4"><span className="text-red-500 font-medium">{r.dealsLost}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}