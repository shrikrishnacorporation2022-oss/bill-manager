# Bill Management Agent

A personal finance dashboard and automation agent to manage bills, forward emails, and send WhatsApp reminders.

## Features
- **Dashboard**: View active connections (EB, Phone, Insurance) and upcoming bills.
- **Email Agent**: Automatically scans Gmail for bills and forwards them or creates entries in the dashboard.
- **WhatsApp Agent**: Sends reminders for due bills and accepts receipt uploads via WhatsApp.
- **Masters**: Manage Electricity, Phone, Internet, Property Tax, and Insurance details.

## Setup

### 1. Environment Variables
Create a `.env.local` file with the following:

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bills

# Gmail API
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=...

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=my_secret_token
ADMIN_PHONE_NUMBER=919876543210

# Security
CRON_SECRET=my_cron_secret
```

### 2. Installation
```bash
npm install
npm run dev
```

### 3. Deployment (Vercel)
1. Push to GitHub.
2. Import project in Vercel.
3. Add Environment Variables in Vercel Settings.
4. **Cron Job**: Vercel automatically detects `vercel.json` (create one if needed) or you can use the "Cron" tab to hit `/api/cron` daily.

## Usage
- **Add Master**: Go to the dashboard and click "Add New Connection".
- **WhatsApp**: Send "Hi" to your bot number to test.
- **Email**: The agent runs periodically via Cron. You can trigger it manually by visiting `/api/cron` (with auth header).
