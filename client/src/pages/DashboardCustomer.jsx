import { useEffect, useMemo, useState } from 'react';
import { OrdersAPI, getStoredAuth } from '../api';
import { getSocket, joinRoom } from '../socket';

export default function DashboardCustomer() {
  const [{ phone }] = useState(() => getStoredAuth());
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ pickupAddress: '', pickupTime: '', quantity: 5, notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    joinRoom(`customer:${phone}`);
    const s = getSocket();
    const onCreated = (order) => setOrders(prev => [order, ...prev]);
    const onUpdated = (order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    const onLocation = ({ orderId, location }) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, currentLocation: location } : o));
    s.on('order:created', onCreated);
    s.on('order:updated', onUpdated);
    s.on('order:location', onLocation);
    return () => {
      s.off('order:created', onCreated);
      s.off('order:updated', onUpdated);
      s.off('order:location', onLocation);
    };
  }, [phone]);

  const load = async () => {
    const list = await OrdersAPI.list();
    setOrders(list);
  };
  useEffect(() => { load(); }, []);

  const placeOrder = async () => {
    setLoading(true);
    try {
      const created = await OrdersAPI.create(form);
      setForm({ pickupAddress: '', pickupTime: '', quantity: 5, notes: '' });
      setOrders(prev => [created, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Your Orders</h2>
      <div className="grid-2">
        <div className="card form">
          <h3>Place a new order</h3>
          <label>Pickup address</label>
          <input value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} placeholder="Apartment, Street" />
          <label>Pickup time</label>
          <input value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} placeholder="e.g. 3:30 PM" />
          <label>Quantity (items)</label>
          <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
          <label>Notes (optional)</label>
          <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-primary" onClick={placeOrder} disabled={loading || !form.pickupAddress || !form.pickupTime || !form.quantity}>Place Order</button>
        </div>
        <div>
          <h3>Order history</h3>
          <div className="list">
            {orders.map(o => (
              <div className="list-item" key={o.id}>
                <div>
                  <div className={`status status-${o.status}`}>{o.status.replaceAll('_',' ')}</div>
                  <div className="muted">{new Date(o.createdAt).toLocaleString()}</div>
                  <div className="muted">{o.pickupAddress} • {o.pickupTime} • {o.quantity} items</div>
                  {o.currentLocation && (
                    <div className="location">
                      Live location: lat {o.currentLocation.lat?.toFixed?.(5)}, lng {o.currentLocation.lng?.toFixed?.(5)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="muted">No orders yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}