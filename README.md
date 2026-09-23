# Scent Diffuser Web App (Vercel + Next.js)

Next.js application that handles Fitbit OAuth 2.0 authorization, runs a scheduled Vercel Cron job to poll Intraday Heart Rate data, computes rolling baseline heart rate deviation, and serves a cached affect state to the ESP32-S3 over WiFi.

---

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and populate your secrets:
   ```bash
   cp .env.example .env.local
   ```

3. **Run local dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying to Vercel

1. **Link to Vercel:**
   ```bash
   vercel
   ```
2. **Attach Vercel KV:**
   In your Vercel project dashboard, navigate to **Storage**, create a **KV (Redis)** database, and link it to this project.
3. **Set Environment Variables:**
   Under **Project Settings** -> **Environment Variables**:
   - `FITBIT_CLIENT_ID`
   - `FITBIT_CLIENT_SECRET`
   - `FITBIT_REDIRECT_URI` (e.g. `https://your-project.vercel.app/api/auth/callback`)
   - `DEVICE_SHARED_KEY` (a random token shared with the ESP32 firmware)
4. **Authorize Fitbit:**
   Visit `https://your-project.vercel.app/api/auth/login` once in your browser and approve heart rate access.
