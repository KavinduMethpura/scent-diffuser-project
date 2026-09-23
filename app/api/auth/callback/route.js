import { storage } from '../../../../lib/storage';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`OAuth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response('Missing authorization code parameter.', { status: 400 });
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response('Server missing OAuth environment variables in .env.', { status: 500 });
  }

  const isGoogleAuth = clientId.includes('.apps.googleusercontent.com');

  try {
    let tokenUrl;
    let headers;
    let body;

    if (isGoogleAuth) {
      // Google OAuth Token Exchange Endpoint
      tokenUrl = 'https://oauth2.googleapis.com/token';
      headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      });
    } else {
      // Legacy Fitbit Token Exchange Endpoint
      tokenUrl = 'https://api.fitbit.com/oauth2/token';
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers = {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      body = new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      });
    }

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(`Token exchange error (${res.status}): ${JSON.stringify(data, null, 2)}`, { status: 502 });
    }

    // Persist tokens and provider flag
    await storage.set('auth_provider', isGoogleAuth ? 'google' : 'fitbit');
    await storage.set('fitbit_access_token', data.access_token);
    if (data.refresh_token) {
      await storage.set('fitbit_refresh_token', data.refresh_token);
    }

    return new Response(
      `<html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px; background: #0f172a; color: #f8fafc;">
          <h1 style="color: #38bdf8;">&#x2705; ${isGoogleAuth ? 'Google Health' : 'Fitbit'} Connected Successfully!</h1>
          <p style="font-size: 1.1rem; color: #94a3b8;">
            Access and Refresh tokens have been securely saved to storage.
          </p>
          <p style="margin-top: 30px;">
            <a href="/api/cron/poll" style="background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Test Poll Heart Rate &rarr;
            </a>
          </p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    return new Response(`OAuth callback exception: ${err.message}`, { status: 500 });
  }
}
