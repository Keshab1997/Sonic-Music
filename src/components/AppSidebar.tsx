import { Home, Search, Library, Plus, Heart } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const navItems = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Library, label: "Your Library" },
];

const dummyPlaylists = [
  "Chill Vibes",
  "Late Night Coding",
  "Morning Coffee",
  "Workout Mix",
  "Road Trip Classics",
  "Deep Focus",
  "Throwback Jams",
  "Indie Discoveries",
];

export const AppSidebar = () => {
  const { tracks, play, currentIndex, isPlaying } = usePlayer();

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-sidebar border-r border-sidebar-border h-full overflow-hidden">
      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          <span className="text-gradient-brand">Pulse</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-4 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors duration-200 group"
          >
            <Icon size={22} className="group-hover:text-foreground transition-colors" />
            <span className="font-medium text-sm">{label}</span>
          </button>
        ))}
      </nav>

      {/* Playlist header */}
      <div className="mt-6 px-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Playlists</span>
          <button className="p-1 rounded-full hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
          <Heart size={18} />
          <span className="text-sm font-medium">Liked Songs</span>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-6 my-3 border-t border-sidebar-border" />

      {/* Playlist list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {dummyPlaylists.map((name) => (
          <button
            key={name}
            className="block w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            {name}
          </button>
        ))}
      </div>

      {/* Now playing mini */}
      {isPlaying && tracks[currentIndex] && (
        <div
          className="mx-3 mb-3 p-3 rounded-lg bg-sidebar-accent cursor-pointer group"
          onClick={() => play(currentIndex)}
        >
          <div className="flex items-center gap-3">
            <img
              src={tracks[currentIndex].cover}
              alt={tracks[currentIndex].title}
              className="w-10 h-10 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{tracks[currentIndex].title}</p>
              <p className="text-xs text-muted-foreground truncate">{tracks[currentIndex].artist}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
