
import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "sonic_listening_stats";

export interface ListeningStats {
  totalPlays: number;
  totalMinutes: number;
  songsPlayedToday: number;
  topArtists: Record<string, number>;
  lastPlayDate: string;
  streakDays: number;
}

const defaultStats: ListeningStats = {
  totalPlays: 0,
  totalMinutes: 0,
  songsPlayedToday: 0,
  topArtists: {},
  lastPlayDate: "",
  streakDays: 0,
};

const getToday = () => new Date().toISOString().split("T")[0];

export const useListeningStats = () => {
  const [stats, setStats] = useState<ListeningStats>(defaultStats);

  useEffect(() => {
    AsyncStorage.getItem(STATS_KEY).then(stored => {
      if (stored) {
        const parsed: ListeningStats = JSON.parse(stored);
        if (parsed.lastPlayDate !== getToday()) {
          parsed.songsPlayedToday = 0;
        }
        setStats(parsed);
      }
    }).catch(() => {});
  }, []);

  const recordPlay = useCallback((artist: string, durationSeconds: number) => {
    setStats((prev) => {
      const today = getToday();
      const isNewDay = prev.lastPlayDate !== today;
      const minutes = Math.floor(durationSeconds / 60);

      let streak = prev.streakDays;
      if (isNewDay && prev.lastPlayDate) {
        const lastDate = new Date(prev.lastPlayDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak += 1;
        else if (diffDays > 1) streak = 1;
      } else if (isNewDay && !prev.lastPlayDate) {
        streak = 1;
      }

      const artists = { ...prev.topArtists };
      const artistName = artist.split(",")[0].trim();
      artists[artistName] = (artists[artistName] || 0) + 1;

      const updated: ListeningStats = {
        totalPlays: prev.totalPlays + 1,
        totalMinutes: prev.totalMinutes + minutes,
        songsPlayedToday: isNewDay ? 1 : prev.songsPlayedToday + 1,
        topArtists: artists,
        lastPlayDate: today,
        streakDays: streak,
      };

      AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const getTopArtist = useCallback(() => {
    const entries = Object.entries(stats.topArtists);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }, [stats.topArtists]);

  return { stats, recordPlay, getTopArtist };
};

