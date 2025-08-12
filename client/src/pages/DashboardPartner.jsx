import { useEffect, useRef, useState } from 'react';
import { OrdersAPI, getStoredAuth } from '../api';
import { getSocket, joinRoom } from '../socket';

const STATUSES = ['placed', 'picked_up', 'ironing', 'out_for_delivery', 'delivered'];

export default function DashboardPartner() {
  const [{ phone }] = useState(() => getStoredAuth());
  const [orders, setOrders] = useState([]);
  const watchIdRef = useRef(null);

  useEffect(() => {
    joinRoom(`partner:${phone}`);
    const s = getSocket();
    const onAssigned = (order) => setOrders(prev => [order, ...prev]);
    const onUpdated = (order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    s.on('order:assigned', onAssigned);
    s.on('order:updated', onUpdated);
    return () => { s.off('order:assigned', onAssigned); s.off('order:updated', onUpdated); };
  }, [phone]);

  const load = async () => {
    const list = await OrdersAPI.list();
    setOrders(list);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await OrdersAPI.updateStatus(id, status);
  };

  const startLocation = (orderId) => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      await OrdersAPI.updateLocation(orderId, { lat: latitude, lng: longitude });
    }, err => console.warn(err), { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 });
  };

  const stopLocation = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  };

  return (
    <div className="container">
      <h2>Partner Dashboard</h2>
      <div className="list">
        {orders.map(o => (
          <div className="list-item" key={o.id}>
            <div className="row">
              <div>
                <div className="status-badge">{o.status.replaceAll('_',' ')}</div>
                <div className="muted">Customer: {o.customerPhone}</div>
                <div className="muted">Pickup: {o.pickupAddress} • {o.pickupTime}</div>
                {o.currentLocation && (
                  <div className="muted">You at lat {o.currentLocation.lat?.toFixed?.(5)}, lng {o.currentLocation.lng?.toFixed?.(5)}</div>
                )}
              </div>
              <div className="controls">
                <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
                </select>
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={() => startLocation(o.id)}>Start Location</button>
                  <button className="btn" onClick={stopLocation}>Stop</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="muted">No assigned orders.</div>}
      </div>
    </div>
  );
}