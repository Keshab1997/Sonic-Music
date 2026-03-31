import { useState } from "react";
import { Home, Search, Library, Plus, Heart, Sun, Moon, Pencil, Trash2, Check, X, User } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useTheme } from "@/hooks/useTheme";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useArtistFavorites } from "@/hooks/useArtistFavorites";
import { SearchOverlay } from "@/components/SearchOverlay";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
];

export const AppSidebar = () => {
  const { tracks, play, currentIndex, isPlaying, playTrackList } = usePlayer();
  const { theme, toggleTheme } = useTheme();
  const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = usePlaylists();
  const { favorites: artistFavorites, removeFavorite: removeArtistFav } = useArtistFavorites();
  const location = useLocation();

  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setShowCreateInput(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renamePlaylist(id, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-sidebar border-r border-sidebar-border h-full overflow-hidden flex-shrink-0 z-10 relative">
      {/* Logo */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <Link to="/">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            <span className="text-gradient-brand">Pulse</span>
          </h1>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`flex items-center gap-4 w-full px-3 py-2.5 rounded-lg transition-colors duration-200 group ${
              location.pathname === path
                ? "text-foreground bg-sidebar-accent"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon size={22} className="group-hover:text-foreground transition-colors" />
            <span className="font-medium text-sm">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Search Bar */}
      <div className="px-3 mt-3">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-foreground hover:text-foreground transition-colors"
        >
          <Search size={18} />
          <span className="text-sm text-muted-foreground">Search songs, artists...</span>
        </button>
      </div>

      {/* Search Overlay */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}

      {/* Playlist header */}
      <div className="mt-6 px-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Playlists</span>
          <button
            onClick={() => setShowCreateInput(!showCreateInput)}
            className="p-1 rounded-full hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Create playlist input */}
        {showCreateInput && (
          <div className="flex items-center gap-1 px-3 mb-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Playlist name"
              className="flex-1 text-xs px-2 py-1.5 rounded bg-sidebar-accent border border-sidebar-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button onClick={handleCreate} className="p-1 text-primary hover:text-primary/80">
              <Check size={14} />
            </button>
            <button onClick={() => { setShowCreateInput(false); setNewPlaylistName(""); }} className="p-1 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        )}

        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
          <Heart size={18} />
          <span className="text-sm font-medium">Liked Songs</span>
        </button>

        {/* Saved Artists */}
        {artistFavorites.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-3 w-full px-3 py-2">
              <User size={16} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Saved Artists ({artistFavorites.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-0.5 px-1">
              {artistFavorites.map((a) => (
                <div key={a.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <img src={a.image} alt={a.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground truncate flex-1">{a.name}</span>
                  <button
                    onClick={() => removeArtistFav(a.id)}
                    className="p-0.5 text-muted-foreground/0 group-hover:text-destructive rounded-full transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 my-3 border-t border-sidebar-border" />

      {/* Playlist list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {playlists.map((pl) => (
          <div key={pl.id} className="group flex items-center">
            {editingId === pl.id ? (
              <div className="flex items-center gap-1 flex-1 px-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(pl.id);
                    if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                  }}
                  className="flex-1 text-xs px-2 py-1 rounded bg-sidebar-accent border border-sidebar-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button onClick={() => handleRename(pl.id)} className="p-0.5 text-primary">
                  <Check size={12} />
                </button>
                <button onClick={() => { setEditingId(null); setEditName(""); }} className="p-0.5 text-muted-foreground">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => playTrackList(pl.tracks, 0)}
                  className="flex-1 text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {pl.name}
                  <span className="text-[10px] text-muted-foreground/60 ml-1">({pl.tracks.length})</span>
                </button>
                <div className="flex items-center gap-0.5 pr-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(pl.id); setEditName(pl.name); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-sidebar-accent transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-sidebar-accent transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {playlists.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 px-3 py-2">No playlists yet. Click + to create one.</p>
        )}
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
