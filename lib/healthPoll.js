import { storage } from './storage';

async function refreshAccessToken(provider) {
  const refreshToken = await storage.get('fitbit_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token found. Complete /api/auth/login first.');
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;

  let tokenUrl;
  let headers;
  let body;

  if (provider === 'google') {
    tokenUrl = 'https://oauth2.googleapis.com/token';
    headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  } else {
    tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers = {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${JSON.stringify(data)}`);
  }

  await storage.set('fitbit_access_token', data.access_token);
  if (data.refresh_token) {
    await storage.set('fitbit_refresh_token', data.refresh_token);
  }

  return data.access_token;
}

function extractBpm(point) {
  if (!point) return null;
  const hr = point.heartRate || point.heart_rate || point;
  const rawVal = hr.beatsPerMinute ?? hr.beats_per_minute ?? hr.value ?? hr.bpm;
  if (rawVal === undefined || rawVal === null) return null;
  const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
  return !isNaN(num) && num > 30 && num < 250 ? num : null;
}

function getSampleTime(point) {
  const hr = point.heartRate || point.heart_rate || point;
  const st = hr.sampleTime || hr.sample_time || point.sampleTime || point.sample_time;
  const pt = st?.physicalTime || st?.physical_time || point.startTime || point.endTime;
  if (pt) {
    const t = new Date(pt).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

async function fetchGoogleHeartRate(accessToken) {
  const now = new Date(Date.now() + 60 * 1000);
  const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filter = `heart_rate.sample_time.physical_time >= "${past24h.toISOString()}" AND heart_rate.sample_time.physical_time < "${now.toISOString()}"`;

  // Try endpoints in priority order: latest unfiltered list -> filtered list -> reconcile
  const urls = [
    'https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints?pageSize=50',
    `https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints?filter=${encodeURIComponent(filter)}&pageSize=100`,
    `https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints:reconcile?filter=${encodeURIComponent(filter)}&pageSize=100`,
  ];

  let lastStatus = 200;
  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      lastStatus = res.status;
      if (res.status === 401) {
        return { status: 401, points: [] };
      }
      if (res.ok) {
        const data = await res.json();
        const points = data.dataPoints || data.points || [];
        if (Array.isArray(points) && points.length > 0) {
          return { status: 200, points };
        }
      } else {
        lastError = await res.text();
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  return { status: lastStatus, points: [], error: lastError };
}

export async function fetchAndComputeStatus() {
  const provider = (await storage.get('auth_provider')) || 'google';
  let accessToken = await storage.get('fitbit_access_token');

  if (!accessToken) {
    return { ok: false, error: 'Not authenticated. Visit /api/auth/login first.' };
  }

  let currentBpm = null;
  let bpmSeries = [];

  if (provider === 'google') {
    let result = await fetchGoogleHeartRate(accessToken);

    if (result.status === 401) {
      try {
        accessToken = await refreshAccessToken('google');
        result = await fetchGoogleHeartRate(accessToken);
      } catch (refreshErr) {
        return { ok: false, error: refreshErr.message };
      }
    }

    if (result.error && result.points.length === 0 && result.status !== 200) {
      return { ok: false, error: `Google Health API (${result.status}): ${result.error}` };
    }

    const points = result.points || [];
    const sortedPoints = [...points].sort((a, b) => getSampleTime(a) - getSampleTime(b));
    bpmSeries = sortedPoints.map(extractBpm).filter((bpm) => bpm !== null);

    if (bpmSeries.length > 0) {
      currentBpm = bpmSeries[bpmSeries.length - 1];
    }
  } else {
    const today = new Date().toISOString().split('T')[0];
    const intradayUrl = `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1min.json`;

    let res = await fetch(intradayUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      try {
        accessToken = await refreshAccessToken('fitbit');
        res = await fetch(intradayUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (refreshErr) {
        return { ok: false, error: refreshErr.message };
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Fitbit API (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const series = data['activities-heart-intraday']?.dataset ?? [];
    bpmSeries = series.map((p) => p.value);

    if (bpmSeries.length > 0) {
      currentBpm = bpmSeries[bpmSeries.length - 1];
    }
  }

  // Handle case when watch has no records today yet
  if (bpmSeries.length === 0 || currentBpm === null) {
    const fallbackStatus = {
      state: 'neutral',
      bpm: null,
      baseline: null,
      deviation: 0,
      ts: Date.now(),
      note: 'Authenticated! Waiting for watch to sync heart rate records for today.',
    };
    await storage.set('latest_status', fallbackStatus);
    return { ok: true, ...fallbackStatus };
  }

  // Compute 10-minute rolling baseline
  const recentWindow = bpmSeries.slice(-10);
  const baseline = recentWindow.reduce((sum, val) => sum + val, 0) / recentWindow.length;
  const deviation = currentBpm - baseline;

  // Classify affect state
  let state = 'neutral';
  if (deviation > 8.0) {
    state = 'elevated';
  } else if (deviation < -5.0) {
    state = 'relaxed';
  }

  const statusPayload = {
    bpm: currentBpm,
    baseline: parseFloat(baseline.toFixed(1)),
    deviation: parseFloat(deviation.toFixed(1)),
    state,
    ts: Date.now(),
  };

  await storage.set('latest_status', statusPayload);
  return { ok: true, ...statusPayload };
}
