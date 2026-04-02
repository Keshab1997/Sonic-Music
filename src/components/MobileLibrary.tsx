import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Heart, Pencil, Trash2, Check, User, Play, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useArtistFavorites } from "@/hooks/useArtistFavorites";
import { useLocalData } from "@/hooks/useLocalData";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";

interface MobileLibraryProps {
  onClose: () => void;
}

export const MobileLibrary = ({ onClose }: MobileLibraryProps) => {
  const navigate = useNavigate();
  const { playTrackList } = usePlayer();
  const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = usePlaylists();
  const { favorites: artistFavorites, removeFavorite: removeArtistFav } = useArtistFavorites();
  const { favorites } = useLocalData();

  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; id: string } | null>(null);

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

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] md:hidden bg-background">
        {/* Full Page Layout */}
        <div className="h-full flex flex-col pb-[120px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0 safe-top">
            <h2 className="text-xl font-bold text-foreground">Your Library</h2>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {/* Liked Songs */}
            <button 
              onClick={() => {
                onClose();
                navigate('/liked');
              }}
              className="flex items-center gap-4 w-full p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <Heart size={24} className="text-primary-foreground" fill="currentColor" />
              </div>
              <div className="text-left flex-1">
                <p className="text-base font-semibold text-foreground">Liked Songs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {favorites.length === 0 ? "No liked songs yet" : `${favorites.length} ${favorites.length === 1 ? 'song' : 'songs'}`}
                </p>
              </div>
              {favorites.length > 0 && <Play size={20} className="text-primary" fill="currentColor" />}
            </button>

            {/* Create Playlist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Playlists</h3>
                <button
                  onClick={() => setShowCreateInput(!showCreateInput)}
                  className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title="Create playlist"
                >
                  <Plus size={18} />
                </button>
              </div>

              {showCreateInput && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-card border border-primary/30">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Enter playlist name"
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={handleCreate} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Check size={18} />
                  </button>
                  <button onClick={() => { setShowCreateInput(false); setNewPlaylistName(""); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>
              )}

              {playlists.length === 0 && !showCreateInput && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <Music2 size={28} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No playlists yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tap + to create your first playlist</p>
                </div>
              )}

              <div className="space-y-2">
              {playlists.map((pl) => (
                <div key={pl.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
                  {editingId === pl.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(pl.id);
                          if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                        }}
                        className="flex-1 text-sm px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                      <button onClick={() => handleRename(pl.id)} className="p-2 rounded-lg bg-primary text-primary-foreground"><Check size={16} /></button>
                      <button onClick={() => { setEditingId(null); setEditName(""); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Music2 size={20} className="text-primary" />
                      </div>
                      <button
                        onClick={() => playTrackList(pl.tracks, 0)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pl.tracks.length} songs</p>
                      </button>
                      <button
                        onClick={() => { setEditingId(pl.id); setEditName(pl.name); }}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        title="Rename"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
              </div>
            </div>

            {/* Saved Artists */}
            {artistFavorites.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Saved Artists</h3>
                <div className="space-y-2">
                  {artistFavorites.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
                      <button
                        onClick={() => setSelectedArtist({ name: a.name, id: a.id })}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <img src={a.image} alt={a.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">Artist</p>
                        </div>
                      </button>
                      <button
                        onClick={() => removeArtistFav(a.id)}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedArtist && createPortal(
        <ArtistPlaylist
          artistName={selectedArtist.name}
          searchQuery={selectedArtist.name}
          artistId={selectedArtist.id}
          onClose={() => setSelectedArtist(null)}
        />,
        document.body
      )}
    </>,
    document.body
  );
};
