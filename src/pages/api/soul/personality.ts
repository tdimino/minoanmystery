/**
 * Soul Personality API
 *
 * Returns the soul personality markdown for client-side orchestrator initialization.
 * This enables the Open Souls pattern where the orchestrator runs client-side
 * with full personality context.
 */

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Load soul personality from souls directory
    const personalityPath = path.join(process.cwd(), 'souls', 'minoan', 'minoan.md');
    const personality = fs.readFileSync(personalityPath, 'utf-8');

    return new Response(JSON.stringify({ personality }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[Soul Personality API] Failed to load personality:', error);

    return new Response(
      JSON.stringify({ error: 'Failed to load soul personality' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
