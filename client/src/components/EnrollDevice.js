import React, { useState, useEffect } from 'react';
import { getEnrollmentInfo } from '../services/api';

function EnrollDevice() {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getEnrollmentInfo().then(setInfo).catch(console.error);
  }, []);

  function copyUrl() {
    if (info) {
      navigator.clipboard.writeText(info.enrollmentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Enroll Device</h1>
      </div>

      <div className="card enroll-card">
        <h2>iPhone Enrollment</h2>
        <p>Open the enrollment URL on your iPhone's Safari browser to install the MDM profile.</p>

        {info && (
          <>
            <div className="enroll-url">{info.enrollmentUrl}</div>
            <button className="btn btn-primary" onClick={copyUrl}>
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </>
        )}

        <ol className="steps">
          <li>1. Open the enrollment URL on your iPhone in Safari</li>
          <li>2. When prompted, tap "Allow" to download the profile</li>
          <li>3. Go to Settings &gt; General &gt; VPN & Device Management</li>
          <li>4. Tap the MDM Server profile and tap "Install"</li>
          <li>5. Enter your passcode and confirm installation</li>
          <li>6. The device will appear in the Devices list</li>
        </ol>
      </div>

      <div className="card">
        <h2>Important Notes</h2>
        <div className="alert alert-info">
          <strong>HTTPS Required:</strong> Apple requires MDM enrollment profiles to be served over HTTPS.
          For local testing, use a tool like ngrok to create a secure tunnel.
        </div>
        <div className="alert alert-info" style={{ marginTop: 8 }}>
          <strong>Mock Mode:</strong> The server is currently running with mock APNs.
          Push notifications won't actually reach devices. Configure real APNs certificates for production use.
        </div>
      </div>
    </div>
  );
}

export default EnrollDevice;
