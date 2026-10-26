const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_FILE || './voting_system.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        national_id TEXT UNIQUE NOT NULL,
        wallet_address TEXT UNIQUE NOT NULL,
        wallet_private_key TEXT NOT NULL, -- Encrypted or stored for PoC automation
        role TEXT DEFAULT 'voter', -- voter, administrator, operator, emergency
        registered_image_b64 TEXT, -- Bio snapshot template
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. AI Flags / Fraud Dashboard Table
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        election_id INTEGER NOT NULL,
        risk_score INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        status TEXT DEFAULT 'Pending', -- Pending, Confirmed, False Positive, Escalated
        ip_address TEXT,
        device_fingerprint TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Audit Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default admin and operator if users table is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) {
        console.error("Error checking user seed count:", err.message);
        return;
      }
      if (row.count === 0) {
        // Create an Admin user
        const adminPasswordHash = bcrypt.hashSync("admin123", 10);
        // Ganache Account 1 (standard private key from mnemonic, we can use standard Ganache first account)
        // We will seed the standard first account as Admin, second as Operator, third as Emergency
        const adminWallet = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"; 
        const adminPrivKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";

        db.run(`
          INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role)
          VALUES ('admin', ?, '11111-1111111-1', ?, ?, 'administrator')
        `, [adminPasswordHash, adminWallet, adminPrivKey]);

        // Create an Operator user
        const operatorPasswordHash = bcrypt.hashSync("operator123", 10);
        const operatorWallet = "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0";
        const operatorPrivKey = "0x6c32753e84e5f29116615a6e363374394e9f6244794ba11073e8e1716b2fb7fc";

        db.run(`
          INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role)
          VALUES ('operator', ?, '22222-2222222-2', ?, ?, 'operator')
        `, [operatorPasswordHash, operatorWallet, operatorPrivKey]);

        // Create 3 Emergency Committee users (using Ganache accounts 4, 5, 6)
        const em1Wallet = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b";
        const em1PrivKey = "0x829e924a3495fce2077c4e3344d9056ee402cd170c5d57412627724a35f7e4d6";
        db.run(`
          INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role)
          VALUES ('emergency1', ?, '33333-3333333-3', ?, ?, 'emergency')
        `, [bcrypt.hashSync("emergency123", 10), em1Wallet, em1PrivKey]);

        const em2Wallet = "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d";
        const em2PrivKey = "0xe48527a69680e438e1a74d2dd9d64022a106f7aa5667efb57cdff8f0f8a9e7d9";
        db.run(`
          INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role)
          VALUES ('emergency2', ?, '44444-4444444-4', ?, ?, 'emergency')
        `, [bcrypt.hashSync("emergency123", 10), em2Wallet, em2PrivKey]);

        const em3Wallet = "0xd03ea8624C8C59872d6448850a6a9deE509b0621";
        const em3PrivKey = "0xa268297ea4f3c05c08365287515c0e1db4e9c7028b809be18d105be2df02e3b2";
        db.run(`
          INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role)
          VALUES ('emergency3', ?, '55555-5555555-5', ?, ?, 'emergency')
        `, [bcrypt.hashSync("emergency123", 10), em3Wallet, em3PrivKey]);

        console.log("Database seeded with default Administrator, Operator, and 3 Emergency Committee accounts.");
      }
    });
  });
}

module.exports = db;
