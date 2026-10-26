const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getContract, getProvider, getSignerForRole } = require('../config/web3');

// Helper middleware to verify JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'supersecretkeyforblockchainvotingapp2026', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// 1. Get all logged AI Flags (Admin/Operator only)
router.get('/flags', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator' && req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Forbidden: Admin or Operator access required' });
  }

  db.all("SELECT * FROM ai_flags ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database search failed: ' + err.message });
    }
    return res.json(rows);
  });
});

// 2. Update status of an AI Flag (Human-in-the-loop action - Admin/Operator only)
router.put('/flags/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator' && req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Forbidden: Admin or Operator access required' });
  }

  const { status } = req.body;
  const flagId = req.params.id;

  if (!status || !['Pending', 'Confirmed', 'False Positive', 'Escalated'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value. Must be Confirmed, False Positive, or Escalated' });
  }

  db.run("UPDATE ai_flags SET status = ? WHERE id = ?", [status, flagId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update flag status: ' + err.message });
    }

    // Log the review action
    db.run("INSERT INTO audit_logs (event_type, description) VALUES ('FraudReview', ?)", [
      `AI Flag ID ${flagId} status updated to "${status}" by reviewer ${req.user.username}`
    ]);

    return res.json({ message: 'Flag status updated successfully!', affectedRows: this.changes });
  });
});

// 3. Get Security Audit Logs (Admin only)
router.get('/audit-logs', authenticateToken, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database search failed: ' + err.message });
    }
    return res.json(rows);
  });
});

// 4. Emergency Pause Call (Emergency Committee members only)
router.post('/emergency-pause', authenticateToken, async (req, res) => {
  if (req.user.role !== 'emergency') {
    return res.status(403).json({ error: 'Forbidden: Only Emergency Committee accounts permitted' });
  }

  try {
    const contract = getContract();
    const committeeSigner = await getSignerForRole('emergency', req.user.username);
    const committeeContract = contract.connect(committeeSigner);

    // Submit transaction
    const tx = await committeeContract.requestEmergencyPause();
    await tx.wait();

    // Retrieve current pause state
    const isPaused = await contract.isPaused();
    const approvalCount = await contract.pauseApprovalCount();

    db.run("INSERT INTO audit_logs (event_type, description) VALUES ('EmergencyPauseRequest', ?)", [
      `Committee member ${req.user.username} approved pause. Current approvals: ${Number(approvalCount)}. Paused state: ${isPaused}`
    ]);

    return res.json({
      message: 'Pause request successfully recorded on the blockchain!',
      isPaused,
      approvalCount: Number(approvalCount),
      txHash: tx.hash
    });
  } catch (txErr) {
    console.error('Emergency Pause call failed:', txErr.message);
    return res.status(500).json({ error: 'Blockchain emergency pause transaction failed: ' + txErr.message });
  }
});

// 5. Emergency Resume Call (Emergency Committee members only)
router.post('/emergency-resume', authenticateToken, async (req, res) => {
  if (req.user.role !== 'emergency') {
    return res.status(403).json({ error: 'Forbidden: Only Emergency Committee accounts permitted' });
  }

  try {
    const contract = getContract();
    const committeeSigner = await getSignerForRole('emergency', req.user.username);
    const committeeContract = contract.connect(committeeSigner);

    // Submit transaction
    const tx = await committeeContract.requestEmergencyResume();
    await tx.wait();

    const isPaused = await contract.isPaused();
    const approvalCount = await contract.resumeApprovalCount();

    db.run("INSERT INTO audit_logs (event_type, description) VALUES ('EmergencyResumeRequest', ?)", [
      `Committee member ${req.user.username} approved resume. Current approvals: ${Number(approvalCount)}. Paused state: ${isPaused}`
    ]);

    return res.json({
      message: 'Resume request successfully recorded on the blockchain!',
      isPaused,
      approvalCount: Number(approvalCount),
      txHash: tx.hash
    });
  } catch (txErr) {
    console.error('Emergency Resume call failed:', txErr.message);
    return res.status(500).json({ error: 'Blockchain emergency resume transaction failed: ' + txErr.message });
  }
});

// 6. Check global contract pause state (Public)
router.get('/emergency-state', async (req, res) => {
  try {
    const contract = getContract();
    const isPaused = await contract.isPaused();
    const pauseApprovals = await contract.pauseApprovalCount();
    const resumeApprovals = await contract.resumeApprovalCount();
    const committee = await contract.getEmergencyCommittee();

    return res.json({
      isPaused,
      pauseApprovalCount: Number(pauseApprovals),
      resumeApprovalCount: Number(resumeApprovals),
      committeeSize: committee.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read emergency state: ' + err.message });
  }
});

module.exports = router;
