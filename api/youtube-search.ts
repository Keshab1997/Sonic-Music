import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=300");

  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  const page = parseInt(req.query.page as string) || 0;

  try {
    const yts = (await import("yt-search")).default;
    // Fetch more results by using list parameter
    const result = await yts({
      query,
      category: "music",
      list: page > 0 ? page : undefined
    });
    
    // Return up to 100 results for better coverage
    const maxResults = 100;
    const videos = result.videos.slice(0, maxResults).map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      author: v.author.name || v.author,
      duration: v.seconds,
      thumbnail: v.thumbnail || v.image,
    }));
    
    return res.status(200).json(videos);
  } catch (err) {
    console.error("YouTube search error:", err);
    return res.status(500).json({ error: "Search failed", details: String(err) });
  }
}
