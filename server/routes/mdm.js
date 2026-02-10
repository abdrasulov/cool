const express = require('express');
const plist = require('plist');
const db = require('../database');
const { buildCommand } = require('../services/commands');
const { sendPushNotification } = require('../services/apns');

const router = express.Router();

/**
 * MDM Check-In endpoint
 * Handles: Authenticate, TokenUpdate, CheckOut
 */
router.put('/checkin', express.raw({ type: 'application/x-apple-aspen-mdm-checkin' }), (req, res) => {
  try {
    let body;
    try {
      body = plist.parse(req.body.toString());
    } catch {
      // Try as regular text if raw parse fails
      body = plist.parse(req.body);
    }

    const messageType = body.MessageType;
    const udid = body.UDID;

    console.log(`[MDM Check-In] ${messageType} from ${udid}`);

    switch (messageType) {
      case 'Authenticate': {
        // First message from device during enrollment
        db.upsertDevice({
          udid,
          serial_number: body.SerialNumber || null,
          device_name: body.DeviceName || null,
          model: body.Model || null,
          os_version: body.OSVersion || null,
          topic: body.Topic || null,
        });
        console.log(`[MDM] Device authenticated: ${udid}`);
        res.status(200).end();
        break;
      }

      case 'TokenUpdate': {
        // Device sends its push token
        db.upsertDevice({
          udid,
          push_token: body.Token ? body.Token.toString('base64') : null,
          push_magic: body.PushMagic || null,
          unlock_token: body.UnlockToken ? body.UnlockToken.toString('base64') : null,
          topic: body.Topic || null,
        });
        console.log(`[MDM] Token updated for: ${udid}`);
        res.status(200).end();
        break;
      }

      case 'CheckOut': {
        // Device is being unenrolled
        db.updateDeviceStatus(udid, 'unenrolled');
        console.log(`[MDM] Device checked out: ${udid}`);
        res.status(200).end();
        break;
      }

      default:
        console.log(`[MDM] Unknown message type: ${messageType}`);
        res.status(400).send('Unknown message type');
    }
  } catch (err) {
    console.error('[MDM Check-In Error]', err);
    res.status(500).send('Internal server error');
  }
});

/**
 * MDM Server endpoint
 * Device contacts this URL after receiving a push notification.
 * Responds with the next pending command or empty (200) if none.
 */
router.put('/server', express.raw({ type: () => true }), (req, res) => {
  try {
    let body;
    try {
      body = plist.parse(req.body.toString());
    } catch {
      body = {};
    }

    const udid = body.UDID;
    const status = body.Status;
    const commandUUID = body.CommandUUID;

    console.log(`[MDM Server] Response from ${udid}: Status=${status}, CommandUUID=${commandUUID}`);

    // Update device last seen
    if (udid) {
      db.upsertDevice({ udid });
    }

    // If we received a response to a previous command, record it
    if (commandUUID && status) {
      const resultStatus = status === 'Acknowledged' ? 'acknowledged'
        : status === 'Error' ? 'error'
        : status === 'CommandFormatError' ? 'format_error'
        : status;
      db.updateCommandStatus(commandUUID, resultStatus, JSON.stringify(body));
    }

    // Check if there's a pending command for this device
    if (udid) {
      const nextCommand = db.getNextPendingCommand(udid);
      if (nextCommand) {
        db.updateCommandStatus(nextCommand.command_uuid, 'sent');
        console.log(`[MDM] Sending command ${nextCommand.command_type} to ${udid}`);
        res.set('Content-Type', 'application/xml');
        res.status(200).send(nextCommand.payload);
        return;
      }
    }

    // No pending commands
    res.status(200).end();
  } catch (err) {
    console.error('[MDM Server Error]', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
