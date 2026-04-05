import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  try {
    const apiRes = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`);
    if (!apiRes.ok) throw new Error("API request failed");

    const data = await apiRes.json();
    const results = data.data?.results || [];

    const songs = results.map((song: {
      id: string;
      name: string;
      primaryArtists: string;
      album: { name: string };
      duration: string;
      image: { quality: string; link: string }[];
      downloadUrl: { quality: string; link: string }[];
    }) => ({
      id: song.id,
      title: song.name,
      artist: song.primaryArtists,
      album: song.album?.name || "",
      duration: parseInt(song.duration) || 0,
      cover: song.image?.find((i) => i.quality === "500x500")?.link ||
             song.image?.[song.image.length - 1]?.link ||
             "",
      audioUrl: song.downloadUrl?.find((d) => d.quality === "160kbps")?.link ||
                song.downloadUrl?.find((d) => d.quality === "96kbps")?.link ||
                song.downloadUrl?.[0]?.link ||
                "",
    }));

    return res.status(200).json(songs);
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", details: String(err) });
  }
}
