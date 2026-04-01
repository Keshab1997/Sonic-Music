import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Heart, Pencil, Trash2, Check, User, Play, Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useArtistFavorites } from "@/hooks/useArtistFavorites";
import { useLocalData } from "@/hooks/useLocalData";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";

interface MobileLibraryProps {
  onClose: () => void;
}

export const MobileLibrary = ({ onClose }: MobileLibraryProps) => {
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
      <div className="fixed inset-0 z-[70] md:hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-background rounded-t-2xl border-t border-border overflow-hidden flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-bold text-foreground">Your Library</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Liked Songs */}
            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Heart size={18} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Liked Songs</p>
                <p className="text-[10px] text-muted-foreground">{favorites.length} songs</p>
              </div>
            </button>

            {/* Create Playlist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Playlists</span>
                <button
                  onClick={() => setShowCreateInput(!showCreateInput)}
                  className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showCreateInput && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Playlist name"
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={handleCreate} className="p-2 text-primary">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setShowCreateInput(false); setNewPlaylistName(""); }} className="p-2 text-muted-foreground">
                    <X size={16} />
                  </button>
                </div>
              )}

              {playlists.length === 0 && !showCreateInput && (
                <p className="text-xs text-muted-foreground/60 py-2">No playlists yet. Tap + to create one.</p>
              )}

              {playlists.map((pl) => (
                <div key={pl.id} className="flex items-center gap-2 py-2">
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
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <button onClick={() => handleRename(pl.id)} className="p-1 text-primary"><Check size={14} /></button>
                      <button onClick={() => { setEditingId(null); setEditName(""); }} className="p-1 text-muted-foreground"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded bg-card flex items-center justify-center flex-shrink-0">
                        <Music2 size={14} className="text-muted-foreground" />
                      </div>
                      <button
                        onClick={() => playTrackList(pl.tracks, 0)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm text-foreground truncate">{pl.name}</p>
                        <p className="text-[10px] text-muted-foreground">{pl.tracks.length} songs</p>
                      </button>
                      <button
                        onClick={() => { setEditingId(pl.id); setEditName(pl.name); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-accent transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Saved Artists */}
            {artistFavorites.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Artists</span>
                <div className="mt-2 space-y-1">
                  {artistFavorites.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-2 group">
                      <button
                        onClick={() => setSelectedArtist({ name: a.name, id: a.id })}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <img src={a.image} alt={a.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{a.name}</span>
                      </button>
                      <button
                        onClick={() => removeArtistFav(a.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-full transition-colors"
                      >
                        <X size={12} />
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
