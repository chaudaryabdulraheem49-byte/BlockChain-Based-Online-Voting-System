import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Play, Pause, ListCollapse, Loader2, Check, X, ShieldEllipsis } from 'lucide-react';

export default function FraudDashboard({ token, user }) {
  const [flags, setFlags] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [emergencyState, setEmergencyState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEmergencyMember = user?.role === 'emergency';
  const isAdminOrOperator = user?.role === 'administrator' || user?.role === 'operator';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch AI Flags (only visible to admin/operator)
      if (isAdminOrOperator) {
        const flagRes = await fetch('http://127.0.0.1:4000/api/fraud/flags', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const flagData = await flagRes.json();
        setFlags(flagData);

        // 2. Fetch Security Audit Logs
        const auditRes = await fetch('http://127.0.0.1:4000/api/fraud/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }

      // 3. Fetch Emergency state
      const stateRes = await fetch('http://127.0.0.1:4000/api/fraud/emergency-state');
      const stateData = await stateRes.json();
      setEmergencyState(stateData);
    } catch (err) {
      setError('Failed to fetch dashboard telemetry: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlagStatus = async (flagId, status) => {
    setActionLoading(flagId);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://127.0.0.1:4000/api/fraud/flags/${flagId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update flag');

      setSuccess(`AI Flag #${flagId} updated to status: "${status}".`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmergencyPause = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:4000/api/fraud/emergency-pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to broadcast pause signature');

      setSuccess(`${data.message} Tx: ${data.txHash.substring(0, 16)}...`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleEmergencyResume = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:4000/api/fraud/emergency-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to broadcast resume signature');

      setSuccess(`${data.message} Tx: ${data.txHash.substring(0, 16)}...`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Warning banner if paused */}
      {emergencyState?.isPaused && (
        <div style={{ padding: '1.5rem', background: 'var(--state-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', color: 'hsl(350, 89%, 60%)' }}>
          <ShieldAlert size={36} style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>ELECTION OPERATIONS HALTED</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              The smart contract has been paused by the Emergency Committee due to suspected critical security vulnerabilities. Vote casting is blocked until the system is reviewed and resumed.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'var(--state-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'hsl(350, 89%, 60%)', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: 'var(--state-success-bg)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--state-success)', borderRadius: '8px' }}>
          {success}
        </div>
      )}

      {/* Split: Emergency control (all roles view state, committee can click) vs Real-time logs */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Emergency committee protocol panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} className="text-purple" style={{ color: 'var(--accent-purple)' }} /> Emergency Multi-Sig Panel
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Consensus mechanism enforcing safety overrides. Requires 3 committee approvals on-chain to pause or resume voting windows globally.
          </p>

          {emergencyState && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ledger Contract State:</span>
                <span className={`badge ${emergencyState.isPaused ? 'badge-danger' : 'badge-success'}`}>
                  {emergencyState.isPaused ? 'PAUSED' : 'ACTIVE / RUNNING'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pause Approvals Signed:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{emergencyState.pauseApprovalCount} / 3</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Resume Approvals Signed:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>{emergencyState.resumeApprovalCount} / 3</span>
              </div>
            </div>
          )}

          {isEmergencyMember ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)' }}
                disabled={loading || emergencyState?.isPaused} 
                onClick={handleEmergencyPause}
              >
                <Pause size={18} /> Sign Pause Request
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={loading || !emergencyState?.isPaused} 
                onClick={handleEmergencyResume}
              >
                <Play size={18} /> Sign Resume Request
              </button>
            </div>
          ) : (
            <div style={{ border: '1px dashed var(--border-glass)', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <ShieldEllipsis size={24} style={{ margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
              Active User Account: {user?.username} ({user?.role})<br/>
              Only registered Emergency Committee wallets can broadcast pause/resume signatures.
            </div>
          )}
        </div>

        {/* Audit logs panel (Admin/Operator only) */}
        {isAdminOrOperator && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListCollapse size={20} /> Security Event Audit Logs
            </h3>
            
            <div style={{ maxHeight: '315px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {auditLogs.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Audit trail is empty.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                      <strong>{log.event_type}</strong>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{log.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Flags Real-Time Telemetry Dashboard (Admin/Operator only) */}
      {isAdminOrOperator && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} className="text-warning" style={{ color: 'var(--state-warning)' }} /> AI Real-Time Fraud Flags Queue
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Voter sessions flagged by the machine learning engine as behaviorally anomalous. Policy requires human confirmation before administrative overrides.
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-cyan)' }} />
            </div>
          ) : flags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No threat alerts logged. The machine learning network reports zero behavioral anomalies.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Flag ID</th>
                    <th>Voter</th>
                    <th>Risk Score</th>
                    <th>Explainable Reason</th>
                    <th>Client Network (IP/Device)</th>
                    <th>Ticket Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map(f => {
                    const score = f.risk_score;
                    const badgeClass = score >= 70 ? 'badge-danger' : score >= 40 ? 'badge-warning' : 'badge-success';
                    
                    return (
                      <tr key={f.id}>
                        <td>#{f.id}</td>
                        <td>{f.username}</td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{score}% Risk</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: '300px', wordBreak: 'break-word' }}>{f.explanation}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          IP: {f.ip_address}<br/>
                          Fingerprint: {f.device_fingerprint?.substring(0, 30)}...
                        </td>
                        <td>
                          <span className={`badge ${f.status === 'Pending' ? 'badge-info' : f.status === 'Confirmed' ? 'badge-danger' : 'badge-success'}`}>
                            {f.status}
                          </span>
                        </td>
                        <td>
                          {f.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', background: 'var(--state-success-bg)', color: 'var(--state-success)' }}
                                onClick={() => handleUpdateFlagStatus(f.id, 'False Positive')}
                                disabled={actionLoading === f.id}
                              >
                                <Check size={14} /> Clear
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', background: 'var(--state-danger-bg)', color: 'var(--state-danger)' }}
                                onClick={() => handleUpdateFlagStatus(f.id, 'Confirmed')}
                                disabled={actionLoading === f.id}
                              >
                                <X size={14} /> Flag
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
