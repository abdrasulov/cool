import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDevice,
  getDeviceCommands,
  sendNotification,
  enableLostMode,
  disableLostMode,
  unenrollDevice,
  queryDevice,
} from '../services/api';

function DeviceDetail() {
  const { udid } = useParams();
  const [device, setDevice] = useState(null);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [dev, cmds] = await Promise.all([
        getDevice(udid),
        getDeviceCommands(udid),
      ]);
      setDevice(dev);
      setCommands(cmds);
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [udid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showAlert(type, text) {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 5000);
  }

  async function handleAction(action) {
    try {
      let result;
      switch (action) {
        case 'notify':
          result = await sendNotification(udid, {
            message: formData.message || 'Hello from MDM Server',
            phoneNumber: formData.phoneNumber || '',
            pin: formData.pin || '',
          });
          break;
        case 'lost-mode':
          result = await enableLostMode(udid, {
            message: formData.lostMessage || 'This device has been marked as lost.',
            phoneNumber: formData.lostPhone || '',
            footnote: formData.lostFootnote || 'Contact IT department',
          });
          break;
        case 'disable-lost-mode':
          result = await disableLostMode(udid);
          break;
        case 'unenroll':
          result = await unenrollDevice(udid);
          break;
        case 'query':
          result = await queryDevice(udid);
          break;
        default:
          return;
      }
      showAlert('success', result.message);
      setModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      showAlert('error', err.message);
    }
  }

  if (loading) return <div className="loading">Loading device...</div>;
  if (!device) return <div className="empty-state"><h3>Device not found</h3></div>;

  const isEnrolled = device.status === 'enrolled';

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Devices</Link>

      <div className="detail-header">
        <h1>{device.device_name || 'Unknown Device'}</h1>
        <span className={`device-status ${device.status}`}>{device.status}</span>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.text}</div>
      )}

      {/* Device Info */}
      <div className="card">
        <h2>Device Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <div className="label">UDID</div>
            <div className="value">{device.udid}</div>
          </div>
          <div className="info-item">
            <div className="label">Serial Number</div>
            <div className="value">{device.serial_number || 'N/A'}</div>
          </div>
          <div className="info-item">
            <div className="label">Model</div>
            <div className="value">{device.model || 'N/A'}</div>
          </div>
          <div className="info-item">
            <div className="label">OS Version</div>
            <div className="value">{device.os_version || 'N/A'}</div>
          </div>
          <div className="info-item">
            <div className="label">Enrolled</div>
            <div className="value">{device.enrolled_at ? new Date(device.enrolled_at).toLocaleString() : 'N/A'}</div>
          </div>
          <div className="info-item">
            <div className="label">Last Seen</div>
            <div className="value">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isEnrolled && (
        <div className="card">
          <h2>Actions</h2>
          <div className="actions-grid">
            <button className="btn btn-primary" onClick={() => setModal('notify')}>
              Send Notification
            </button>
            <button className="btn btn-warning" onClick={() => setModal('lost-mode')}>
              Enable Lost Mode
            </button>
            <button className="btn btn-secondary" onClick={() => handleAction('disable-lost-mode')}>
              Disable Lost Mode
            </button>
            <button className="btn btn-secondary" onClick={() => handleAction('query')}>
              Query Device Info
            </button>
            <button className="btn btn-danger" onClick={() => setModal('unenroll')}>
              Unenroll Device
            </button>
          </div>
        </div>
      )}

      {/* Command History */}
      <div className="card">
        <h2>Command History</h2>
        {commands.length === 0 ? (
          <p style={{ color: '#6e6e73', fontSize: 14 }}>No commands sent yet.</p>
        ) : (
          commands.map((cmd) => (
            <div key={cmd.command_uuid} className="command-item">
              <div>
                <div className="command-type">{cmd.command_type}</div>
                <div className="command-time">
                  {new Date(cmd.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`command-status ${cmd.status}`}>{cmd.status}</span>
            </div>
          ))
        )}
      </div>

      {/* Send Notification Modal */}
      {modal === 'notify' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Notification</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16 }}>
              This sends a DeviceLock command with a message displayed on the lock screen.
            </p>
            <div className="form-group">
              <label>Message</label>
              <textarea
                rows={3}
                placeholder="Hello from MDM Server"
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone Number (optional)</label>
              <input
                type="text"
                placeholder="+1234567890"
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleAction('notify')}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Mode Modal */}
      {modal === 'lost-mode' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enable Lost Mode</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16 }}>
              Lost mode locks the device and displays a message. Requires a supervised device.
            </p>
            <div className="form-group">
              <label>Message</label>
              <textarea
                rows={3}
                placeholder="This device has been marked as lost."
                value={formData.lostMessage || ''}
                onChange={(e) => setFormData({ ...formData, lostMessage: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="+1234567890"
                value={formData.lostPhone || ''}
                onChange={(e) => setFormData({ ...formData, lostPhone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Footnote</label>
              <input
                type="text"
                placeholder="Contact IT department"
                value={formData.lostFootnote || ''}
                onChange={(e) => setFormData({ ...formData, lostFootnote: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-warning" onClick={() => handleAction('lost-mode')}>Enable</button>
            </div>
          </div>
        </div>
      )}

      {/* Unenroll Confirmation Modal */}
      {modal === 'unenroll' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Unenroll Device</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>
              Are you sure you want to unenroll <strong>{device.device_name || device.udid}</strong>?
              This will remove the MDM profile from the device.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleAction('unenroll')}>Unenroll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceDetail;
