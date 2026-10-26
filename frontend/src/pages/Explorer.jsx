import React, { useState, useEffect } from 'react';
import { Search, Database, Terminal, FileCode, CheckCircle, Clock, Loader2 } from 'lucide-react';

export default function Explorer() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Transaction search details
  const [txHashQuery, setTxHashQuery] = useState('');
  const [searchedTx, setSearchedTx] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchBlocks();
    // Poll blocks every 10 seconds for real-time transactions logging
    const interval = setInterval(fetchBlocks, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBlocks = async () => {
    try {
      const response = await fetch('http://127.0.0.1:4000/api/elections/explorer/blocks');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch ledger logs');
      setBlocks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTx = async (e) => {
    e.preventDefault();
    if (!txHashQuery.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchedTx(null);

    try {
      const response = await fetch(`http://127.0.0.1:4000/api/elections/explorer/tx/${txHashQuery.trim()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transaction lookup failed');
      setSearchedTx(data);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Explorer Header */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={24} style={{ color: 'var(--accent-cyan)' }} /> Public Web3 Ledger Explorer
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Verify smart contract transactions, block states, and receipt proofs directly from the decentralized node list.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchTx} style={{ display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '500px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search Ethereum Tx Hash (0x...)" 
            value={txHashQuery}
            onChange={(e) => setTxHashQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Search size={18} />
          </button>
        </form>
      </div>

      {searchError && (
        <div style={{ padding: '1rem', background: 'var(--state-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'hsl(350, 89%, 60%)', borderRadius: '8px' }}>
          Transaction search failed: {searchError}
        </div>
      )}

      {/* Searched Transaction Result */}
      {searchLoading && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-cyan)' }} />
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Searching ledger transaction details...</p>
        </div>
      )}

      {searchedTx && (
        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--accent-cyan-glow)' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} className="text-cyan" style={{ color: 'var(--accent-cyan)' }} /> Transaction Audit Receipt
          </h3>
          
          <div className="custom-table-container" style={{ fontSize: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Transaction Hash:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-purple)', wordBreak: 'break-all' }}>{searchedTx.hash}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Signer Wallet (From):</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>{searchedTx.from}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Target Contract Address (To):</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>{searchedTx.to}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ledger Block Height:</span>
              <span style={{ fontWeight: 'bold' }}>#{searchedTx.blockNumber}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gas GasLimit:</span>
              <span style={{ color: 'var(--text-muted)' }}>{searchedTx.gasLimit} gas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3.5fr', gap: '1rem', padding: '0.75rem 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>EVM Execution Status:</span>
              <span className={`badge ${searchedTx.status === 1 ? 'badge-success' : 'badge-danger'}`} style={{ justifySelf: 'start' }}>
                {searchedTx.status === 1 ? 'SUCCESS (Receipt Verified)' : 'FAILED / REVERTED'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Split */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Recent Blocks List */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} /> Deployed Ledger Block Stream
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-cyan)' }} />
            </div>
          ) : error ? (
            <p style={{ color: 'hsl(350, 89%, 60%)', fontSize: '0.9rem' }}>{error}</p>
          ) : blocks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Ledger stream is empty. Launching votes will initialize blocks.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {blocks.map(b => (
                <div key={b.number} style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: 'var(--accent-cyan)' }}>Block #{b.number}</h4>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', maxWidth: '300px' }}>
                      Hash: {b.hash.substring(0, 36)}...
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-info" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      {b.transactionsCount} txs
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {new Date(b.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Instructions Panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCode size={20} /> Auditing & Verifiability Protocols
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            This system enforces mathematical trust. Unlike traditional voting databases which are privately controlled, this ledger exposes public audits through:
          </p>

          <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <strong>Individual Verification:</strong> Check your personal receipt hash using the search form to verify that your ballot is recorded in block heights correctly.
            </li>
            <li>
              <strong>Universal Recounts:</strong> Developers and election observers can verify the entire smart contract results by iterating through the blockchain blocks, fetching `VoteCast` events, and calculating tallies independently.
            </li>
            <li>
              <strong>Anonymity Check:</strong> Notice that transaction details specify the signing voter's wallet address but contain no fields linking back to CNIC/National ID, preserving voter privacy on the ledger.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
