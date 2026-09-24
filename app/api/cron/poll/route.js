import { fetchAndComputeStatus } from '../../../../lib/healthPoll';

export async function GET() {
  const result = await fetchAndComputeStatus();
  const statusCode = result.ok ? 200 : (result.error?.includes('Not authenticated') ? 401 : 502);
  return Response.json(result, { status: statusCode });
}
