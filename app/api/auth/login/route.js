export async function GET() {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('FITBIT_CLIENT_ID or FITBIT_REDIRECT_URI not configured in .env', { status: 500 });
  }

  // Detect whether this is a Google Cloud OAuth Client ID or legacy Fitbit Client ID
  const isGoogleAuth = clientId.includes('.apps.googleusercontent.com');

  if (isGoogleAuth) {
    // Official Google Health API OAuth 2.0 Authorization Endpoint
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: [
        'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
        'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
        'openid',
        'email',
        'profile',
      ].join(' '),
      access_type: 'offline', // Mandatory to receive a refresh_token
      prompt: 'consent',      // Force consent screen on first run to ensure refresh token is returned
    });

    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } else {
    // Legacy Fitbit Authorization Endpoint
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'heartrate',
    });

    return Response.redirect(`https://www.fitbit.com/oauth2/authorize?${params.toString()}`);
  }
}
