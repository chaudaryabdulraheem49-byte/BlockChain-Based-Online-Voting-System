import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, User, Key, CreditCard, Loader2 } from 'lucide-react';

export default function Register({ onNavigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: Idle, 1: Scanning, 2: Captured
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Animate biometric scanning on canvas using real webcam video
  useEffect(() => {
    if (!scanning || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let stream = null;
    let video = null;
    let frame = 0;
    let isStreamActive = true;
    
    // Request real webcam stream
    navigator.mediaDevices.getUserMedia({ video: { width: 350, height: 262 } })
      .then(s => {
        stream = s;
        video = document.createElement('video');
        video.srcObject = s;
        video.setAttribute('playsinline', 'true');
        video.play();
        
        video.onloadedmetadata = () => {
          if (isStreamActive) {
            drawScan();
          }
        };
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setError("Could not access webcam. Please verify camera permissions.");
        setScanning(false);
        setScanStep(0);
      });

    const drawScan = () => {
      if (!isStreamActive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw active webcam frame onto the canvas
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback style if frame not ready
        ctx.fillStyle = '#060608';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Draw concentric green circles for alignment
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, 100, 0, Math.PI * 2);
      ctx.arc(canvas.width/2, canvas.height/2, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Draw stylized head oval representing camera target
      ctx.strokeStyle = scanning && frame % 10 < 5 ? '#00f2fe' : 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(canvas.width/2, canvas.height/2, 70, 95, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw digital face nodes (biometric coordinates mapping)
      const nodes = [
        { x: canvas.width/2, y: canvas.height/2 - 50 }, // forehead
        { x: canvas.width/2 - 30, y: canvas.height/2 - 15 }, // left eye
        { x: canvas.width/2 + 30, y: canvas.height/2 - 15 }, // right eye
        { x: canvas.width/2, y: canvas.height/2 + 10 }, // nose
        { x: canvas.width/2 - 35, y: canvas.height/2 + 40 }, // left cheek
        { x: canvas.width/2 + 35, y: canvas.height/2 + 40 }, // right cheek
        { x: canvas.width/2, y: canvas.height/2 + 65 }, // mouth
        { x: canvas.width/2, y: canvas.height/2 + 85 } // chin
      ];

      ctx.fillStyle = '#00f2fe';
      nodes.forEach((n, idx) => {
        const pulse = Math.abs(Math.sin((frame + idx * 10) * 0.1)) * 4 + 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2 + 10);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      });

      // Pulse Scan Line
      const lineY = (Math.sin(frame * 0.05) + 1) * 0.5 * canvas.height;
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
      
      // Scanning status text overlay
      const progress = Math.min(100, (frame / 1200) * 100);
      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BIOMETRIC ALIGNMENT: ${progress.toFixed(0)}%`, canvas.width/2, canvas.height - 20);

      frame++;
      animationRef.current = requestAnimationFrame(drawScan);
    };

    // Capture trigger after 20 seconds of scanning
    const timer = setTimeout(() => {
      cancelAnimationFrame(animationRef.current);
      isStreamActive = false;
      
      // Capture a clean video frame (without the biometric scan overlay) for face matching/embeddings verification
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);

      // Stop camera stream tracks to turn off the physical camera light
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      setScanning(false);
      setScanStep(2);
    }, 20000);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearTimeout(timer);
      isStreamActive = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning]);

  const startScanning = () => {
    setError('');
    setScanning(true);
    setScanStep(1);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password || !nationalId) {
      setError('Please provide all credentials first.');
      return;
    }

    // Validate exactly 13 digits for National ID (CNIC)
    const cleanId = nationalId.replace(/\D/g, '');
    if (cleanId.length !== 13) {
      setError('National Identity Number must contain exactly 13 digits.');
      return;
    }

    if (!capturedImage) {
      setError('You must complete the facial biometrics registration scan.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          nationalId,
          faceImage: capturedImage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #ffffff, var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Voter Identity Registration
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Step-by-step registration to assign your unique, secure blockchain credentials.
        </p>

        {successData ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ color: 'var(--state-success)', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Registration Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Your voter identity has been validated by the AI engine and recorded on-chain. A cryptographic wallet has been allocated to represent your ballot eligibility anonymously.
            </p>

            <div className="glass-panel" style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', marginBottom: '2rem', fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Generated Wallet Address:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>{successData.walletAddress}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Blockchain Tx Hash:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-purple)', wordBreak: 'break-all' }}>{successData.txHash}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => onNavigate('home')}>
              Proceed to Login Portal
            </button>
          </div>
        ) : (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Step Left: Basic details */}
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && (
                <div style={{ padding: '0.75rem', background: 'var(--state-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'hsl(350, 89%, 60%)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label"><User size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Full Name / Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. John Doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label"><Key size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Secret Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label"><CreditCard size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> National Identity Number (CNIC / Government ID)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 35201-1234567-9"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Processing Registration Ledger...
                  </>
                ) : 'Submit Voter Ledger Registration'}
              </button>
              
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('home')}>
                Cancel and Return
              </button>
            </form>

            {/* Step Right: Biometric Capture simulation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Camera size={18} /> Voter Facial Biometrics Registration
              </label>

              {scanStep === 0 && (
                <div className="scanner-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="scanner-video-placeholder">
                    <Camera size={48} className="text-muted" />
                    <button className="btn btn-primary" onClick={startScanning}>
                      Start Face Alignment Scan
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 1rem' }}>
                      Webcam access will be simulated to capture facial node coordinates.
                    </p>
                  </div>
                </div>
              )}

              {scanStep === 1 && (
                <div className="scanner-container">
                  <div className="scanner-line"></div>
                  <canvas ref={canvasRef} width="350" height="262" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
                </div>
              )}

              {scanStep === 2 && (
                <div className="scanner-container" style={{ position: 'relative' }}>
                  <img src={capturedImage} alt="Captured Face Biometric" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0, 242, 254, 0.8)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: '#000', fontWeight: 'bold' }}>
                    BIOMETRIC MATRIX SAVED
                  </div>
                  <button className="btn btn-secondary" style={{ position: 'absolute', top: '10px', right: '10px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={startScanning}>
                    Re-scan Face
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
