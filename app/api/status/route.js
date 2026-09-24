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
    const CACHE_TTL_MS = 90000; // 90 seconds (1.5 minutes)

    // Automatically refresh from Google Health if cache is missing or older than 90s
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

    return Response.json(status);
  } catch (err) {
    return Response.json({ error: `Lookup failed: ${err.message}` }, { status: 500 });
  }
}
