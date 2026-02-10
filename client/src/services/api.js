const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function getDevices() {
  return request('/devices');
}

export function getDevice(udid) {
  return request(`/devices/${encodeURIComponent(udid)}`);
}

export function getDeviceCommands(udid) {
  return request(`/devices/${encodeURIComponent(udid)}/commands`);
}

export function sendNotification(udid, { message, phoneNumber, pin }) {
  return request(`/devices/${encodeURIComponent(udid)}/notify`, {
    method: 'POST',
    body: JSON.stringify({ message, phoneNumber, pin }),
  });
}

export function enableLostMode(udid, { message, phoneNumber, footnote }) {
  return request(`/devices/${encodeURIComponent(udid)}/lost-mode`, {
    method: 'POST',
    body: JSON.stringify({ message, phoneNumber, footnote }),
  });
}

export function disableLostMode(udid) {
  return request(`/devices/${encodeURIComponent(udid)}/disable-lost-mode`, {
    method: 'POST',
  });
}

export function unenrollDevice(udid) {
  return request(`/devices/${encodeURIComponent(udid)}/unenroll`, {
    method: 'POST',
  });
}

export function queryDevice(udid) {
  return request(`/devices/${encodeURIComponent(udid)}/query`, {
    method: 'POST',
  });
}

export function getEnrollmentInfo() {
  return request('/enrollment-info');
}
