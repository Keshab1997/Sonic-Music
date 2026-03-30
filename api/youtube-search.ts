import type { VercelRequest, VercelResponse } from "@vercel/node";
import yts from "yt-search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  try {
    const result = await yts({ query, category: "music" });
    const videos = result.videos.slice(0, 20).map((v) => ({
      videoId: v.videoId,
      title: v.title,
      author: v.author.name,
      duration: v.seconds,
      thumbnail: v.thumbnail,
    }));
    return res.status(200).json(videos);
  } catch (err) {
    return res.status(500).json({ error: "Search failed", details: String(err) });
  }
}
