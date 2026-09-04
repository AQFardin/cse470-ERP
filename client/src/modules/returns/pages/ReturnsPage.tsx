import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useReturns } from '../context/ReturnsContext';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

export default function ReturnsPage() {
  const { currentUserRole } = useApp();
  const { orders, returnRequests, isLoading, addOrder, addReturnRequest, approveReturn, rejectReturn, issueRefund } = useReturns();

  const [orderForm, setOrderForm] = useState({ customerId: '', skuId: '', quantity: '1', price: '' });
  const [returnForm, setReturnForm] = useState({ customerId: '', orderId: '', orderItemId: '', reason: '' });

  if (currentUserRole !== 'manager') {
    return <div className="p-8 text-center text-gray-500">You don't have access to manage returns.</div>;
  }

  async function handleAddOrder(e: React.FormEvent) {
    e.preventDefault();
    await addOrder({
      customerId: orderForm.customerId,
      items: [{ skuId: orderForm.skuId, quantity: Number(orderForm.quantity), price: Number(orderForm.price) }]
    });
    setOrderForm({ customerId: '', skuId: '', quantity: '1', price: '' });
  }

  async function handleAddReturn(e: React.FormEvent) {
    e.preventDefault();
    await addReturnRequest(returnForm);
    setReturnForm({ customerId: '', orderId: '', orderItemId: '', reason: '' });
  }

  const selectedOrder = orders.find((o) => o.id === returnForm.orderId);

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Returns & Refunds</h1>
        <p className="text-sm text-gray-500 mt-1">Manage return requests, credit notes, and inventory restocking</p>
      </div>

      {/* Orders */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Record an order (needed before a return can be filed)</h2>
        <form onSubmit={handleAddOrder} className="border border-gray-200 rounded-lg p-4 grid grid-cols-4 gap-3 mb-4">
          <input type="text" placeholder="Customer ID" value={orderForm.customerId}
            onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}
            required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="text" placeholder="SKU ID" value={orderForm.skuId}
            onChange={(e) => setOrderForm({ ...orderForm, skuId: e.target.value })}
            required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Quantity" value={orderForm.quantity}
            onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
            required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Price per item" value={orderForm.price}
            onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
            required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="col-span-4 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Record order</button>
        </form>
        <div className="text-xs text-gray-500">{orders.length} order(s) on file</div>
      </section>

      {/* File a return */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">File a return request</h2>
        <form onSubmit={handleAddReturn} className="border border-gray-200 rounded-lg p-4 space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Customer ID" value={returnForm.customerId}
              onChange={(e) => setReturnForm({ ...returnForm, customerId: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select value={returnForm.orderId}
              onChange={(e) => setReturnForm({ ...returnForm, orderId: e.target.value, orderItemId: '' })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select order</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.id.slice(0, 8)}... (${o.totalAmount})</option>)}
            </select>
          </div>
          <select value={returnForm.orderItemId}
            onChange={(e) => setReturnForm({ ...returnForm, orderItemId: e.target.value })}
            required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select item</option>
            {selectedOrder?.items.map((item) => (
              <option key={item.id} value={item.id}>{item.sku.skuCode} — Qty {item.quantity} — ${item.price}</option>
            ))}
          </select>
          <textarea placeholder="Reason for return" value={returnForm.reason}
            onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
            required rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Submit return request</button>
        </form>
      </section>

      {/* Return requests list */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Return requests</h2>
        {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
        <div className="space-y-3">
          {returnRequests.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{r.customer?.name || r.customerId}</p>
                  <p className="text-sm text-gray-500">{r.orderItem?.sku?.skuCode} · {r.reason}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
              </div>

              {r.status === 'PENDING' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => approveReturn(r.id)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md">
                    Approve (auto-creates credit note + restocks inventory)
                  </button>
                  <button onClick={() => rejectReturn(r.id)} className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-md">
                    Reject
                  </button>
                </div>
              )}

              {r.creditNote && (
                <p className="text-xs text-gray-500 mt-2">Credit note issued: ${r.creditNote.amount} on {new Date(r.creditNote.issueDate).toLocaleDateString()}</p>
              )}

              {r.status === 'APPROVED' && !r.refundTransaction && (
                <button
                  onClick={() => issueRefund(r.id, { amount: Number(r.orderItem?.price || 0) * (r.orderItem?.quantity || 1) })}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md mt-2"
                >
                  Issue refund
                </button>
              )}
              {r.refundTransaction && (
                <p className="text-xs text-gray-500 mt-2">Refunded: ${r.refundTransaction.amount} via {r.refundTransaction.method}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}