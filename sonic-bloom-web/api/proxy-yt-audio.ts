import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://sonic-bloom-player.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

  if (req.method === "OPTIONS") return res.status(200).end();

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const rateKey = `proxy-yt-audio:${clientIp}`;
  const rateResult = checkRateLimit(rateKey, defaultRateLimits["/api/proxy-audio"]);
  if (!rateResult.allowed) {
    return res.status(429).json({ error: "Too many requests." });
  }
  const rateLimitHeaders = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
  Object.entries(rateLimitHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const encodedUrl = req.query.url as string;
  if (!encodedUrl) return res.status(400).json({ error: "Missing url parameter" });

  let audioUrl: string;
  try {
    audioUrl = decodeURIComponent(encodedUrl);
    // Validate it's a known safe domain
    const parsed = new URL(audioUrl);
    const allowed = ["invidious", "piped", "yt-dl", "googlevideo.com", "youtube.com"];
    const isSafe = allowed.some(d => parsed.hostname.includes(d)) ||
                   parsed.hostname.endsWith(".googlevideo.com");
    if (!isSafe) return res.status(403).json({ error: "Forbidden URL" });
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; SonicBloom/1.0)",
    };
    if (req.headers.range) headers["Range"] = req.headers.range as string;

    const upstream = await fetch(audioUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).json({ error: "Upstream error" });
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/webm");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Accept-Ranges", "bytes");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);

    res.status(upstream.status);

    const reader = upstream.body?.getReader();
    if (!reader) return res.status(500).json({ error: "No body" });

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(Buffer.from(value));
      }
    };
    await pump();
  } catch {
    if (!res.headersSent) res.status(500).json({ error: "Proxy failed" });
  }
}
