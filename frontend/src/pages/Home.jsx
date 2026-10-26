import React, { useState } from 'react';
import { ShieldCheck, Cpu, Database, Eye, Terminal } from 'lucide-react';

export default function Home({ onNavigate, setAuthToken, setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('votingToken', data.token);
      localStorage.setItem('votingUser', JSON.stringify(data.user));
      setAuthToken(data.token);
      setUser(data.user);

      // Route based on role
      if (data.user.role === 'administrator') {
        onNavigate('admin');
      } else if (data.user.role === 'operator') {
        onNavigate('admin'); // Operators share admin panel views
      } else if (data.user.role === 'emergency') {
        onNavigate('fraud'); // Emergency committee routes to fraud dashboard for pause/resume controls
      } else {
        onNavigate('voter');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Hero Section */}
      <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'var(--accent-purple-glow)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: '1.2' }}>
          Blockchain-Based Online Voting
          <span style={{ display: 'block', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            With Real-Time AI Fraud Detection
          </span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 2.5rem', fontSize: '1.15rem' }}>
          A secure digital voting platform combining Ethereum blockchain immutability, automated smart contract governance, and proactive machine learning risk analysis to guarantee tamper-proof elections.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('register')}>
            Voter Registration Flow
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('explorer')}>
            <Eye size={18} /> Public Block Explorer
          </button>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid-3">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'var(--accent-purple-glow)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', marginBottom: '1rem', color: 'var(--accent-purple)' }}>
            <Database size={24} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Decentralized Ledger</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Votes are permanently recorded as immutable cryptographic transactions on an Ethereum Virtual Machine ledger, avoiding centralized manipulation.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'var(--accent-cyan-glow)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
            <Cpu size={24} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Proactive Anomaly Scan</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            An unsupervised Isolation Forest ML model monitors voter device footprints, timing clusters, and network subnets to generate real-time alerts.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', marginBottom: '1rem', color: 'hsl(142, 70%, 45%)' }}>
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Biometric Gating</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            A hybrid OpenCV-based facial verification engine checks the voter's live webcam signature against their registered template prior to casting.
          </p>
        </div>
      </div>

      {/* Main split: Login vs Competitive differentiation */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Login form */}
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={22} className="text-purple" style={{ color: 'var(--accent-purple)' }} /> Secure Login Portal
          </h3>
          <form onSubmit={handleLogin}>
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--state-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'hsl(350, 89%, 60%)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="voter_1, admin, emergency1" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            First time voting?{' '}
            <a href="#register" onClick={(e) => { e.preventDefault(); onNavigate('register'); }}>
              Register Biometrics & Profile
            </a>
          </div>
        </div>

        {/* Competitive Differentiation panel */}
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>System Feature Matrix</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Traditional e-voting machines and blockchain-only setups act as passive records. This framework incorporates active intelligence to capture anomalies dynamically.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem' }}>Security Metric</th>
                  <th style={{ padding: '0.5rem' }}>Traditional EVM</th>
                  <th style={{ padding: '0.5rem' }}>Blockchain-Only</th>
                  <th style={{ padding: '0.5rem', color: 'var(--accent-cyan)' }}>Our System</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0.25rem' }}>Tamper Resistance</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-danger)' }}>No</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'hsl(142, 70%, 45%)' }}>Yes</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Yes (Immutable)</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.25rem' }}>Identity Verification</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-warning)' }}>ID Check</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-danger)' }}>No</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Yes (Biometric Gate)</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.25rem' }}>Fraud Scan</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-danger)' }}>No</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-danger)' }}>No</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Yes (Real-time ML)</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.25rem' }}>Access Control Tiers</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-warning)' }}>Single Admin</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--state-warning)' }}>Standard Roles</td>
                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Yes (4-tier Multi-Sig)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
