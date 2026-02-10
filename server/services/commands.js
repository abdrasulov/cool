const plist = require('plist');
const { v4: uuidv4 } = require('uuid');

/**
 * Build MDM command payloads.
 * Reference: Apple MDM Protocol Reference
 */

function buildCommand(type, params = {}) {
  const commandUUID = uuidv4();

  const commands = {
    // Device Information query
    DeviceInformation: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'DeviceInformation',
        Queries: [
          'UDID', 'DeviceName', 'OSVersion', 'BuildVersion',
          'ModelName', 'Model', 'SerialNumber', 'BatteryLevel',
          'ICCID', 'IMEI', 'IsSupervised',
        ],
      },
    },

    // Push notification (DeviceLock with message as a visible notification)
    SendMessage: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'DeviceLock',
        Message: params.message || 'Message from MDM Server',
        PhoneNumber: params.phoneNumber || '',
        PIN: params.pin || '',
      },
    },

    // Enable Lost Mode (supervised devices only)
    EnableLostMode: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'EnableLostMode',
        Message: params.message || 'This device has been marked as lost.',
        PhoneNumber: params.phoneNumber || '',
        Footnote: params.footnote || 'Contact IT department',
      },
    },

    // Disable Lost Mode
    DisableLostMode: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'DisableLostMode',
      },
    },

    // Device Lock
    DeviceLock: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'DeviceLock',
        PIN: params.pin || '',
      },
    },

    // Remove MDM Profile (unenroll)
    RemoveProfile: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'RemoveProfile',
        Identifier: 'com.mdmserver.enrollment',
      },
    },

    // Erase Device
    EraseDevice: {
      CommandUUID: commandUUID,
      Command: {
        RequestType: 'EraseDevice',
      },
    },
  };

  const command = commands[type];
  if (!command) {
    throw new Error(`Unknown command type: ${type}`);
  }

  return {
    uuid: commandUUID,
    type,
    plistPayload: plist.build(command),
    raw: command,
  };
}

module.exports = { buildCommand };
