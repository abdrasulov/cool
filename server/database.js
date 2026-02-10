const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const db = new Database(path.resolve(config.DB_PATH));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT UNIQUE NOT NULL,
    serial_number TEXT,
    device_name TEXT,
    model TEXT,
    os_version TEXT,
    push_token TEXT,
    push_magic TEXT,
    unlock_token TEXT,
    topic TEXT,
    last_seen DATETIME,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'enrolled'
  );

  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_uuid TEXT UNIQUE NOT NULL,
    device_udid TEXT NOT NULL,
    command_type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    responded_at DATETIME,
    FOREIGN KEY (device_udid) REFERENCES devices(udid)
  );

  CREATE INDEX IF NOT EXISTS idx_commands_device ON commands(device_udid);
  CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
`);

module.exports = {
  // ---------- Devices ----------
  getAllDevices() {
    return db.prepare('SELECT * FROM devices ORDER BY enrolled_at DESC').all();
  },

  getDevice(udid) {
    return db.prepare('SELECT * FROM devices WHERE udid = ?').get(udid);
  },

  upsertDevice({ udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic }) {
    const existing = db.prepare('SELECT * FROM devices WHERE udid = ?').get(udid);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE devices SET
          serial_number = COALESCE(?, serial_number),
          device_name = COALESCE(?, device_name),
          model = COALESCE(?, model),
          os_version = COALESCE(?, os_version),
          push_token = COALESCE(?, push_token),
          push_magic = COALESCE(?, push_magic),
          unlock_token = COALESCE(?, unlock_token),
          topic = COALESCE(?, topic),
          last_seen = CURRENT_TIMESTAMP,
          status = 'enrolled'
        WHERE udid = ?
      `);
      stmt.run(serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic, udid);
    } else {
      const stmt = db.prepare(`
        INSERT INTO devices (udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic);
    }
    return db.prepare('SELECT * FROM devices WHERE udid = ?').get(udid);
  },

  updateDeviceStatus(udid, status) {
    db.prepare('UPDATE devices SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE udid = ?').run(status, udid);
  },

  removeDevice(udid) {
    db.prepare('UPDATE devices SET status = ? WHERE udid = ?').run('unenrolled', udid);
  },

  // ---------- Commands ----------
  createCommand({ command_uuid, device_udid, command_type, payload }) {
    db.prepare(`
      INSERT INTO commands (command_uuid, device_udid, command_type, payload)
      VALUES (?, ?, ?, ?)
    `).run(command_uuid, device_udid, command_type, payload);
    return db.prepare('SELECT * FROM commands WHERE command_uuid = ?').get(command_uuid);
  },

  getNextPendingCommand(device_udid) {
    return db.prepare(`
      SELECT * FROM commands
      WHERE device_udid = ? AND status = 'pending'
      ORDER BY created_at ASC LIMIT 1
    `).get(device_udid);
  },

  updateCommandStatus(command_uuid, status, result) {
    const now = new Date().toISOString();
    if (status === 'sent') {
      db.prepare('UPDATE commands SET status = ?, sent_at = ? WHERE command_uuid = ?').run(status, now, command_uuid);
    } else {
      db.prepare('UPDATE commands SET status = ?, result = ?, responded_at = ? WHERE command_uuid = ?').run(status, result, now, command_uuid);
    }
  },

  getCommandsForDevice(device_udid) {
    return db.prepare('SELECT * FROM commands WHERE device_udid = ? ORDER BY created_at DESC').all(device_udid);
  },

  close() {
    db.close();
  },
};
