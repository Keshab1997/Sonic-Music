import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=7200");

  const videoId = req.query.id as string;
  if (!videoId) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const ytdl = await import("@distube/ytdl-core");
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.default.getInfo(url);

    const audioFormats = ytdl.default.filterFormats(info.formats, "audioonly");
    if (audioFormats.length === 0) {
      return res.status(404).json({ error: "No audio found" });
    }

    // Prefer lowest bitrate for faster streaming
    const bestAudio = audioFormats.sort((a, b) => {
      const aBitrate = parseInt(a.audioBitrate?.toString() || "0");
      const bBitrate = parseInt(b.audioBitrate?.toString() || "0");
      return aBitrate - bBitrate;
    })[0];

    return res.status(200).json({
      audioUrl: bestAudio.url,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds) || 0,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || "",
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get audio stream", details: String(err) });
  }
}
