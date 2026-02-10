# MDM Server

Simple MDM server and web app for iPhone management. Supports device enrollment, push notifications, lost mode, and unenrollment.

## Features

- **Device Enrollment** — iPhones enroll by installing an MDM profile via Safari
- **Push Notifications** — Send a lock screen message to enrolled devices
- **Lost Mode** — Lock a supervised device with a custom message and phone number
- **Unenroll** — Remotely remove the MDM profile from a device
- **Device Info Query** — Request device details (model, OS, serial number, battery, etc.)

## Project Structure

```
server/
  index.js              # Express entry point
  config.js             # Environment-based configuration
  database.js           # PostgreSQL schema and queries
  routes/
    api.js              # REST API for the web frontend
    mdm.js              # Apple MDM protocol endpoints
    enroll.js           # Enrollment profile download
  services/
    apns.js             # APNs push (mock by default)
    commands.js         # MDM command builder
    profile.js          # .mobileconfig generator
client/
  src/
    App.js              # React app with routing
    components/
      DeviceList.js     # Device dashboard
      DeviceDetail.js   # Device info and actions
      EnrollDevice.js   # Enrollment instructions
    services/
      api.js            # API client
```

---

## Quick Deploy to Render (Free)

The fastest way to get this running on a public HTTPS URL for testing.

### 1. Push to GitHub

Make sure this repo is on GitHub (public or private).

### 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New > Blueprint Instance**
3. Connect your GitHub repo
4. Render auto-detects the `render.yaml` and creates both the web service and PostgreSQL database
5. Click **Apply**

### 3. Set BASE_URL

Once deployed, Render gives you a URL like `https://mdm-server-xxxx.onrender.com`.

Go to your service's **Environment** tab and set:
```
BASE_URL=https://mdm-server-xxxx.onrender.com
```

### 4. Enroll your iPhone

Open `https://mdm-server-xxxx.onrender.com/enroll/profile` in Safari on your iPhone and follow the prompts.

> **Free tier notes:**
> - Server spins down after 15 min of inactivity and takes ~30s to wake up on next request
> - PostgreSQL database persists across deploys (device data is safe)
> - Free PostgreSQL has 1GB storage and expires after 90 days
> - HTTPS is included automatically

---

## Local Development

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (local instance or use a free cloud DB like [Neon](https://neon.tech))

### 1. Set up the database

```bash
# Option A: Local PostgreSQL
createdb mdm
export DATABASE_URL=postgresql://localhost:5432/mdm

# Option B: Use Neon.tech (free hosted PostgreSQL, no install needed)
# Sign up at https://neon.tech, create a project, and copy the connection string
export DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

### 2. Install dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 3. Start the development servers

```bash
npm run dev
```

This starts both:
- **Backend** at `http://localhost:3001`
- **React dev server** at `http://localhost:3000` (proxies API calls to 3001)

Open `http://localhost:3000` in your browser.

### 4. Test the API

```bash
# List devices (should return empty array)
curl http://localhost:3001/api/devices

# Get enrollment info
curl http://localhost:3001/api/enrollment-info

# Download enrollment profile
curl http://localhost:3001/enroll/profile -o enroll.mobileconfig
```

### Local testing with a real iPhone

Apple requires HTTPS for MDM enrollment. Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3001
```

Then set the `BASE_URL` environment variable to the ngrok URL before starting the server:

```bash
BASE_URL=https://abc123.ngrok.io npm run server
```

Open `https://abc123.ngrok.io/enroll/profile` on your iPhone in Safari to enroll.

> **Note:** Local development uses mock APNs by default. The device will enroll and appear in the dashboard, but push notifications won't wake the device. Commands will be delivered when the device next checks in.

---

## Production Deployment

### 1. Apple Developer Account Setup

Before deploying to production, you need:

1. **Apple Push Notification service (APNs) certificate** for MDM
   - Go to [Apple Push Certificates Portal](https://identity.apple.com/pushcert/)
   - Upload a CSR signed with your MDM vendor certificate
   - Download the resulting APNs push certificate

2. **MDM CSR / Vendor Certificate**
   - Apply through the [Apple Enterprise Developer Program](https://developer.apple.com/programs/enterprise/) or use a third-party MDM vendor certificate

3. Export your APNs certificate and private key as PEM files:
   ```bash
   # Export certificate
   openssl x509 -in mdm_push_cert.p12 -out certs/apns-cert.pem

   # Export private key
   openssl pkcs12 -in mdm_push_cert.p12 -nocerts -out certs/apns-key.pem -nodes
   ```

### 2. Build the frontend

```bash
npm run build
```

This creates an optimized production build in `client/build/` which the Express server serves automatically.

### 3. Configure environment variables

Create a `.env` file or set these variables in your deployment environment:

```bash
# Server
PORT=3001
BASE_URL=https://mdm.yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/mdm

# MDM
MDM_TOPIC=com.apple.mgmt.External.YOUR_TOPIC_ID

# APNs (disable mock mode for production)
APNS_MOCK=false
APNS_CERT_PATH=./certs/apns-cert.pem
APNS_KEY_PATH=./certs/apns-key.pem
APNS_PRODUCTION=true
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `BASE_URL` | Public HTTPS URL of your server | `https://your-mdm-server.example.com` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/mdm` |
| `MDM_TOPIC` | APNs topic from your push certificate | `com.apple.mgmt.External.placeholder` |
| `APNS_MOCK` | Set to `false` to enable real APNs | `true` |
| `APNS_CERT_PATH` | Path to APNs certificate PEM | `./certs/apns-cert.pem` |
| `APNS_KEY_PATH` | Path to APNs private key PEM | `./certs/apns-key.pem` |
| `APNS_PRODUCTION` | Use production APNs gateway | `false` |

### 4. Start the server

```bash
NODE_ENV=production node server/index.js
```

Or use a process manager like [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start server/index.js --name mdm-server
```

### 5. HTTPS and reverse proxy

MDM enrollment requires HTTPS. Use a reverse proxy like nginx:

```nginx
server {
    listen 443 ssl;
    server_name mdm.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/mdm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdm.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Profile signing (recommended)

For production, the enrollment profile should be signed with a trusted certificate so iOS doesn't show an "unsigned" warning:

```bash
openssl smime -sign \
  -signer your-signing-cert.pem \
  -inkey your-signing-key.pem \
  -nodetach -outform der \
  -in unsigned-profile.mobileconfig \
  -out signed-profile.mobileconfig
```

---

## Device Enrollment Flow

1. User opens the enrollment URL in Safari on their iPhone
2. iOS downloads the `.mobileconfig` profile
3. User goes to **Settings > General > VPN & Device Management** and installs the profile
4. Device sends `Authenticate` message to the server
5. Device sends `TokenUpdate` with its push token
6. Device appears in the web dashboard as "enrolled"
7. Server can now queue commands and wake the device via APNs

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/devices` | List all devices |
| `GET` | `/api/devices/:udid` | Get device details |
| `GET` | `/api/devices/:udid/commands` | Get command history |
| `POST` | `/api/devices/:udid/notify` | Send push notification |
| `POST` | `/api/devices/:udid/lost-mode` | Enable lost mode |
| `POST` | `/api/devices/:udid/disable-lost-mode` | Disable lost mode |
| `POST` | `/api/devices/:udid/unenroll` | Remove MDM profile |
| `POST` | `/api/devices/:udid/query` | Query device information |
| `GET` | `/api/enrollment-info` | Get enrollment URL |
| `GET` | `/enroll/profile` | Download enrollment profile |
