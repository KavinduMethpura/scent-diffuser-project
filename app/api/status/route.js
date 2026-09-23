import { storage } from '../../../lib/storage';

export async function GET(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const expectedKey = process.env.DEVICE_SHARED_KEY;

  if (!expectedKey || key !== expectedKey) {
    return new Response('Unauthorized: Invalid or missing device key.', { status: 401 });
  }

  try {
    const status = await storage.get('latest_status');
    if (!status) {
      return Response.json({
        state: 'neutral',
        bpm: null,
        baseline: null,
        deviation: 0,
        ts: Date.now(),
        note: 'No status cached yet. Waiting for cron poll.',
      });
    }
    return Response.json(status);
  } catch (err) {
    return Response.json({ error: `KV lookup failed: ${err.message}` }, { status: 500 });
  }
}
