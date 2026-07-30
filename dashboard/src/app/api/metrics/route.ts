import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('http://localhost:9090/metrics', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Metrics server responded ${res.status}`);
    const text = await res.text();

    let throughput = 0;
    let latencySum = 0;
    let latencyCount = 0;
    let threats = 0;
    let rateLimitDrops = 0;

    text.split('\n').forEach((line) => {
      if (line.startsWith('#') || line.trim() === '') return;
      const spaceIdx = line.lastIndexOf(' ');
      const metricName = line.substring(0, spaceIdx);
      const val = parseFloat(line.substring(spaceIdx + 1) || '0');
      if (isNaN(val)) return;

      // Total requests across all status codes
      if (metricName.startsWith('warden_requests_total')) throughput += val;
      // Security blocks (all threat types)
      if (metricName.startsWith('warden_security_blocks_total')) threats += val;
      // Rate limit counter
      if (metricName.startsWith('warden_rate_limit_drops_total')) rateLimitDrops += val;
      // Latency histogram sum & count for average computation
      if (metricName.startsWith('warden_request_duration_seconds_sum')) latencySum += val;
      if (metricName.startsWith('warden_request_duration_seconds_count')) latencyCount += val;
    });

    const latencyMs = latencyCount > 0 ? (latencySum / latencyCount) * 1000 : 0;

    return NextResponse.json({
      throughput,
      latency: latencyMs.toFixed(2),
      threats,
      rateLimitDrops,
      status: 'online',
    });
  } catch {
    return NextResponse.json(
      { throughput: 0, latency: '0.00', threats: 0, rateLimitDrops: 0, status: 'offline' },
      { status: 503 }
    );
  }
}
