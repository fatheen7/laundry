import { useState } from 'react';
import { AuthAPI, setAuthToken } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [step, setStep] = useState('enter');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onRequestOtp = async () => {
    try {
      setError('');
      setLoading(true);
      await AuthAPI.requestOtp(phone);
      setStep('verify');
    } catch (e) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await AuthAPI.verifyOtp({ phone, code, role });
      setAuthToken(res.token);
      localStorage.setItem('qi_role', res.role);
      localStorage.setItem('qi_phone', phone);
      window.dispatchEvent(new Event('qi_auth'));
      if (res.role === 'vendor') navigate('/dashboard/vendor');
      else if (res.role === 'partner') navigate('/dashboard/partner');
      else navigate('/dashboard/customer');
    } catch (e) {
      setError('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth container-narrow">
      <h2>Login with OTP</h2>
      {step === 'enter' && (
        <div className="card form">
          <label>Mobile number</label>
          <input type="tel" placeholder="e.g. +911234567890" value={phone} onChange={e => setPhone(e.target.value)} />
          <label>Your role</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="partner">Delivery Partner</option>
          </select>
          <button className="btn btn-primary" onClick={onRequestOtp} disabled={loading || !phone}>Request OTP</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      {step === 'verify' && (
        <div className="card form">
          <label>Enter OTP</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code" />
          <button className="btn btn-primary" onClick={onVerify} disabled={loading || code.length < 4}>Verify</button>
          <button className="btn btn-secondary" onClick={() => setStep('enter')} disabled={loading}>Back</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}