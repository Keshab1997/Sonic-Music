
export interface Artist {
  name: string;
  image: string;
  searchQuery: string;
  language: "hindi" | "bengali" | "punjabi" | "tamil" | "english";
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

export const allArtists: Artist[] = [
  // Hindi Male
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Arijit Singh hits", language: "hindi" },
  { name: "A.R. Rahman", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", searchQuery: "AR Rahman best songs", language: "hindi" },
  { name: "Kishore Kumar", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", searchQuery: "Kishore Kumar hits", language: "hindi" },
  { name: "Atif Aslam", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Atif Aslam hits", language: "hindi" },
  { name: "Darshan Raval", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Darshan Raval hits", language: "hindi" },
  { name: "Jubin Nautiyal", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Jubin Nautiyal songs", language: "hindi" },
  { name: "Sonu Nigam", image: "https://images.unsplash.com/photo-1446057032654-9d8885f9a5c8?w=200&h=200&fit=crop", searchQuery: "Sonu Nigam hits", language: "hindi" },
  { name: "Mohammed Rafi", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Mohammed Rafi songs", language: "hindi" },
  { name: "Kumar Sanu", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Kumar Sanu hits", language: "hindi" },
  { name: "Udit Narayan", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Udit Narayan songs", language: "hindi" },
  { name: "Pritam", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200&h=200&fit=crop", searchQuery: "Pritam songs hits", language: "hindi" },
  { name: "Badshah", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop", searchQuery: "Badshah songs", language: "hindi" },
  { name: "Honey Singh", image: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=200&h=200&fit=crop", searchQuery: "Yo Yo Honey Singh songs", language: "hindi" },
  { name: "Raftaar", image: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&fit=crop", searchQuery: "Raftaar songs rap", language: "hindi" },
  { name: "Divine", image: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=200&h=200&fit=crop", searchQuery: "Divine rap songs", language: "hindi" },
  // Hindi Female
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", searchQuery: "Shreya Ghoshal songs", language: "hindi" },
  { name: "Lata Mangeshkar", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200&h=200&fit=crop", searchQuery: "Lata Mangeshkar songs", language: "hindi" },
  { name: "Neha Kakkar", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Neha Kakkar songs", language: "hindi" },
  { name: "Sunidhi Chauhan", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Sunidhi Chauhan songs", language: "hindi" },
  { name: "Alka Yagnik", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Alka Yagnik hits", language: "hindi" },
  { name: "Asees Kaur", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Asees Kaur songs", language: "hindi" },
  { name: "Tulsi Kumar", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Tulsi Kumar songs", language: "hindi" },
  // Bengali
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Anupam Roy bengali songs", language: "bengali" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Rupankar bengali songs", language: "bengali" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Nachiketa bengali songs", language: "bengali" },
  { name: "Anindya Chatterjee", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", searchQuery: "Anindya Chatterjee songs", language: "bengali" },
  { name: "Lopamudra Mitra", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", searchQuery: "Lopamudra Mitra bengali songs", language: "bengali" },
  { name: "Shaan (Bengali)", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Shaan bengali songs", language: "bengali" },
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200&h=200&fit=crop", searchQuery: "Anupam Roy latest songs", language: "bengali" },
  // Punjabi
  { name: "Diljit Dosanjh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Diljit Dosanjh songs", language: "punjabi" },
  { name: "AP Dhillon", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "AP Dhillon songs", language: "punjabi" },
  { name: "Sidhu Moose Wala", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Sidhu Moose Wala songs", language: "punjabi" },
  { name: "Guru Randhawa", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Guru Randhawa songs", language: "punjabi" },
  { name: "B Praak", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "B Praak songs", language: "punjabi" },
  { name: "Karan Aujla", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Karan Aujla songs", language: "punjabi" },
  // Tamil
  { name: "Anirudh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Anirudh Ravichander songs", language: "tamil" },
  { name: "Sid Sriram", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", searchQuery: "Sid Sriram songs", language: "tamil" },
  { name: "Yuvan Shankar Raja", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Yuvan Shankar Raja songs", language: "tamil" },
];

export const moodCategories: MoodCategory[] = [
  { name: "Bollywood", emoji: "🎬", gradient: "from-orange-500 to-red-600", searchQuery: "bollywood songs hits" },
  { name: "Romantic", emoji: "❤️", gradient: "from-pink-500 to-rose-600", searchQuery: "romantic bollywood songs" },
  { name: "Sad", emoji: "😢", gradient: "from-blue-500 to-indigo-600", searchQuery: "dard bhare sad songs" },
  { name: "Party", emoji: "🎉", gradient: "from-yellow-500 to-orange-500", searchQuery: "party songs hindi" },
  { name: "Devotional", emoji: "🙏", gradient: "from-amber-500 to-yellow-600", searchQuery: "devotional bhajan songs" },
  { name: "Bengali", emoji: "🎵", gradient: "from-green-500 to-teal-600", searchQuery: "bengali popular songs" },
  { name: "Retro", emoji: "📻", gradient: "from-purple-500 to-violet-600", searchQuery: "old hindi classic songs" },
  { name: "Workout", emoji: "💪", gradient: "from-red-500 to-orange-600", searchQuery: "workout motivation songs" },
  { name: "Chill", emoji: "🌊", gradient: "from-cyan-500 to-blue-500", searchQuery: "chill hindi songs" },
  { name: "Rap", emoji: "🎤", gradient: "from-gray-600 to-gray-800", searchQuery: "rap songs hindi" },
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

export interface MusicLabel {
  name: string;
  searchQuery: string;
  gradient: string;
  textColor: string;
}

export const musicLabels: MusicLabel[] = [
  { name: "T-Series", searchQuery: "T-Series", gradient: "from-blue-600 to-blue-900", textColor: "text-white" },
  { name: "Saregama", searchQuery: "Saregama", gradient: "from-amber-600 to-amber-900", textColor: "text-white" },
  { name: "Zee Music", searchQuery: "Zee Music Company", gradient: "from-purple-600 to-purple-900", textColor: "text-white" },
  { name: "Sony Music", searchQuery: "Sony Music India", gradient: "from-sky-600 to-sky-900", textColor: "text-white" },
  { name: "YRF Music", searchQuery: "YRF Music", gradient: "from-red-600 to-red-900", textColor: "text-white" },
  { name: "Tips", searchQuery: "Tips Official", gradient: "from-emerald-600 to-emerald-900", textColor: "text-white" },
];

export const actresses: Artist[] = [
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", searchQuery: "Shreya Ghoshal songs", language: "hindi" },
  { name: "Lata Mangeshkar", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200&h=200&fit=crop", searchQuery: "Lata Mangeshkar songs", language: "hindi" },
  { name: "Neha Kakkar", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Neha Kakkar songs", language: "hindi" },
  { name: "Sunidhi Chauhan", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Sunidhi Chauhan songs", language: "hindi" },
  { name: "Alka Yagnik", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Alka Yagnik hits", language: "hindi" },
  { name: "Asees Kaur", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Asees Kaur songs", language: "hindi" },
  { name: "Tulsi Kumar", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Tulsi Kumar songs", language: "hindi" },
  { name: "Badshah", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop", searchQuery: "Badshah songs", language: "hindi" },
  { name: "Jubin Nautiyal", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Jubin Nautiyal songs", language: "hindi" },
  { name: "Armaan Malik", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Armaan Malik songs", language: "hindi" },
  { name: "Yo Yo Honey Singh", image: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=200&h=200&fit=crop", searchQuery: "Yo Yo Honey Singh songs", language: "hindi" },
  { name: "Mika Singh", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Mika Singh songs", language: "hindi" },
  { name: "Sanjay Dutt", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop", searchQuery: "Sanjay Dutt songs", language: "hindi" },
  { name: "Palak Muchhal", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Palak Muchhal songs", language: "hindi" },
  { name: "Shreyan", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Shreyan songs", language: "hindi" },
  { name: "Madhuri Dixit", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", searchQuery: "Madhuri Dixit songs", language: "hindi" },
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Arijit Singh hits", language: "hindi" },
  { name: "Atif Aslam", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", searchQuery: "Atif Aslam hits", language: "hindi" },
  { name: "Darshan Raval", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Darshan Raval hits", language: "hindi" },
  { name: "Sonu Nigam", image: "https://images.unsplash.com/photo-1446057032654-9d8885f9a5c8?w=200&h=200&fit=crop", searchQuery: "Sonu Nigam hits", language: "hindi" },
  { name: "Kumar Sanu", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", searchQuery: "Kumar Sanu hits", language: "hindi" },
  { name: "Udit Narayan", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", searchQuery: "Udit Narayan songs", language: "hindi" },
  { name: "Mohammed Rafi", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Mohammed Rafi songs", language: "hindi" },
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "Anupam Roy bengali songs", language: "bengali" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Rupankar bengali songs", language: "bengali" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Nachiketa bengali songs", language: "bengali" },
  { name: "Diljit Dosanjh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", searchQuery: "Diljit Dosanjh songs", language: "punjabi" },
  { name: "Sidhu Moose Wala", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop", searchQuery: "Sidhu Moose Wala songs", language: "punjabi" },
  { name: "B Praak", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", searchQuery: "B Praak songs", language: "punjabi" },
  { name: "Karan Aujla", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", searchQuery: "Karan Aujla songs", language: "punjabi" },
];

