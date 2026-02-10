const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_URL && !config.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      udid TEXT UNIQUE NOT NULL,
      serial_number TEXT,
      device_name TEXT,
      model TEXT,
      os_version TEXT,
      push_token TEXT,
      push_magic TEXT,
      unlock_token TEXT,
      topic TEXT,
      last_seen TIMESTAMPTZ,
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'enrolled'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS commands (
      id SERIAL PRIMARY KEY,
      command_uuid TEXT UNIQUE NOT NULL,
      device_udid TEXT NOT NULL REFERENCES devices(udid),
      command_type TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      responded_at TIMESTAMPTZ
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_commands_device ON commands(device_udid)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)');
}

module.exports = {
  init,

  // ---------- Devices ----------
  async getAllDevices() {
    const { rows } = await pool.query('SELECT * FROM devices ORDER BY enrolled_at DESC');
    return rows;
  },

  async getDevice(udid) {
    const { rows } = await pool.query('SELECT * FROM devices WHERE udid = $1', [udid]);
    return rows[0] || null;
  },

  async upsertDevice({ udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic }) {
    const { rows: existing } = await pool.query('SELECT * FROM devices WHERE udid = $1', [udid]);
    if (existing.length > 0) {
      await pool.query(`
        UPDATE devices SET
          serial_number = COALESCE($1, serial_number),
          device_name = COALESCE($2, device_name),
          model = COALESCE($3, model),
          os_version = COALESCE($4, os_version),
          push_token = COALESCE($5, push_token),
          push_magic = COALESCE($6, push_magic),
          unlock_token = COALESCE($7, unlock_token),
          topic = COALESCE($8, topic),
          last_seen = NOW(),
          status = 'enrolled'
        WHERE udid = $9
      `, [serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic, udid]);
    } else {
      await pool.query(`
        INSERT INTO devices (udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [udid, serial_number, device_name, model, os_version, push_token, push_magic, unlock_token, topic]);
    }
    const { rows } = await pool.query('SELECT * FROM devices WHERE udid = $1', [udid]);
    return rows[0];
  },

  async updateDeviceStatus(udid, status) {
    await pool.query('UPDATE devices SET status = $1, last_seen = NOW() WHERE udid = $2', [status, udid]);
  },

  async removeDevice(udid) {
    await pool.query("UPDATE devices SET status = 'unenrolled' WHERE udid = $1", [udid]);
  },

  // ---------- Commands ----------
  async createCommand({ command_uuid, device_udid, command_type, payload }) {
    await pool.query(`
      INSERT INTO commands (command_uuid, device_udid, command_type, payload)
      VALUES ($1, $2, $3, $4)
    `, [command_uuid, device_udid, command_type, payload]);
    const { rows } = await pool.query('SELECT * FROM commands WHERE command_uuid = $1', [command_uuid]);
    return rows[0];
  },

  async getNextPendingCommand(device_udid) {
    const { rows } = await pool.query(`
      SELECT * FROM commands
      WHERE device_udid = $1 AND status = 'pending'
      ORDER BY created_at ASC LIMIT 1
    `, [device_udid]);
    return rows[0] || null;
  },

  async updateCommandStatus(command_uuid, status, result) {
    if (status === 'sent') {
      await pool.query('UPDATE commands SET status = $1, sent_at = NOW() WHERE command_uuid = $2', [status, command_uuid]);
    } else {
      await pool.query('UPDATE commands SET status = $1, result = $2, responded_at = NOW() WHERE command_uuid = $3', [status, result, command_uuid]);
    }
  },

  async getCommandsForDevice(device_udid) {
    const { rows } = await pool.query('SELECT * FROM commands WHERE device_udid = $1 ORDER BY created_at DESC', [device_udid]);
    return rows;
  },

  async close() {
    await pool.end();
  },
};
