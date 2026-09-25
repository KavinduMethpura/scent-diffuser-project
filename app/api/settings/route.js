import { NextResponse } from 'next/server';
import { storage } from '../../../lib/storage';

export const dynamic = 'force-dynamic';

// Default scent-to-state mapping matching ScentEngine.cpp
const DEFAULT_CONFIG = {
  elevated: {
    primary: 4,        // Lavender
    secondary: 5,      // Sandalwood
    intensity: 40,
    formulaName: 'Anxiolytic Lavender Blend',
  },
  relaxed: {
    primary: 1,        // Rose
    secondary: 5,      // Sandalwood
    intensity: 20,
    formulaName: 'Relaxation Harmony Blend',
  },
  low_affect: {
    primary: 2,        // Citrus
    secondary: 3,      // Mint
    intensity: 40,
    formulaName: 'Energizing Citrus Uplift',
  },
  neutral: {
    primary: 0,        // None (idle)
    secondary: 0,
    intensity: 0,
    formulaName: 'Idle',
  },
};

const CHANNEL_SCENTS = {
  0: 'None',
  1: 'Rose',
  2: 'Citrus',
  3: 'Peppermint',
  4: 'Lavender',
  5: 'Sandalwood',
  6: 'Eucalyptus',
};

const STORAGE_KEY = 'scent_config';

export async function GET() {
  try {
    let config = await storage.get(STORAGE_KEY);
    if (!config) {
      config = DEFAULT_CONFIG;
    }
    return NextResponse.json({
      ok: true,
      config,
      channelScents: CHANNEL_SCENTS,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid config object.' },
        { status: 400 }
      );
    }

    // Validate each state entry
    const validStates = ['elevated', 'relaxed', 'low_affect', 'neutral'];
    const sanitized = {};

    for (const state of validStates) {
      const entry = config[state];
      if (!entry) {
        sanitized[state] = DEFAULT_CONFIG[state];
        continue;
      }
      sanitized[state] = {
        primary: Math.max(0, Math.min(6, parseInt(entry.primary) || 0)),
        secondary: Math.max(0, Math.min(6, parseInt(entry.secondary) || 0)),
        intensity: Math.max(0, Math.min(100, parseInt(entry.intensity) || 0)),
        formulaName: String(entry.formulaName || DEFAULT_CONFIG[state].formulaName).slice(0, 50),
      };
    }

    await storage.set(STORAGE_KEY, sanitized);

    return NextResponse.json({ ok: true, config: sanitized });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
