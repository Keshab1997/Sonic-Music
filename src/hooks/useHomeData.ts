import { useState, useEffect, useCallback } from "react";
import { Track } from "@/data/playlist";

interface SaavnArtist {
  id: string;
  name: string;
  image?: { quality: string; link: string }[] | false;
}

interface SaavnSong {
  id: string;
  name: string;
  primaryArtists: string | SaavnArtist[];
  album?: { name: string } | string;
  duration: string | number;
  image: { quality: string; link: string }[];
  downloadUrl: { quality: string; link: string }[];
}

interface SaavnModuleSong {
  id: string;
  name: string;
  primaryArtists: string | SaavnArtist[];
  album?: { name: string } | string;
  duration?: string | number;
  image: { quality: string; link: string }[];
  type: string;
}

interface ChartItem {
  id: string;
  title: string;
  subtitle: string;
  image: { quality: string; link: string }[];
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

const dailyShuffle = <T,>(arr: T[]): T[] => {
  const seed = getDailySeed();
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1)) % shuffled.length;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const saavnToTrack = (s: SaavnSong, idOffset: number): Track => {
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";

  let artistName = "Unknown";
  if (typeof s.primaryArtists === "string") {
    artistName = s.primaryArtists || "Unknown";
  } else if (Array.isArray(s.primaryArtists)) {
    artistName = s.primaryArtists.map((a) => a.name).join(", ") || "Unknown";
  }

  let albumName = "";
  if (typeof s.album === "string") albumName = s.album;
  else if (s.album && typeof s.album === "object") albumName = s.album.name || "";

  return {
    id: idOffset,
    title: s.name?.replace(/&quot;/g, '"').replace(/&amp;/g, "&") || "Unknown",
    artist: artistName,
    album: albumName,
    cover: s.image?.find((img) => img.quality === "500x500")?.link ||
           s.image?.[s.image.length - 1]?.link || "",
    src: bestUrl,
    duration: parseInt(String(s.duration)) || 0,
    type: "audio" as const,
    songId: s.id,
    audioUrls: {
      ...(url96 ? { "96kbps": url96 } : {}),
      ...(url160 ? { "160kbps": url160 } : {}),
      ...(url320 ? { "320kbps": url320 } : {}),
    },
  };
};

export const useHomeData = () => {
  const [trendingSongs, setTrendingSongs] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from multiple languages to build a large song pool
        const languages = ["hindi", "english", "tamil", "telugu", "punjabi"];
        const fetchModule = (lang: string) =>
          fetch(`${API_BASE}/modules?language=${lang}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

        const results = await Promise.all(languages.map(fetchModule));

        // Collect all IDs from all languages
        const allTrendingIds: string[] = [];
        const allNewReleaseIds: string[] = [];
        const seenIds = new Set<string>();

        let chartsSet = false;
        for (const data of results) {
          if (!data) continue;
          const mod = data.data || {};

          // Trending
          for (const s of (mod.trending?.songs || []) as SaavnModuleSong[]) {
            if (s.id && !seenIds.has(s.id)) {
              seenIds.add(s.id);
              allTrendingIds.push(s.id);
            }
          }

          // New releases
          for (const a of (mod.albums || []) as SaavnModuleSong[]) {
            if (a.type === "song" && a.id && !seenIds.has(a.id)) {
              seenIds.add(a.id);
              allNewReleaseIds.push(a.id);
            }
          }

          // Charts — take from first language that has them
          if (!chartsSet && (mod.charts || []).length > 0) {
            chartsSet = true;
            setCharts(
              (mod.charts || []).map((c: ChartItem) => ({
                id: c.id,
                title: c.title,
                subtitle: c.subtitle,
                image: c.image,
              }))
            );
          }
        }

        // Batch fetch song details (API limits ~50 per request, chunk if needed)
        const fetchSongs = async (ids: string[]): Promise<SaavnSong[]> => {
          if (ids.length === 0) return [];
          const chunks: string[][] = [];
          for (let i = 0; i < ids.length; i += 40) {
            chunks.push(ids.slice(i, i + 40));
          }
          const allSongs: SaavnSong[] = [];
          for (const chunk of chunks) {
            try {
              const res = await fetch(`${API_BASE}/songs?id=${chunk.join(",")}`);
              if (res.ok) {
                const data = await res.json();
                allSongs.push(...(data.data || []));
              }
            } catch { /* skip chunk */ }
          }
          return allSongs;
        };

        const [trendingSongsData, newReleaseSongsData] = await Promise.all([
          fetchSongs(allTrendingIds),
          fetchSongs(allNewReleaseIds),
        ]);

        setTrendingSongs(trendingSongsData.map((s, i) => saavnToTrack(s, 5000 + i)));
        setNewReleases(newReleaseSongsData.map((s, i) => saavnToTrack(s, 6000 + i)));
      } catch {
        // ignore
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const languages = ["hindi", "english", "tamil", "telugu", "punjabi"];
      const results = await Promise.all(
        languages.map((lang) =>
          fetch(`${API_BASE}/modules?language=${lang}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      const allTrendingIds: string[] = [];
      const allNewReleaseIds: string[] = [];
      const seenIds = new Set<string>();

      for (const data of results) {
        if (!data) continue;
        const mod = data.data || {};
        for (const s of (mod.trending?.songs || []) as SaavnModuleSong[]) {
          if (s.id && !seenIds.has(s.id)) { seenIds.add(s.id); allTrendingIds.push(s.id); }
        }
        for (const a of (mod.albums || []) as SaavnModuleSong[]) {
          if (a.type === "song" && a.id && !seenIds.has(a.id)) { seenIds.add(a.id); allNewReleaseIds.push(a.id); }
        }
      }

      const fetchSongs = async (ids: string[]): Promise<SaavnSong[]> => {
        if (ids.length === 0) return [];
        const allSongs: SaavnSong[] = [];
        for (let i = 0; i < ids.length; i += 40) {
          try {
            const res = await fetch(`${API_BASE}/songs?id=${ids.slice(i, i + 40).join(",")}`);
            if (res.ok) { const d = await res.json(); allSongs.push(...(d.data || [])); }
          } catch { /* skip */ }
        }
        return allSongs;
      };

      const [t, n] = await Promise.all([fetchSongs(allTrendingIds), fetchSongs(allNewReleaseIds)]);
      setTrendingSongs(t.map((s: SaavnSong, i: number) => saavnToTrack(s, 5000 + i)));
      setNewReleases(n.map((s: SaavnSong, i: number) => saavnToTrack(s, 6000 + i)));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  return { trendingSongs, newReleases, charts, loading, refresh };
};
