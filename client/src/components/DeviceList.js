import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDevices } from '../services/api';

function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading devices...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Devices</h1>
        <button className="btn btn-secondary" onClick={loadDevices}>
          Refresh
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="empty-state">
          <h3>No devices enrolled</h3>
          <p>Go to the <Link to="/enroll">Enroll</Link> page to add a device.</p>
        </div>
      ) : (
        <div className="device-grid">
          {devices.map((device) => (
            <Link
              key={device.udid}
              to={`/devices/${encodeURIComponent(device.udid)}`}
              className="device-item"
            >
              <div className="device-info">
                <h3>{device.device_name || 'Unknown Device'}</h3>
                <p>
                  {device.model || 'Unknown Model'} &middot; {device.os_version || 'Unknown OS'} &middot; {device.udid.substring(0, 12)}...
                </p>
              </div>
              <span className={`device-status ${device.status}`}>
                {device.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default DeviceList;
