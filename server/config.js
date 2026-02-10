module.exports = {
  PORT: process.env.PORT || 3001,
  HOST: process.env.HOST || 'localhost',
  BASE_URL: process.env.BASE_URL || 'https://your-mdm-server.example.com',
  DB_PATH: process.env.DB_PATH || './mdm.db',

  // MDM Configuration
  MDM_TOPIC: process.env.MDM_TOPIC || 'com.apple.mgmt.External.placeholder',
  MDM_IDENTITY: 'MDM Server',

  // APNs Configuration (replace with real values for production)
  APNS: {
    CERT_PATH: process.env.APNS_CERT_PATH || './certs/apns-cert.pem',
    KEY_PATH: process.env.APNS_KEY_PATH || './certs/apns-key.pem',
    PRODUCTION: process.env.APNS_PRODUCTION === 'true',
    MOCK: process.env.APNS_MOCK !== 'false', // mock by default
  },
};
