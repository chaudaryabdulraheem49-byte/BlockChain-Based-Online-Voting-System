import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Award, Loader2, Database, AlertCircle } from 'lucide-react';

export default function AdminDashboard({ token, onNavigate }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating election
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [electionSubmitting, setElectionSubmitting] = useState(false);

  // Form states for adding candidate
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [candName, setCandName] = useState('');
  const [candParty, setCandParty] = useState('');
  const [candidateSubmitting, setCandidateSubmitting] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:4000/api/elections');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch elections');
      setElections(data);
      if (data.length > 0 && !selectedElectionId) {
        setSelectedElectionId(data[0].id.toString());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newTitle || !newStart || !newEnd) {
      setError('Please provide title, start time, and end time.');
      return;
    }

    setElectionSubmitting(true);
    try {
      const response = await fetch('http://127.0.0.1:4000/api/elections/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          startTime: newStart,
          endTime: newEnd
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to deploy election');

      setSuccess(`Election "${newTitle}" successfully deployed on the blockchain ledger! Tx: ${data.txHash.substring(0, 16)}...`);
      setNewTitle('');
      setNewStart('');
      setNewEnd('');
      fetchElections();
    } catch (err) {
      setError(err.message);
    } finally {
      setElectionSubmitting(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedElectionId || !candName || !candParty) {
      setError('Please provide candidate name, party, and target election.');
      return;
    }

    setCandidateSubmitting(true);
    try {
      const response = await fetch('http://127.0.0.1:4000/api/elections/add-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          electionId: parseInt(selectedElectionId),
          name: candName,
          party: candParty
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register candidate');

      setSuccess(`Candidate "${candName}" added successfully to Election ID ${selectedElectionId}! Tx: ${data.txHash.substring(0, 16)}...`);
      setCandName('');
      setCandParty('');
      fetchElections();
    } catch (err) {
      setError(err.message);
    } finally {
      setCandidateSubmitting(false);
    }
  };

  // Calculate totals
  const totalElections = elections.length;
  let totalCandidates = 0;
  let totalVotes = 0;
  elections.forEach(e => {
    totalCandidates += e.candidates.length;
    e.candidates.forEach(c => {
      totalVotes += c.voteCount;
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Metrics Row */}
      <div className="grid-3">
        <div className="glass-panel stats-card">
          <div className="info">
            <h4>Smart Contract Elections</h4>
            <p>{totalElections}</p>
          </div>
          <div className="icon-container" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>
            <Calendar size={24} />
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="info">
            <h4>Total Candidates</h4>
            <p>{totalCandidates}</p>
          </div>
          <div className="icon-container" style={{ background: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)' }}>
            <Award size={24} />
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="info">
            <h4>Total Votes Audited</h4>
            <p>{totalVotes}</p>
          </div>
          <div className="icon-container" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'hsl(142, 70%, 45%)' }}>
            <Users size={24} />
          </div>
        </div>
      </div>

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

      {/* Forms Section split */}
      <div className="grid-2">
        {/* Create Election */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} className="text-purple" style={{ color: 'var(--accent-purple)' }} /> Initialize New Election
          </h3>
          <form onSubmit={handleCreateElection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Election Title</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Session 2022-26 IT Department Elections" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Start Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">End Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={electionSubmitting}>
              {electionSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Broadcasting Transaction...
                </>
              ) : 'Deploy Election Contract'}
            </button>
          </form>
        </div>

        {/* Add Candidate */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} className="text-cyan" style={{ color: 'var(--accent-cyan)' }} /> Register Election Candidate
          </h3>
          <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Target Election Window</label>
              <select 
                className="form-control" 
                value={selectedElectionId} 
                onChange={(e) => setSelectedElectionId(e.target.value)}
                style={{ background: '#0a0a0c' }}
              >
                {elections.length === 0 ? (
                  <option value="">No Active Elections Available</option>
                ) : (
                  elections.map(e => (
                    <option key={e.id} value={e.id}>{e.title} (ID: {e.id})</option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Candidate Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Abdul-Raheem Waseem" 
                value={candName}
                onChange={(e) => setCandName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Party Affiliation</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Justice Party, Independent" 
                value={candParty}
                onChange={(e) => setCandParty(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={candidateSubmitting || elections.length === 0}>
              {candidateSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Registering Candidate...
                </>
              ) : 'Register Candidate On-Chain'}
            </button>
          </form>
        </div>
      </div>

      {/* Live Standings Panel */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} /> Live Blockchain Tally Results
        </h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-purple)' }} />
          </div>
        ) : elections.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No active elections are registered on the blockchain network yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {elections.map(elec => (
              <div key={elec.id} style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>{elec.title}</h4>
                {elec.candidates.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No candidates registered for this election window.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {elec.candidates.map(cand => {
                      const totalElectionVotes = elec.candidates.reduce((sum, c) => sum + c.voteCount, 0);
                      const percentage = totalElectionVotes > 0 ? ((cand.voteCount / totalElectionVotes) * 100).toFixed(0) : 0;
                      
                      return (
                        <div key={cand.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>{cand.name} ({cand.party})</span>
                            <span style={{ fontWeight: 'bold' }}>{cand.voteCount} votes ({percentage}%)</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
