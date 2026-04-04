import type { VercelRequest, VercelResponse } from "@vercel/node";
import { INVIDIOUS_INSTANCES, INVIDIOUS_REQUEST_TIMEOUT, INVIDIOUS_HEADERS } from "./lib/invidious.js";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://sonic-bloom-player.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Rate limiting
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const rateKey = `yt-stream:${clientIp}`;
  const rateResult = checkRateLimit(rateKey, defaultRateLimits["/api/yt-stream"]);
  
  if (!rateResult.allowed) {
    const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
    Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  
  const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
  Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  const tryInstance = async (instance: string): Promise<{ audioUrl: string; source: string } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), INVIDIOUS_REQUEST_TIMEOUT);
      
      const invRes = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
        {
          signal: controller.signal,
          headers: INVIDIOUS_HEADERS,
        }
      );
      
      clearTimeout(timeout);
      
      if (invRes.ok) {
        const invData = await invRes.json().catch(() => null);
        if (!invData?.adaptiveFormats) return null;
        
        const audioFormats = invData.adaptiveFormats.filter(
          (f: { type: string }) => f.type?.startsWith("audio/")
        );
        
        if (audioFormats.length > 0) {
          const best = audioFormats.sort(
            (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
          )[0];
          
          const audioUrl = best.url;
          if (audioUrl) {
            return { audioUrl, source: instance };
          }
        }
      }
    } catch {
      // Instance failed, will try next one
    }
    return null;
  };

  const firstBatch = INVIDIOUS_INSTANCES.slice(0, 4);
  const remaining = INVIDIOUS_INSTANCES.slice(4);
  
  const batchResults = await Promise.allSettled(firstBatch.map(tryInstance));
  for (const result of batchResults) {
    if (result.status === "fulfilled" && result.value) {
      return res.status(200).json(result.value);
    }
  }

  for (const instance of remaining) {
    const result = await tryInstance(instance);
    if (result) {
      return res.status(200).json(result);
    }
  }

  return res.status(503).json({
    error: "Could not extract audio from any source",
    fallback: true
  });
}
