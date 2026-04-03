/**
 * prebuild-proof.ts — Generate proof-metrics.json from Cloudflare Analytics.
 *
 * Queries Cloudflare GraphQL Analytics for worldwarwatcher.com traffic,
 * merges with hand-curated rankings, writes to src/data/proof-metrics.json.
 *
 * Usage:
 *   npx tsx scripts/prebuild-proof.ts
 *
 * Environment:
 *   CLOUDFLARE_GLOBAL_API_KEY — required (from ~/.config/env/secrets.env or Vercel)
 *   SKIP_PROOF_FETCH=1        — skip API call, use existing data or write null traffic
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "src", "data", "proof-metrics.json");

const ZONE_ID = "66658e63daf894678c08b970172e863a";
const EMAIL = "contact@tomdimino.com";
const LAUNCH_DATE = "2026-03-07";

// Hand-curated rankings (update when rankings shift)
const RANKINGS = {
  worldwarwatcher: [
    { platform: "Google", rank: 1, label: "#1", verifyUrl: "https://www.google.com/search?q=World+War+Watcher" },
    { platform: "Bing", rank: 1, label: "#1", verifyUrl: "https://www.bing.com/search?q=World+War+Watcher" },
    { platform: "Perplexity", rank: 0, label: "Cited", verifyUrl: "https://www.perplexity.ai/search?q=World+War+Watcher" },
    { platform: "ChatGPT", rank: 0, label: "Cited", verifyUrl: null },
  ],
  minoanmystery: [
    { platform: "Google", rank: 8, label: "#8", verifyUrl: "https://www.google.com/search?q=minoanmystery.org" },
    { platform: "Bing", rank: 3, label: "#3", verifyUrl: "https://www.bing.com/search?q=minoanmystery.org" },
    { platform: "Perplexity", rank: 0, label: "Cited", verifyUrl: "https://www.perplexity.ai/search?q=minoanmystery.org" },
    { platform: "Claude", rank: 0, label: "Cited", verifyUrl: null },
  ],
};

interface DayRow {
  date: string;
  pageViews: number;
  requests: number;
  uniques: number;
}

async function fetchTraffic(): Promise<DayRow[]> {
  const apiKey = process.env.CLOUDFLARE_GLOBAL_API_KEY;
  if (!apiKey) {
    // Try reading from secrets.env
    const secretsPath = join(process.env.HOME || "~", ".config", "env", "secrets.env");
    if (existsSync(secretsPath)) {
      const content = readFileSync(secretsPath, "utf-8");
      const match = content.match(/CLOUDFLARE_GLOBAL_API_KEY=["']?([^"'\n]+)/);
      if (match) {
        process.env.CLOUDFLARE_GLOBAL_API_KEY = match[1];
        return fetchTrafficWithKey(match[1]);
      }
    }
    throw new Error("CLOUDFLARE_GLOBAL_API_KEY not found");
  }
  return fetchTrafficWithKey(apiKey);
}

async function fetchTrafficWithKey(apiKey: string): Promise<DayRow[]> {
  const today = new Date().toISOString().split("T")[0];
  const query = `query {
    viewer {
      zones(filter: {zoneTag: "${ZONE_ID}"}) {
        httpRequests1dGroups(limit: 60, filter: {date_geq: "${LAUNCH_DATE}", date_leq: "${today}"}) {
          dimensions { date }
          sum { requests pageViews }
          uniq { uniques }
        }
      }
    }
  }`;

  const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "X-Auth-Email": EMAIL,
      "X-Auth-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!resp.ok) throw new Error(`Cloudflare API: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors)}`);

  const rows = data.data.viewer.zones[0].httpRequests1dGroups;
  return rows
    .map((r: any) => ({
      date: r.dimensions.date,
      pageViews: r.sum.pageViews,
      requests: r.sum.requests,
      uniques: r.uniq.uniques,
    }))
    .sort((a: DayRow, b: DayRow) => a.date.localeCompare(b.date));
}

function buildMetrics(days: DayRow[]) {
  if (days.length === 0) return null;

  const totalPV = days.reduce((s, d) => s + d.pageViews, 0);
  const totalUniq = days.reduce((s, d) => s + d.uniques, 0);
  const peak = days.reduce((best, d) => (d.uniques > best.uniques ? d : best), days[0]);
  const sparkline = days.slice(-14).map((d) => d.uniques);

  return {
    uniqueVisitors: totalUniq,
    pageViews: totalPV,
    peakDayUniques: peak.uniques,
    peakDate: peak.date,
    daysCounted: days.length,
    periodStart: days[0].date,
    periodEnd: days[days.length - 1].date,
    dailyAvgUniques: days.length > 0 ? Math.round(totalUniq / days.length) : 0,
    sparkline,
  };
}

async function main() {
  const skip = process.env.SKIP_PROOF_FETCH === "1";

  let traffic = null;
  if (!skip) {
    try {
      const days = await fetchTraffic();
      traffic = buildMetrics(days);
      console.log(`[prebuild-proof] Fetched ${days.length} days: ${traffic.uniqueVisitors} uniques, ${traffic.pageViews} PV`);
    } catch (err: any) {
      console.warn(`[prebuild-proof] API fetch failed: ${err.message}`);
      // Try to keep existing data
      if (existsSync(OUTPUT)) {
        console.warn("[prebuild-proof] Keeping existing proof-metrics.json");
        return;
      }
      console.warn("[prebuild-proof] No existing data — writing null traffic");
    }
  } else {
    console.log("[prebuild-proof] SKIP_PROOF_FETCH=1 — skipping API call");
    if (existsSync(OUTPUT)) {
      console.log("[prebuild-proof] Keeping existing proof-metrics.json");
      return;
    }
    console.warn("[prebuild-proof] No existing data — writing null traffic");
  }

  // Check staleness warning
  if (traffic && existsSync(OUTPUT)) {
    try {
      const existing = JSON.parse(readFileSync(OUTPUT, "utf-8"));
      const existingDate = new Date(existing.generated);
      const daysSinceUpdate = (Date.now() - existingDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 14) {
        console.warn(`[prebuild-proof] WARNING: Previous data is ${Math.round(daysSinceUpdate)} days old`);
      }
    } catch {}
  }

  const output = {
    generated: new Date().toISOString(),
    sites: [
      {
        id: "worldwarwatcher",
        name: "worldwarwatcher.com",
        url: "https://worldwarwatcher.com",
        color: "#2dd4bf",
        badge: null,
        rankings: RANKINGS.worldwarwatcher,
        traffic,
        socialProof: {
          platform: "r/dataisbeautiful",
          note: "Helped drive 11K uniques in first month",
        },
      },
      {
        id: "minoanmystery",
        name: "minoanmystery.org",
        url: "https://minoanmystery.org",
        color: "#9b59b6",
        badge: "This site",
        rankings: RANKINGS.minoanmystery,
        traffic: null,
        socialProof: null,
      },
    ],
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`[prebuild-proof] Written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(`[prebuild-proof] Fatal: ${err.message}`);
  process.exit(1);
});
