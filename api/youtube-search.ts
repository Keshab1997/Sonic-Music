import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter";

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
  if (!query) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  const page = parseInt(req.query.page as string) || 1;

  try {
    const yts = await import("yt-search");
    const result = await yts.default(`${query}`);
    
    const videos: YouTubeSearchResult[] = result.videos.slice(0, 50).map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      author: typeof v.author === "string" ? v.author : (v.author?.name || "Unknown"),
      duration: v.seconds,
      thumbnail: v.thumbnail || v.image || "",
    }));
    
    console.log(`YouTube search for "${query}" returned ${videos.length} results`);
    return res.status(200).json(videos);
  } catch (err) {
    console.error("YouTube search error:", err);
    return res.status(500).json({ 
      error: "Search failed", 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
  if (!query) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  const page = parseInt(req.query.page as string) || 1;

  try {
    const yts = await import("yt-search");
    const result = await yts.default(`${query}`);
    
    const videos: YouTubeSearchResult[] = result.videos.slice(0, 50).map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      author: typeof v.author === "string" ? v.author : (v.author?.name || "Unknown"),
      duration: v.seconds,
      thumbnail: v.thumbnail || v.image || "",
    }));
    
    console.log(`YouTube search for "${query}" returned ${videos.length} results`);
    return res.status(200).json(videos);
  } catch (err) {
    console.error("YouTube search error:", err);
    return res.status(500).json({ 
      error: "Search failed", 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}
