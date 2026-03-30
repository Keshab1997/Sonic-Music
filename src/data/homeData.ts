export interface Artist {
  name: string;
  image: string;
  searchQuery: string;
  language: "hindi" | "bengali" | "english";
}

export interface MoodCategory {
  name: string;
  emoji: string;
  gradient: string;
  searchQuery: string;
}

export interface EraCategory {
  name: string;
  subtitle: string;
  searchQuery: string;
  gradient: string;
}

export const topArtists: Artist[] = [
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Arijit Singh hits", language: "hindi" },
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", searchQuery: "Shreya Ghoshal songs", language: "hindi" },
  { name: "A.R. Rahman", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", searchQuery: "AR Rahman best songs", language: "hindi" },
  { name: "Kishore Kumar", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", searchQuery: "Kishore Kumar hits", language: "hindi" },
  { name: "Lata Mangeshkar", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200&h=200&fit=crop", searchQuery: "Lata Mangeshkar songs", language: "hindi" },
  { name: "Atif Aslam", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Atif Aslam hits", language: "hindi" },
  { name: "Neha Kakkar", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Neha Kakkar songs", language: "hindi" },
  { name: "Darshan Raval", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Darshan Raval hits", language: "hindi" },
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Anupam Roy bengali songs", language: "bengali" },
  { name: "Arijit Singh (Bengali)", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Arijit Singh bengali songs", language: "bengali" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Rupankar bengali songs", language: "bengali" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Nachiketa bengali songs", language: "bengali" },
];

export const moodCategories: MoodCategory[] = [
  { name: "Bollywood", emoji: "🎬", gradient: "from-orange-500 to-red-600", searchQuery: "Bollywood latest hits" },
  { name: "Romantic", emoji: "❤️", gradient: "from-pink-500 to-rose-600", searchQuery: "romantic hindi songs" },
  { name: "Sad", emoji: "😢", gradient: "from-blue-500 to-indigo-600", searchQuery: "sad hindi songs" },
  { name: "Party", emoji: "🎉", gradient: "from-yellow-500 to-orange-500", searchQuery: "party songs hindi" },
  { name: "Devotional", emoji: "🙏", gradient: "from-amber-500 to-yellow-600", searchQuery: "devotional bhajan songs" },
  { name: "Bengali", emoji: "🎵", gradient: "from-green-500 to-teal-600", searchQuery: "bengali popular songs" },
  { name: "Retro", emoji: "📻", gradient: "from-purple-500 to-violet-600", searchQuery: "old hindi classic songs" },
  { name: "Workout", emoji: "💪", gradient: "from-red-500 to-orange-600", searchQuery: "workout motivation songs hindi" },
  { name: "Chill", emoji: "🌊", gradient: "from-cyan-500 to-blue-500", searchQuery: "chill hindi songs lofi" },
  { name: "Rap", emoji: "🎤", gradient: "from-gray-600 to-gray-800", searchQuery: "indian rap hip hop" },
];

export const eraCategories: EraCategory[] = [
  { name: "70s", subtitle: "Golden Era", searchQuery: "old hindi songs 1970", gradient: "from-amber-700 to-yellow-600" },
  { name: "80s", subtitle: "Retro Magic", searchQuery: "hindi songs 1980", gradient: "from-purple-700 to-pink-600" },
  { name: "90s", subtitle: "Nostalgia", searchQuery: "hindi songs 1990", gradient: "from-blue-700 to-cyan-600" },
  { name: "2000s", subtitle: "New Millennium", searchQuery: "hindi songs 2000", gradient: "from-green-700 to-emerald-600" },
  { name: "2010s", subtitle: "Modern Hits", searchQuery: "hindi songs 2015", gradient: "from-red-600 to-pink-500" },
  { name: "2020s", subtitle: "Latest Trending", searchQuery: "latest hindi songs 2025", gradient: "from-indigo-600 to-violet-500" },
];

export const timeSuggestions: Record<string, { title: string; subtitle: string; emoji: string; searchQuery: string }> = {
  morning: { title: "Good Morning", subtitle: "Start your day with fresh vibes", emoji: "☀️", searchQuery: "morning songs hindi bengali" },
  afternoon: { title: "Good Afternoon", subtitle: "Keep the energy going", emoji: "🌤️", searchQuery: "bollywood upbeat songs" },
  evening: { title: "Good Evening", subtitle: "Unwind with soulful melodies", emoji: "🌅", searchQuery: "romantic evening songs hindi" },
  night: { title: "Good Night", subtitle: "Relax and drift away", emoji: "🌙", searchQuery: "lofi chill night songs hindi" },
};

export const getTimeOfDay = (): "morning" | "afternoon" | "evening" | "night" => {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
};
