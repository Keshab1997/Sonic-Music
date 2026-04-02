import type { VercelRequest, VercelResponse } from "@vercel/node";

const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.flokinet.to",
  "https://yt.artemislena.eu",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
  "https://invidious.protokolla.fi",
  "https://iv.datura.network",
  "https://invidious.perennialte.ch",
  "https://yewtu.be",
  "https://invidious.lunar.icu",
  "https://inv.in.projectsegfau.lt",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  const tryInstance = async (instance: string): Promise<{ audioUrl: string; source: string } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const invRes = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
        { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
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
          
          let audioUrl = best.url;
          if (audioUrl) {
            return { audioUrl, source: instance };
          }
        }
      }
    } catch { }
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
