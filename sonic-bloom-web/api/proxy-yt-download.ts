import type { VercelRequest, VercelResponse } from "@vercel/node";
import { INVIDIOUS_INSTANCES, INVIDIOUS_REQUEST_TIMEOUT, INVIDIOUS_HEADERS } from "./lib/invidious.js";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter.js";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://sonic-bloom-player.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Rate limiting
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const rateKey = `proxy-yt-download:${clientIp}`;
  const rateResult = checkRateLimit(rateKey, defaultRateLimits["/api/proxy-yt-download"]);
  
  if (!rateResult.allowed) {
    const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
    Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  
  const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
  Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  // First, get the audio URL from Invidious
  const getAudioUrl = async (): Promise<{ url: string; mimeType: string } | null> => {
    for (const instance of INVIDIOUS_INSTANCES) {
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
          if (!invData?.adaptiveFormats) continue;
          
          const audioFormats = invData.adaptiveFormats.filter(
            (f: { type: string }) => f.type?.startsWith("audio/")
          );
          
          if (audioFormats.length > 0) {
            const sorted = audioFormats.sort(
              (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
            );
            
            for (const format of sorted) {
              if (format.url) {
                return { url: format.url, mimeType: format.type || "audio/webm" };
              }
            }
          }
        }
      } catch {
        // Instance failed, try next one
      }
    }
    return null;
  };

  const audioInfo = await getAudioUrl();
  if (!audioInfo) {
    return res.status(503).json({ error: "Could not find audio stream" });
  }

  // Proxy the audio download
  try {
    const audioRes = await fetch(audioInfo.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    if (!audioRes.ok) {
      return res.status(502).json({ error: "Failed to fetch audio" });
    }

    const contentLength = audioRes.headers.get('content-length');
    
    res.setHeader("Content-Type", audioInfo.mimeType || "audio/webm");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Stream the audio
    const reader = audioRes.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: "Failed to read audio stream" });
    }

    let totalBytes = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      totalBytes += value.length;
    }
    
    console.log(`[proxy-yt-download] Downloaded ${totalBytes} bytes for ${videoId}`);
    res.end();
  } catch (error) {
    console.error("[proxy-yt-download] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to proxy audio download" });
    } else {
      res.end();
    }
  }
}
