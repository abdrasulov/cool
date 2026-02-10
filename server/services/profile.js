const plist = require('plist');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate an MDM enrollment profile (.mobileconfig)
 * In production, this must be signed with a trusted certificate.
 */
function generateEnrollmentProfile() {
  const profile = {
    PayloadContent: [
      {
        PayloadType: 'com.apple.mdm',
        PayloadVersion: 1,
        PayloadIdentifier: 'com.mdmserver.mdm',
        PayloadUUID: uuidv4(),
        PayloadDisplayName: 'MDM Server',
        PayloadDescription: 'Enrolls this device in MDM management',
        PayloadOrganization: 'MDM Server',

        // MDM protocol settings
        ServerURL: `${config.BASE_URL}/mdm/server`,
        CheckInURL: `${config.BASE_URL}/mdm/checkin`,
        Topic: config.MDM_TOPIC,
        AccessRights: 8191, // Full access
        CheckOutWhenRemoved: true,
        ServerCapabilities: ['com.apple.mdm.per-user-connections'],

        // Identity - in production, use SCEP or PKCS12
        IdentityCertificateUUID: 'identity-placeholder',
        SignMessage: true,
      },
    ],
    PayloadDisplayName: 'MDM Enrollment',
    PayloadDescription: 'Install this profile to enroll your device in MDM management.',
    PayloadIdentifier: 'com.mdmserver.enrollment',
    PayloadOrganization: 'MDM Server',
    PayloadRemovalDisallowed: false,
    PayloadType: 'Configuration',
    PayloadUUID: uuidv4(),
    PayloadVersion: 1,
  };

  return plist.build(profile);
}

module.exports = { generateEnrollmentProfile };
