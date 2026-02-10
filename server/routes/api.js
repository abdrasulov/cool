const express = require('express');
const db = require('../database');
const { buildCommand } = require('../services/commands');
const { sendPushNotification } = require('../services/apns');
const config = require('../config');

const router = express.Router();

// ---------- Devices ----------

/** List all devices */
router.get('/devices', (req, res) => {
  const devices = db.getAllDevices();
  res.json(devices);
});

/** Get single device */
router.get('/devices/:udid', (req, res) => {
  const device = db.getDevice(req.params.udid);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

/** Get commands for a device */
router.get('/devices/:udid/commands', (req, res) => {
  const commands = db.getCommandsForDevice(req.params.udid);
  res.json(commands);
});

// ---------- Actions ----------

/** Send push notification (DeviceLock with message) */
router.post('/devices/:udid/notify', async (req, res) => {
  try {
    const device = db.getDevice(req.params.udid);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.status !== 'enrolled') return res.status(400).json({ error: 'Device is not enrolled' });

    const { message, phoneNumber, pin } = req.body;
    const cmd = buildCommand('SendMessage', { message, phoneNumber, pin });

    db.createCommand({
      command_uuid: cmd.uuid,
      device_udid: device.udid,
      command_type: 'SendMessage',
      payload: cmd.plistPayload,
    });

    // Wake device via APNs
    const pushResult = await sendPushNotification(device.push_token, device.push_magic, device.topic || config.MDM_TOPIC);

    res.json({
      success: true,
      command_uuid: cmd.uuid,
      apns: pushResult,
      message: 'Push notification command queued. Device will receive it on next check-in.',
    });
  } catch (err) {
    console.error('[API Notify Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/** Enable Lost Mode */
router.post('/devices/:udid/lost-mode', async (req, res) => {
  try {
    const device = db.getDevice(req.params.udid);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.status !== 'enrolled') return res.status(400).json({ error: 'Device is not enrolled' });

    const { message, phoneNumber, footnote } = req.body;
    const cmd = buildCommand('EnableLostMode', { message, phoneNumber, footnote });

    db.createCommand({
      command_uuid: cmd.uuid,
      device_udid: device.udid,
      command_type: 'EnableLostMode',
      payload: cmd.plistPayload,
    });

    const pushResult = await sendPushNotification(device.push_token, device.push_magic, device.topic || config.MDM_TOPIC);

    res.json({
      success: true,
      command_uuid: cmd.uuid,
      apns: pushResult,
      message: 'Lost mode command queued.',
    });
  } catch (err) {
    console.error('[API Lost Mode Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/** Disable Lost Mode */
router.post('/devices/:udid/disable-lost-mode', async (req, res) => {
  try {
    const device = db.getDevice(req.params.udid);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const cmd = buildCommand('DisableLostMode');

    db.createCommand({
      command_uuid: cmd.uuid,
      device_udid: device.udid,
      command_type: 'DisableLostMode',
      payload: cmd.plistPayload,
    });

    const pushResult = await sendPushNotification(device.push_token, device.push_magic, device.topic || config.MDM_TOPIC);

    res.json({
      success: true,
      command_uuid: cmd.uuid,
      apns: pushResult,
      message: 'Disable lost mode command queued.',
    });
  } catch (err) {
    console.error('[API Disable Lost Mode Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/** Unenroll device (remove MDM profile) */
router.post('/devices/:udid/unenroll', async (req, res) => {
  try {
    const device = db.getDevice(req.params.udid);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.status !== 'enrolled') return res.status(400).json({ error: 'Device is not enrolled' });

    const cmd = buildCommand('RemoveProfile');

    db.createCommand({
      command_uuid: cmd.uuid,
      device_udid: device.udid,
      command_type: 'RemoveProfile',
      payload: cmd.plistPayload,
    });

    const pushResult = await sendPushNotification(device.push_token, device.push_magic, device.topic || config.MDM_TOPIC);

    // Mark device as unenrolled locally
    db.removeDevice(device.udid);

    res.json({
      success: true,
      command_uuid: cmd.uuid,
      apns: pushResult,
      message: 'Unenroll command queued. Device will remove MDM profile on next check-in.',
    });
  } catch (err) {
    console.error('[API Unenroll Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/** Query device information */
router.post('/devices/:udid/query', async (req, res) => {
  try {
    const device = db.getDevice(req.params.udid);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.status !== 'enrolled') return res.status(400).json({ error: 'Device is not enrolled' });

    const cmd = buildCommand('DeviceInformation');

    db.createCommand({
      command_uuid: cmd.uuid,
      device_udid: device.udid,
      command_type: 'DeviceInformation',
      payload: cmd.plistPayload,
    });

    const pushResult = await sendPushNotification(device.push_token, device.push_magic, device.topic || config.MDM_TOPIC);

    res.json({
      success: true,
      command_uuid: cmd.uuid,
      apns: pushResult,
      message: 'Device information query queued.',
    });
  } catch (err) {
    console.error('[API Query Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/** Get enrollment URL info */
router.get('/enrollment-info', (req, res) => {
  res.json({
    enrollmentUrl: `${config.BASE_URL}/enroll/profile`,
    instructions: 'Open this URL on the iPhone to download and install the enrollment profile.',
  });
});

module.exports = router;
