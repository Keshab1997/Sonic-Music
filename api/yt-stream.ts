import type { VercelRequest, VercelResponse } from "@vercel/node";

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://invidious.nerdvpn.de",
  "https://vid.puffyan.us",
  "https://invidious.flokinet.to",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  // Try each Invidious instance
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      
      const invRes = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
        { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      clearTimeout(timeout);
      
      if (invRes.ok) {
        const invData = await invRes.json();
        const audioFormats = (invData.adaptiveFormats || []).filter(
          (f: { type: string }) => f.type?.startsWith("audio/")
        );
        
        if (audioFormats.length > 0) {
          const best = audioFormats.sort(
            (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
          )[0];
          
          return res.status(200).json({ 
            audioUrl: best.url,
            source: instance 
          });
        }
      }
    } catch (err) {
      // Try next instance
      continue;
    }
  }

  // All instances failed - return error but don't crash
  return res.status(500).json({ 
    error: "Could not extract audio from any source",
    fallback: true // Signal to client to use ReactPlayer fallback
  });
}
