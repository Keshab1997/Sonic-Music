import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { VideoResult } from "yt-search";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter";

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://sonic-bloom-player.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=300");

  // Rate limiting
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

  const page = parseInt(req.query.page as string) || 0;

  try {
    const yts = (await import("yt-search")).default;
    // Fetch more results by using list parameter
    const result = await yts({
      query,
      category: "music",
      list: page > 0 ? page : undefined
    });
    
    // Return up to 100 results for better coverage
    const maxResults = 100;
    const videos: YouTubeSearchResult[] = result.videos.slice(0, maxResults).map((v: VideoResult) => ({
      videoId: v.videoId,
      title: v.title,
      author: typeof v.author === "string" ? v.author : v.author?.name || "Unknown",
      duration: v.seconds,
      thumbnail: v.thumbnail || v.image || "",
    }));
    
    return res.status(200).json(videos);
  } catch (err) {
    console.error("YouTube search error:", err);
    return res.status(500).json({ error: "Search failed", details: String(err) });
  }
}
