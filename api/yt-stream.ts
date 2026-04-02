import type { VercelRequest, VercelResponse } from "@vercel/node";

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://invidious.nerdvpn.de",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  // Method 1: YouTube InnerTube API (most reliable)
  try {
    const payload = {
      videoId,
      context: {
        client: {
          hl: "en",
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
        }
      }
    };
    const ytRes = await fetch("https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (ytRes.ok) {
      const data = await ytRes.json();
      if (data?.streamingData?.adaptiveFormats) {
        const audioFormat = data.streamingData.adaptiveFormats.find(
          (f: { itag: number; url?: string }) => f.itag === 140 && f.url
        ) || data.streamingData.adaptiveFormats.find(
          (f: { mimeType?: string; url?: string }) => f.mimeType?.startsWith("audio/") && f.url
        );
        if (audioFormat?.url) {
          return res.status(200).json({ audioUrl: audioFormat.url });
        }
      }
    }
  } catch { /* try next method */ }

  // Method 2: Try Invidious instances
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const invRes = await fetch(`${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`, {
        signal: AbortSignal.timeout(3000)
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        const audioFormats = (invData.adaptiveFormats || []).filter(
          (f: { type: string }) => f.type?.startsWith("audio/")
        );
        if (audioFormats.length > 0) {
          const best = audioFormats.sort(
            (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
          )[0];
          return res.status(200).json({ audioUrl: best.url });
        }
      }
    } catch { /* try next instance */ }
  }

  return res.status(500).json({ error: "Could not extract audio" });
}
