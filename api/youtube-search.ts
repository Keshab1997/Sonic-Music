import type { VercelRequest, VercelResponse } from "@vercel/node";
import { INVIDIOUS_INSTANCES, INVIDIOUS_REQUEST_TIMEOUT, INVIDIOUS_HEADERS } from "./lib/invidious";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter";

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");

  if (req.method === "OPTIONS") return res.status(200).end();

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const rateKey = `youtube-search:${clientIp}`;
  const rateResult = checkRateLimit(rateKey, defaultRateLimits["/api/youtube-search"]);

  if (!rateResult.allowed) {
    const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "Missing q parameter" });

  const tryInstance = async (instance: string): Promise<YouTubeSearchResult[] | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), INVIDIOUS_REQUEST_TIMEOUT);
      const invRes = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
        { signal: controller.signal, headers: INVIDIOUS_HEADERS }
      );
      clearTimeout(timeout);
      if (!invRes.ok) return null;
      const data = await invRes.json().catch(() => null);
      if (!Array.isArray(data) || data.length === 0) return null;
      return data.slice(0, 50).map((v: any) => ({
        videoId: v.videoId,
        title: v.title,
        author: v.author || "Unknown",
        duration: v.lengthSeconds || 0,
        thumbnail: v.videoThumbnails?.[0]?.url || "",
      }));
    } catch {
      return null;
    }
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
    if (result) return res.status(200).json(result);
  }

  console.error(`All Invidious instances failed for query: ${query}`);
  return res.status(200).json([]);
}
