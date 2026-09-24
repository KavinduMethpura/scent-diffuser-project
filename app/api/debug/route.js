import { NextResponse } from 'next/server';
import { storage } from '../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const provider = (await storage.get('auth_provider')) || 'google';
    const accessToken = await storage.get('fitbit_access_token');
    const refreshToken = await storage.get('fitbit_refresh_token');

    if (!accessToken) {
      return NextResponse.json({
        ok: false,
        error: 'No access token found in storage. Visit /api/auth/login first.',
      });
    }

    const now = new Date(Date.now() + 60 * 1000);
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filter = `heart_rate.sample_time.physical_time >= "${past24h.toISOString()}" AND heart_rate.sample_time.physical_time < "${now.toISOString()}"`;

    const endpoints = [
      {
        name: 'dataPoints_with_filter',
        url: `https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints?filter=${encodeURIComponent(filter)}&pageSize=50`,
      },
      {
        name: 'dataPoints_no_filter',
        url: 'https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints?pageSize=20',
      },
      {
        name: 'reconcile_with_filter',
        url: `https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints:reconcile?filter=${encodeURIComponent(filter)}&pageSize=50`,
      },
    ];

    const results = {};

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const status = res.status;
        let data;
        try {
          data = await res.json();
        } catch (e) {
          data = await res.text();
        }
        results[ep.name] = {
          status,
          ok: res.ok,
          sampleCount: data?.dataPoints?.length ?? (Array.isArray(data) ? data.length : 0),
          data,
        };
      } catch (err) {
        results[ep.name] = { error: err.message };
      }
    }

    return NextResponse.json({
      provider,
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      tokenPrefix: accessToken ? `${accessToken.slice(0, 10)}...` : null,
      results,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
