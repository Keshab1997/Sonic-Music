import type { VercelRequest, VercelResponse } from "@vercel/node";

// Cobalt API — free public YouTube audio extractor, works on serverless
const COBALT_API = "https://api.cobalt.tools/api/json";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const videoId = req.query.id as string;
  if (!videoId) return res.status(400).json({ error: "Missing id parameter" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const cobaltRes = await fetch(COBALT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url,
        vCodec: "h264",
        vQuality: "720",
        aFormat: "mp3",
        isAudioOnly: true,
        isNoTTWatermark: true,
        dubLang: false,
        disableMetadata: false,
      }),
    });

    if (!cobaltRes.ok) throw new Error(`Cobalt error: ${cobaltRes.status}`);
    const data = await cobaltRes.json();

    // Cobalt returns { status: "stream"|"redirect"|"picker", url }
    if ((data.status === "stream" || data.status === "redirect") && data.url) {
      return res.status(200).json({ audioUrl: data.url });
    }

    throw new Error(`Unexpected cobalt response: ${JSON.stringify(data)}`);
  } catch (err) {
    // Fallback: try invidious API
    try {
      const invRes = await fetch(
        `https://invidious.snopyta.org/api/v1/videos/${videoId}?fields=adaptiveFormats`
      );
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
    } catch { /* ignore fallback error */ }

    return res.status(500).json({ error: "Could not extract audio", details: String(err) });
  }
}
