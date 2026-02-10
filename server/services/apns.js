const config = require('../config');

/**
 * Mock APNs service.
 * In production, replace with real APNs HTTP/2 push using the MDM push certificate.
 *
 * To use real APNs:
 *   1. Obtain an MDM push certificate from Apple (via Apple Push Certificates Portal)
 *   2. Set APNS_MOCK=false, APNS_CERT_PATH, APNS_KEY_PATH environment variables
 *   3. Replace sendPushNotification with a real HTTP/2 APNs client
 */

async function sendPushNotification(pushToken, pushMagic, topic) {
  if (config.APNS.MOCK) {
    console.log('[APNs MOCK] Push notification sent:');
    console.log(`  Token: ${pushToken}`);
    console.log(`  PushMagic: ${pushMagic}`);
    console.log(`  Topic: ${topic}`);
    return {
      success: true,
      mock: true,
      message: 'Mock push notification sent. Device will not actually wake up.',
    };
  }

  // ---- Real APNs implementation placeholder ----
  // Use HTTP/2 client to connect to api.push.apple.com (production)
  // or api.sandbox.push.apple.com (development)
  //
  // const http2 = require('http2');
  // const fs = require('fs');
  //
  // const client = http2.connect('https://api.push.apple.com', {
  //   cert: fs.readFileSync(config.APNS.CERT_PATH),
  //   key: fs.readFileSync(config.APNS.KEY_PATH),
  // });
  //
  // const headers = {
  //   ':method': 'POST',
  //   ':path': `/3/device/${pushToken}`,
  //   'apns-topic': topic,
  // };
  //
  // const body = JSON.stringify({ mdm: pushMagic });
  //
  // return new Promise((resolve, reject) => {
  //   const req = client.request(headers);
  //   req.on('response', (headers) => {
  //     if (headers[':status'] === 200) resolve({ success: true });
  //     else reject(new Error(`APNs error: ${headers[':status']}`));
  //   });
  //   req.write(body);
  //   req.end();
  // });

  throw new Error('Real APNs not configured. Set APNS_MOCK=false and provide certificates.');
}

module.exports = { sendPushNotification };
