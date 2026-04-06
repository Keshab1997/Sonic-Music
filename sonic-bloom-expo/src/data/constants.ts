// Static data constants for Sonic Bloom Expo

export const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
export const API_FALLBACK = "https://saavn.dev";

export const RECENTLY_PLAYED_KEY = "sonic_recently_played_native";
export const SEARCH_HISTORY_KEY = "sonic_search_history_native";
export const SEARCH_HISTORY_MAX = 10;
export const SONGS_PER_PAGE = 20;

export const TRENDING_SEARCHES = [
  { title: "Arijit Singh Hits", query: "arijit singh top songs", color: "#1a0808" },
  { title: "Bengali Modern", query: "modern bengali songs 2024", color: "#081a08" },
  { title: "Bollywood Romance", query: "bollywood romantic songs", color: "#1a0f00" },
  { title: "Lofi Chill", query: "lofi hindi songs chill", color: "#08081a" },
  { title: "Party Anthems", query: "bollywood party songs", color: "#1a0008" },
  { title: "90s Nostalgia", query: "90s hindi songs hits", color: "#0f0a1a" },
];

export const MOODS = [
  { name: "Bollywood", emoji: "🎬", color: "#dc2626", query: "bollywood songs hits" },
  { name: "Romantic", emoji: "❤️", color: "#ec4899", query: "romantic bollywood songs" },
  { name: "Sad", emoji: "😢", color: "#3b82f6", query: "dard bhare sad songs" },
  { name: "Party", emoji: "🎉", color: "#f59e0b", query: "party songs hindi" },
  { name: "Devotional", emoji: "🙏", color: "#d97706", query: "devotional bhajan songs" },
  { name: "Bengali", emoji: "🎵", color: "#10b981", query: "bengali popular songs" },
  { name: "Retro", emoji: "📻", color: "#7c3aed", query: "old hindi classic songs" },
  { name: "Workout", emoji: "💪", color: "#ef4444", query: "workout motivation songs" },
  { name: "Chill", emoji: "🌊", color: "#06b6d4", query: "chill hindi songs" },
  { name: "Rap", emoji: "🎤", color: "#374151", query: "rap songs hindi" },
];

export const LABELS = [
  { name: "T-Series", query: "T-Series songs", color: "#1d4ed8" },
  { name: "Saregama", query: "Saregama classics", color: "#92400e" },
  { name: "Zee Music", query: "Zee Music Company", color: "#6d28d9" },
  { name: "Sony Music", query: "Sony Music India", color: "#0369a1" },
  { name: "YRF Music", query: "YRF Music", color: "#991b1b" },
  { name: "Tips", query: "Tips Official", color: "#065f46" },
];

export const ERAS = [
  { name: "70s", subtitle: "Golden Era", query: "old hindi songs 1970", color: "#92400e" },
  { name: "80s", subtitle: "Retro Magic", query: "hindi songs 1980", color: "#6d28d9" },
  { name: "90s", subtitle: "Nostalgia", query: "hindi songs 1990", color: "#1d4ed8" },
  { name: "2000s", subtitle: "Millennium", query: "hindi songs 2000", color: "#065f46" },
  { name: "2010s", subtitle: "Modern Era", query: "hindi songs 2015", color: "#991b1b" },
  { name: "2020s", subtitle: "Now", query: "latest hindi songs 2025", color: "#4338ca" },
];

export const HINDI_ARTISTS = [
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Arijit Singh hits" },
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Shreya Ghoshal songs" },
  { name: "A.R. Rahman", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", query: "AR Rahman best songs" },
  { name: "Kishore Kumar", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", query: "Kishore Kumar hits" },
  { name: "Atif Aslam", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", query: "Atif Aslam hits" },
  { name: "Neha Kakkar", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", query: "Neha Kakkar songs" },
  { name: "Sonu Nigam", image: "https://images.unsplash.com/photo-1446057032654-9d8885f9a5c8?w=200&h=200&fit=crop", query: "Sonu Nigam hits" },
  { name: "Kumar Sanu", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", query: "Kumar Sanu hits" },
];

export const BENGALI_ARTISTS = [
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", query: "Anupam Roy bengali songs" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Rupankar bengali songs" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", query: "Nachiketa bengali songs" },
  { name: "Lopamudra Mitra", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Lopamudra Mitra bengali songs" },
];

export const QUICK_PICKS = [
  { title: "Arijit Singh Top 20", desc: "Most popular tracks", query: "Arijit Singh top hits", color: "#1a0808" },
  { title: "Bengali Modern", desc: "Contemporary bengali hits", query: "modern bengali songs", color: "#081a08" },
  { title: "Bollywood Blockbusters", desc: "Chart-topping movie songs", query: "bollywood blockbuster songs", color: "#1a0f00" },
  { title: "Lofi & Chill", desc: "Relaxed vibes", query: "lofi hindi songs chill", color: "#08081a" },
];


export const TIME_GREETINGS: Record<string, { title: string; subtitle: string; emoji: string; query: string }> = {
  morning: { title: "Good Morning", subtitle: "Start your day with fresh vibes", emoji: "☀️", query: "morning songs hindi bengali" },
  afternoon: { title: "Good Afternoon", subtitle: "Keep the energy going", emoji: "🌤️", query: "bollywood upbeat songs" },
  evening: { title: "Good Evening", subtitle: "Unwind with soulful melodies", emoji: "🌅", query: "romantic evening songs hindi" },
  night: { title: "Good Night", subtitle: "Relax and drift away", emoji: "🌙", query: "lofi chill night songs hindi" },
};

export const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

export const getSongOfDayIndex = (max: number) => {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return seed % Math.max(max, 1);
};

export const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
