import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getStoredAuth, setAuthToken } from './api';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import DashboardCustomer from './pages/DashboardCustomer';
import DashboardVendor from './pages/DashboardVendor';
import DashboardPartner from './pages/DashboardPartner';
import './App.css';

function ProtectedRoute({ children, allowRoles }) {
  const { token, role } = getStoredAuth();
  if (!token) return <Navigate to="/auth" replace />;
  if (allowRoles && !allowRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

function Nav() {
  const [{ role, phone }, setAuth] = useState(() => getStoredAuth());
  useEffect(() => {
    const handler = () => setAuth(getStoredAuth());
    window.addEventListener('qi_auth', handler);
    return () => window.removeEventListener('qi_auth', handler);
  }, []);
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">QuickIron</Link>
        <div className="grow" />
        <Link to="/" className="nav-link">Home</Link>
        {!role && <Link to="/auth" className="btn">Login</Link>}
        {role && <span className="muted">{role} · {phone}</span>}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} QuickIron • Fast, reliable ironing.</p>
      </div>
    </footer>
  );
}

export default function App() {
  useEffect(() => {
    const { token } = getStoredAuth();
    if (token) setAuthToken(token);
  }, []);
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard/customer" element={<ProtectedRoute allowRoles={["customer"]}><DashboardCustomer /></ProtectedRoute>} />
        <Route path="/dashboard/vendor" element={<ProtectedRoute allowRoles={["vendor"]}><DashboardVendor /></ProtectedRoute>} />
        <Route path="/dashboard/partner" element={<ProtectedRoute allowRoles={["partner"]}><DashboardPartner /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
