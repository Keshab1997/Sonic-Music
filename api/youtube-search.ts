import type { VercelRequest, VercelResponse } from "@vercel/node";
import { INVIDIOUS_INSTANCES, INVIDIOUS_REQUEST_TIMEOUT, INVIDIOUS_HEADERS, PIPED_INSTANCES } from "./lib/invidious.js";
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "./lib/rate-limiter.js";

// In-memory cache: query -> { results, expiresAt }
const searchCache = new Map<string, { results: unknown[]; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

interface YouTubeApiSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
    };
  };
}

interface YouTubeApiVideoItem {
  id: string;
  contentDetails?: {
    duration: string;
  };
}

interface InvidiousSearchItem {
  videoId: string;
  title: string;
  author?: string;
  lengthSeconds?: number;
  videoThumbnails?: Array<{ url: string }>;
}

interface PipedSearchItem {
  url?: string;
  title: string;
  uploaderName?: string;
  duration?: number;
  thumbnail?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

  if (req.method === "OPTIONS") return res.status(200).end();

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const rateKey = `youtube-search:${clientIp}`;
  const rateResult = checkRateLimit(rateKey, defaultRateLimits["/api/youtube-search"]);

  if (!rateResult.allowed) {
    const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
    Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const headers = getRateLimitHeaders(rateResult.remaining, rateResult.resetTime);
  Object.entries(headers).forEach(([key, value]: [string, string]) => res.setHeader(key, value));

  const query = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  if (!query) return res.status(400).json({ error: "Missing q parameter" });

  // Check in-memory cache first (include page in cache key)
  const cacheKey = `${query.toLowerCase().trim()}:${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached.results);
  }

  // Primary: YouTube Data API v3
  const ytApiKey = process.env.YOUTUBE_API_KEY;
  if (ytApiKey) {
    try {
      const maxResults = 25;
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&pageToken=${page > 1 ? getPageToken(page) : ''}&key=${ytApiKey}`,
        { headers: { Accept: "application/json" } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json() as { items: YouTubeApiSearchItem[]; nextPageToken?: string };
        const videoIds: string[] = searchData.items.map((i) => i.id.videoId);

        // Fetch durations via videos endpoint
        const detailRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(",")}&key=${ytApiKey}`,
          { headers: { Accept: "application/json" } }
        );
        const detailData = (detailRes.ok ? await detailRes.json() : { items: [] }) as { items: YouTubeApiVideoItem[] };
        const durationMap: Record<string, number> = {};
        for (const item of detailData.items) {
          const iso = item.contentDetails?.duration || "";
          const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          durationMap[item.id] = m ? (parseInt(m[1] || "0") * 3600 + parseInt(m[2] || "0") * 60 + parseInt(m[3] || "0")) : 0;
        }

        const results: YouTubeSearchResult[] = searchData.items.map((i) => ({
          videoId: i.id.videoId,
          title: i.snippet.title,
          author: i.snippet.channelTitle,
          duration: durationMap[i.id.videoId] || 0,
          thumbnail: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url || "",
        }));
        searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
        return res.status(200).json(results);
      }
    } catch (err) {
      console.error("YouTube API error:", err);
    }
  }

  // Fallback: Invidious instances with pagination support
  const tryInstance = async (instance: string): Promise<YouTubeSearchResult[] | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), INVIDIOUS_REQUEST_TIMEOUT);
      // Invidious uses "page" parameter for pagination
      const invRes = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=${page}&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
        { signal: controller.signal, headers: INVIDIOUS_HEADERS }
      );
      clearTimeout(timeout);
      if (!invRes.ok) return null;
      const data = await invRes.json().catch(() => null) as InvidiousSearchItem[] | null;
      if (!Array.isArray(data) || data.length === 0) return null;
      const results = data.slice(0, 50).map((v) => ({
        videoId: v.videoId,
        title: v.title,
        author: v.author || "Unknown",
        duration: v.lengthSeconds || 0,
        thumbnail: v.videoThumbnails?.[0]?.url || "",
      }));
      searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
      return results;
    } catch {
      return null;
    }
  };

  // Try Invidious first
  const firstBatch = INVIDIOUS_INSTANCES.slice(0, 4);
  const remaining = INVIDIOUS_INSTANCES.slice(4);

  const batchResults = await Promise.allSettled(firstBatch.map(tryInstance));
  for (const result of batchResults) {
    if (result.status === "fulfilled" && result.value) {
      return res.status(200).json(result.value);
    }
  }

  // Try Piped as fallback (Piped doesn't support page well, so just return same results)
  if (page === 1) {
    const tryPiped = async (instance: string): Promise<YouTubeSearchResult[] | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), INVIDIOUS_REQUEST_TIMEOUT);
        const pipedRes = await fetch(
          `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
          { signal: controller.signal, headers: INVIDIOUS_HEADERS }
        );
        clearTimeout(timeout);
        if (!pipedRes.ok) return null;
        const data = await pipedRes.json().catch(() => null) as { items: PipedSearchItem[] } | null;
        if (!data?.items || !Array.isArray(data.items)) return null;
        const results = data.items.slice(0, 50)
          .map((v) => ({
            videoId: v.url?.replace("/watch?v=", "") ?? "",
            title: v.title,
            author: v.uploaderName || "Unknown",
            duration: v.duration || 0,
            thumbnail: v.thumbnail ?? "",
          }))
          .filter((v) => v.videoId);
        searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
        return results;
      } catch {
        return null;
      }
    };

    const pipedBatch = PIPED_INSTANCES.slice(0, 3);
    const pipedResults = await Promise.allSettled(pipedBatch.map(tryPiped));
    for (const result of pipedResults) {
      if (result.status === "fulfilled" && result.value) {
        return res.status(200).json(result.value);
      }
    }
  }

  for (const instance of remaining) {
    const result = await tryInstance(instance);
    if (result) return res.status(200).json(result);
  }

  console.error(`All sources failed for query: ${query}`);
  return res.status(500).json({ error: "Search unavailable. Please try again later." });
}

// Simple page token generator (YouTube uses base64 encoded tokens)
// For pagination, we'll just use simple offset-based approach
function getPageToken(page: number): string {
  // This is a simplified approach - in production you'd use actual YouTube page tokens
  return "";
}
