const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./database');

const mdmRoutes = require('./routes/mdm');
const enrollRoutes = require('./routes/enroll');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// MDM protocol routes
app.use('/mdm', mdmRoutes);

// Enrollment routes
app.use('/enroll', enrollRoutes);

// Serve React frontend in production
const clientBuild = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// Initialize database then start server
db.init()
  .then(() => {
    app.listen(config.PORT, () => {
      console.log(`MDM Server running on port ${config.PORT}`);
      console.log(`API:        http://localhost:${config.PORT}/api`);
      console.log(`Enrollment: http://localhost:${config.PORT}/enroll/profile`);
      console.log(`APNs Mock:  ${config.APNS.MOCK ? 'ENABLED' : 'DISABLED'}`);
      console.log(`Database:   PostgreSQL`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
