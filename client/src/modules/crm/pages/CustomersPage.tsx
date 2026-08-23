import { useEffect, useState } from 'react';
import { Plus, Trash2, Mail, Phone, MapPin, Users } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import * as api from '../api';

export default function CustomersPage() {
  const { customers, refreshCustomers, loading } = useCrm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: '', name: '', email: '', phone: '', address: '' });

  useEffect(() => { refreshCustomers(); }, []);

  const handleCreate = async () => {
    if (!form.customerId || !form.name || !form.email) return;
    await api.createCustomer(form);
    setForm({ customerId: '', name: '', email: '', phone: '', address: '' });
    setShowForm(false);
    refreshCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    await api.deleteCustomer(id);
    refreshCustomers();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your customer database and relationships</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input" placeholder="Customer ID" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} />
            <input className="input" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Customer</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No customers yet. Add your first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{c.customerId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600"><Mail className="w-3.5 h-3.5 text-gray-400" />{c.email}</div>
                    {c.phone && <div className="flex items-center gap-1.5 text-gray-500 mt-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{c.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {c.address ? <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{c.address}</span> : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
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