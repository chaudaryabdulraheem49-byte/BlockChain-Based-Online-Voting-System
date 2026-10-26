import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, LayoutDashboard, Eye, Database, Terminal, UserPlus, KeyRound, AlertTriangle } from 'lucide-react';

// Import pages
import Home from './pages/Home';
import Register from './pages/Register';
import VoterDashboard from './pages/VoterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FraudDashboard from './pages/FraudDashboard';
import Explorer from './pages/Explorer';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ledgerStatus, setLedgerStatus] = useState('checking'); // checking, online, offline
  const [contractAddress, setContractAddress] = useState('');

  // Check login session and backend health on load
  useEffect(() => {
    const token = localStorage.getItem('votingToken');
    const savedUser = localStorage.getItem('votingUser');
    if (token && savedUser) {
      setAuthToken(token);
      setUser(JSON.parse(savedUser));
    }
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4000/api/health');
      const data = await res.json();
      if (data.status === 'healthy') {
        setLedgerStatus('online');
        setContractAddress(data.contractAddress);
      } else {
        setLedgerStatus('offline');
      }
    } catch (err) {
      setLedgerStatus('offline');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('votingToken');
    localStorage.removeItem('votingUser');
    setAuthToken(null);
    setUser(null);
    setCurrentPage('home');
  };

  // Nav item helper
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigateTo('home')}>
          <ShieldCheck size={26} style={{ color: 'var(--accent-cyan)' }} />
          <span>AGY-Vote</span>
        </div>

        {/* Network Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ledgerStatus === 'online' ? 'var(--state-success)' : ledgerStatus === 'checking' ? 'var(--state-warning)' : 'var(--state-danger)', boxShadow: ledgerStatus === 'online' ? '0 0 10px var(--state-success)' : 'none' }}></div>
          <span>Ganache EVM: {ledgerStatus === 'online' ? 'Connected' : ledgerStatus === 'checking' ? 'Detecting...' : 'Offline'}</span>
        </div>

        <div className="nav-links">
          <a href="#home" className={`nav-link ${currentPage === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>
            Portal Home
          </a>
          
          <a href="#explorer" className={`nav-link ${currentPage === 'explorer' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('explorer'); }}>
            <Eye size={16} /> Block Explorer
          </a>

          {!authToken ? (
            <>
              <a href="#register" className={`nav-link ${currentPage === 'register' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('register'); }}>
                <UserPlus size={16} /> Register
              </a>
            </>
          ) : (
            <>
              {/* Voter Nav links */}
              {user.role === 'voter' && (
                <a href="#dashboard" className={`nav-link ${currentPage === 'voter' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('voter'); }}>
                  <LayoutDashboard size={16} /> Ballot Center
                </a>
              )}

              {/* Admin/Operator Nav links */}
              {(user.role === 'administrator' || user.role === 'operator') && (
                <>
                  <a href="#admin" className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('admin'); }}>
                    <Database size={16} /> Admin Console
                  </a>
                  <a href="#fraud" className={`nav-link ${currentPage === 'fraud' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('fraud'); }}>
                    <AlertTriangle size={16} style={{ color: 'var(--state-warning)' }} /> Anomaly center
                  </a>
                </>
              )}

              {/* Emergency Committee Links */}
              {user.role === 'emergency' && (
                <a href="#emergency" className={`nav-link ${currentPage === 'fraud' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('fraud'); }}>
                  <Terminal size={16} /> Committee Panel
                </a>
              )}

              <button className="nav-btn-logout" onClick={handleLogout}>
                <LogOut size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Sign Out
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main UI Area */}
      <main className="main-content">
        {currentPage === 'home' && <Home onNavigate={navigateTo} setAuthToken={setAuthToken} setUser={setUser} />}
        {currentPage === 'register' && <Register onNavigate={navigateTo} />}
        {currentPage === 'explorer' && <Explorer />}
        {currentPage === 'voter' && authToken && <VoterDashboard user={user} token={authToken} onNavigate={navigateTo} />}
        {currentPage === 'admin' && authToken && <AdminDashboard token={authToken} onNavigate={navigateTo} />}
        {currentPage === 'fraud' && authToken && <FraudDashboard token={authToken} user={user} />}
      </main>

      {/* Footer Info */}
      <footer style={{ borderTop: '1px solid var(--border-glass)', padding: '1.5rem 2rem', background: '#0a0a0c', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem' }}>
        <div>BS Information Technology FYP Project — Session 2022–2026</div>
        <div>Supervisor: Dr. Ghulam Mustafa • University Context</div>
      </footer>
    </div>
  );
}
