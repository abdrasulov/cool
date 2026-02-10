const express = require('express');
const { generateEnrollmentProfile } = require('../services/profile');

const router = express.Router();

/**
 * Serve the enrollment profile.
 * User navigates to this URL on their iPhone to begin enrollment.
 */
router.get('/profile', (req, res) => {
  try {
    const profile = generateEnrollmentProfile();
    res.set({
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="enroll.mobileconfig"',
    });
    res.send(profile);
  } catch (err) {
    console.error('[Enroll Error]', err);
    res.status(500).json({ error: 'Failed to generate enrollment profile' });
  }
});

module.exports = router;
