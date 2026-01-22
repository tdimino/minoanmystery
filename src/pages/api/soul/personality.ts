/**
 * Soul Personality API
 *
 * Returns the soul personality markdown for client-side orchestrator initialization.
 * This enables the Open Souls pattern where the orchestrator runs client-side
 * with full personality context.
 *
 * Query Parameters:
 * - mode=academic: Returns all academic personas (soul, gordon, harrison, astour)
 */

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const mode = url.searchParams.get('mode');

    if (mode === 'academic') {
      // Load academic personas
      const academicDir = path.join(process.cwd(), 'souls', 'minoan', 'academic');

      const [core, gordon, harrison, astour] = await Promise.all([
        fs.promises.readFile(path.join(academicDir, 'soul.md'), 'utf-8'),
        fs.promises.readFile(path.join(academicDir, 'gordon.md'), 'utf-8'),
        fs.promises.readFile(path.join(academicDir, 'harrison.md'), 'utf-8'),
        fs.promises.readFile(path.join(academicDir, 'astour.md'), 'utf-8'),
      ]);

      return new Response(
        JSON.stringify({
          core,
          gordon,
          harrison,
          astour,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        }
      );
    }

    // Default: Load main soul personality
    const personalityPath = path.join(process.cwd(), 'souls', 'minoan', 'soul.md');
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
