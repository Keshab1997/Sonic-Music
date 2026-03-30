import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path as string;
  if (!path) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  const url = `https://www.soundhelix.com${path}`;

  try {
    const response = await new Promise<{ statusCode: number; headers: Record<string, string>; body: Buffer }>((resolve, reject) => {
      https.get(url, (stream) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          const headers: Record<string, string> = {};
          Object.entries(stream.headers).forEach(([key, value]) => {
            if (value) headers[key] = String(value);
          });
          resolve({
            statusCode: stream.statusCode || 200,
            headers,
            body: Buffer.concat(chunks),
          });
        });
        stream.on("error", reject);
      }).on("error", reject);
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(response.statusCode).send(response.body);
  } catch {
    res.status(500).json({ error: "Failed to fetch audio" });
  }
}
