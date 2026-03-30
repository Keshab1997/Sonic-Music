export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  src: string;
  duration: number;
}

export const playlist: Track[] = [
  {
    id: 1,
    title: "Ambient Dreams",
    artist: "Synthwave Collective",
    album: "Neon Horizons",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
  },
  {
    id: 2,
    title: "Midnight Drive",
    artist: "Retro Pulse",
    album: "After Hours",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 405,
  },
  {
    id: 3,
    title: "Electric Sunset",
    artist: "Digital Nomad",
    album: "Coastline",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 318,
  },
  {
    id: 4,
    title: "Stellar Voyage",
    artist: "Cosmos",
    album: "Deep Space",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 290,
  },
  {
    id: 5,
    title: "Cyber Rain",
    artist: "Neon Ghost",
    album: "Digital Streets",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 345,
  },
  {
    id: 6,
    title: "Crystal Waves",
    artist: "Aqua System",
    album: "Ocean Drive",
    cover: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: 398,
  },
  {
    id: 7,
    title: "Velvet Dusk",
    artist: "Luna Echo",
    album: "Twilight Sessions",
    cover: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration: 267,
  },
  {
    id: 8,
    title: "Infinite Loop",
    artist: "Binary Sun",
    album: "Code & Soul",
    cover: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300&fit=crop",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    duration: 312,
  },
];
