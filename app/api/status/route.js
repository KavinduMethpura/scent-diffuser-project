import { storage } from '../../../lib/storage';
import { fetchAndComputeStatus } from '../../../lib/healthPoll';

export async function GET(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const expectedKey = process.env.DEVICE_SHARED_KEY;

  if (!expectedKey || key !== expectedKey) {
    return new Response('Unauthorized: Invalid or missing device key.', { status: 401 });
  }

  try {
    let status = await storage.get('latest_status');
    const now = Date.now();
    const CACHE_TTL_MS = 20000; // 20 seconds (matches ESP32 polling rate)

    // Automatically refresh from Google Health if cache is missing or older than 20s
    if (!status || !status.ts || (now - status.ts > CACHE_TTL_MS)) {
      try {
        const fresh = await fetchAndComputeStatus();
        if (fresh && fresh.ok) {
          status = fresh;
        }
      } catch (pollErr) {
        console.warn('[STATUS] On-demand refresh error, serving last cached:', pollErr.message);
      }
    }

    if (!status) {
      return Response.json({
        state: 'neutral',
        bpm: null,
        baseline: null,
        deviation: 0,
        ts: Date.now(),
        note: 'No status cached yet. Waiting for initial sync.',
      });
    }

    // Attach scent config so ESP32 knows which channels to activate
    let scentConfig = await storage.get('scent_config');
    if (!scentConfig) {
      scentConfig = {
        elevated: { primary: 4, secondary: 5, intensity: 40 },
        relaxed: { primary: 1, secondary: 5, intensity: 20 },
        low_affect: { primary: 2, secondary: 3, intensity: 40 },
        neutral: { primary: 0, secondary: 0, intensity: 0 },
      };
    }

    const responsePayload = typeof status === 'object' ? { ...status } : status;
    if (responsePayload && typeof responsePayload === 'object') {
      responsePayload.scentConfig = scentConfig;
    }

    return Response.json(responsePayload);
  } catch (err) {
    return Response.json({ error: `Lookup failed: ${err.message}` }, { status: 500 });
  }
}
