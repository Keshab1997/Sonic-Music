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
        const dailyPage = (getDailySeed() % 3) + 1;
        const res = await fetch(`${API_BASE}/modules?language=hindi`);
        if (!res.ok) return;
        const data = await res.json();
        const mod = data.data || {};

        // Trending songs - get ALL IDs then batch fetch details
        const trendingRaw: SaavnModuleSong[] = mod.trending?.songs || [];
        const trendingIds = trendingRaw.map((s) => s.id).filter(Boolean);

        // New releases (songs from albums list) - get ALL
        const albumsRaw: SaavnModuleSong[] = mod.albums || [];
        const newReleaseIds = albumsRaw
          .filter((a) => a.type === "song")
          .map((s) => s.id)
          .filter(Boolean);

        // Charts
        const chartsRaw: ChartItem[] = (mod.charts || []).map((c: ChartItem) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          image: c.image,
        }));
        setCharts(chartsRaw);

        // Batch fetch song details for trending
        if (trendingIds.length > 0) {
          const songRes = await fetch(`${API_BASE}/songs?id=${trendingIds.join(",")}`);
          if (songRes.ok) {
            const songData = await songRes.json();
            const songs: SaavnSong[] = songData.data || [];
            setTrendingSongs(songs.map((s, i) => saavnToTrack(s, 5000 + i)));
          }
        }

        // Batch fetch song details for new releases
        if (newReleaseIds.length > 0) {
          const songRes = await fetch(`${API_BASE}/songs?id=${newReleaseIds.join(",")}`);
          if (songRes.ok) {
            const songData = await songRes.json();
            const songs: SaavnSong[] = songData.data || [];
            setNewReleases(dailyShuffle(songs.map((s, i) => saavnToTrack(s, 6000 + i))));
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Re-fetch logic same as above
    try {
      const res = await fetch(`${API_BASE}/modules?language=hindi`);
      if (!res.ok) return;
      const data = await res.json();
      const mod = data.data || {};

      const trendingRaw: SaavnModuleSong[] = mod.trending?.songs || [];
      const trendingIds = trendingRaw.map((s) => s.id).filter(Boolean);
      const albumsRaw: SaavnModuleSong[] = mod.albums || [];
      const newReleaseIds = albumsRaw
        .filter((a) => a.type === "song")
        .map((s) => s.id)
        .filter(Boolean);

      if (trendingIds.length > 0) {
        const songRes = await fetch(`${API_BASE}/songs?id=${trendingIds.join(",")}`);
        if (songRes.ok) {
          const songData = await songRes.json();
          setTrendingSongs((songData.data || []).map((s: SaavnSong, i: number) => saavnToTrack(s, 5000 + i)));
        }
      }
      if (newReleaseIds.length > 0) {
        const songRes = await fetch(`${API_BASE}/songs?id=${newReleaseIds.join(",")}`);
        if (songRes.ok) {
          const songData = await songRes.json();
          setNewReleases(dailyShuffle((songData.data || []).map((s: SaavnSong, i: number) => saavnToTrack(s, 6000 + i))));
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  return { trendingSongs, newReleases, charts, loading, refresh };
};
