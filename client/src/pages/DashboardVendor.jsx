import { useEffect, useState } from 'react';
import { OrdersAPI } from '../api';
import { getSocket, joinRoom } from '../socket';

const STATUSES = ['placed', 'picked_up', 'ironing', 'out_for_delivery', 'delivered'];

export default function DashboardVendor() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    joinRoom('vendor');
    const s = getSocket();
    const onNew = (order) => setOrders(prev => [order, ...prev]);
    const onUpdated = (order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    s.on('order:new', onNew);
    s.on('order:updated', onUpdated);
    return () => { s.off('order:new', onNew); s.off('order:updated', onUpdated); };
  }, []);

  const load = async () => {
    const list = await OrdersAPI.list();
    setOrders(list);
  };
  useEffect(() => { load(); }, []);

  const assign = async (id, partnerPhone) => {
    await OrdersAPI.assign(id, partnerPhone);
  };
  const updateStatus = async (id, status) => {
    await OrdersAPI.updateStatus(id, status);
  };

  return (
    <div className="container">
      <h2>Vendor Dashboard</h2>
      <div className="list">
        {orders.map(o => (
          <div className="list-item" key={o.id}>
            <div className="row">
              <div>
                <div className="status-badge">{o.status.replaceAll('_',' ')}</div>
                <div className="muted">{new Date(o.createdAt).toLocaleString()}</div>
                <div className="muted">{o.pickupAddress} • {o.pickupTime} • {o.quantity} items</div>
                <div className="muted">Customer: {o.customerPhone}</div>
                <div className="muted">Partner: {o.partnerPhone || 'Unassigned'}</div>
              </div>
              <div className="controls">
                <input placeholder="Partner phone" defaultValue={o.partnerPhone || ''} onBlur={e => assign(o.id, e.target.value)} />
                <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}