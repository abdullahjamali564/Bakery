import React, { useEffect, useState } from 'react';
import { BarChart3, Package, RefreshCw, TrendingUp } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const statuses = ['Received', 'Baking', 'Out for Delivery', 'Completed', 'Cancelled'];
const formatCurrency = (value) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);

export default function LiveDashboard({ branch, onSignOut }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, active: 0 });
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) return onSignOut();
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Could not load dashboard');
      setOrders(data.orders);
      setStats(data.stats);
      setIsOpen(data.isOpen ?? true);
      setError('');
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadDashboard(); const interval = setInterval(loadDashboard, 30000); return () => clearInterval(interval); }, []);

  const update = async (id, status) => {
    const response = await fetch(`${API}/admin/orders/${id}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Could not update order'); return; }
    await loadDashboard();
  };

  const toggleBranch = async () => {
    const next = !isOpen;
    const response = await fetch(`${API}/admin/branch/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ isOpen: next }) });
    if (!response.ok) { setError('Could not update bakery status'); return; }
    setIsOpen(next);
  };

  return (
    <main className="dashboard">
      <header><div className="admin-mark">PORTO'S / MANAGER PORTAL</div><div className="location">{branch?.name} <span>·</span> <button onClick={onSignOut}>Sign out</button></div></header>
      <section className="welcome"><div><p className="muted">Live branch operations</p><h1>Good morning, manager.</h1><p className="muted">Orders and performance for {branch?.name}.</p></div><button className={`status ${isOpen ? 'is-open' : 'is-closed'}`} onClick={toggleBranch}><span />{isOpen ? 'Bakery open' : 'Bakery closed'} <RefreshCw size={15} /></button></section>
      {error && <p className="error">{error}</p>}
      <section className="stats"><div><div className="stat-icon orange"><Package size={19} /></div><p>Orders completed this month</p><strong>{stats.totalOrders}</strong><small>Current calendar month</small></div><div><div className="stat-icon sage"><TrendingUp size={19} /></div><p>Monthly revenue</p><strong>{formatCurrency(stats.revenue)}</strong><small>Completed orders only</small></div><div><div className="stat-icon dark"><BarChart3 size={19} /></div><p>Active orders</p><strong>{stats.active}</strong><small>Across all channels</small></div></section>
      <section className="orders"><div className="section-title"><div><p className="muted">Live queue</p><h2>Today's orders</h2></div></div><div className="order-table"><div className="table-head"><span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span></div>{orders.map((order) => <div className="order-row" key={order._id}><strong>#{order._id.slice(-4)}</strong><span>{order.customer.name}<small>{order.customer.address}</small></span><span>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</span><strong>{formatCurrency(order.total)}</strong><select value={order.status} onChange={(event) => update(order._id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>)}{!orders.length && !loading && <p className="empty">No orders have arrived yet.</p>}</div></section>
    </main>
  );
}
