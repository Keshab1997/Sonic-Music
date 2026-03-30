import type { VercelRequest, VercelResponse } from "@vercel/node";
import ytdl from "@distube/ytdl-core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-AllowOrigin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: "No audio streams found" });
    }

    // Get the best audio quality
    const bestAudio = audioFormats[0];

    return res.status(200).json({
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails[0]?.url || "",
      audioUrl: bestAudio.url,
      mimeType: bestAudio.mimeType,
    });
  } catch (err) {
    console.error("YouTube audio extraction error:", err);
    return res.status(500).json({ error: "Failed to get audio stream", details: String(err) });
  }
}
