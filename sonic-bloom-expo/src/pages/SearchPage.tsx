
import { useState, FormEvent, useCallback } from "react";
import { Search, Play, Clock, Loader2, AlertCircle, Pause, Heart, X, Trash2, History, MoreHorizontal, ListPlus, PlaySquare, Plus, ChevronRight } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";
import { useMusicSearch } from "@/hooks/useMusicSearch";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { Track } from "@/data/playlist";
import { ActressesModal } from "@/components/ActressesModal";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";

const formatDuration = (seconds: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SongRow = (
  {
    track,
    index,
    isFavorite,
    onToggleFavorite,
  }: {
    track: Track;
    index: number;
    isFavorite: boolean;
    onToggleFavorite: (track: Track) => void;
  }
) => {
  const { playTrack, currentTrack, isPlaying, pause, playNext, addToQueue } = usePlayer();
  const { playlists, addToPlaylist, createPlaylist } = usePlaylists();
  const isActive = currentTrack?.src === track.src;
  const isCurrentlyPlaying = isActive && isPlaying;
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
        isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
      }`}
    >
      <div
        onClick={() => {
          if (isActive) {
            if (isPlaying) {
              pause();
            } else {
              playTrack(track);
            }
          } else {
            playTrack(track);
          }
        }}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          {track.cover ? (
            <img src={track.cover} alt={track.title} loading="lazy" className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
              <Play size={18} className="text-muted-foreground" />
            </div>
          )}
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center gap-0.5">
              <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" />
              <span className="w-0.5 h-4 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
              <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
              <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.45s" }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {track.artist} {track.album ? `· ${track.album}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock size={12} />
          <span className="text-xs tabular-nums">{formatDuration(track.duration)}</span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(track);
        }}
        className={`p-2 rounded-full transition-colors ${
          isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-400"
        }`}
      >
        <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
      </button>

      {/* Context menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
            setShowPlaylistSubmenu(false);
          }}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowPlaylistSubmenu(false); }} />
            <div className="absolute right-0 top-full mt-1 z-50 w-48 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden">
              <button
                onClick={() => { playNext(track); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <PlaySquare size={14} />
                Play Next
              </button>
              <button
                onClick={() => { addToQueue(track); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <ListPlus size={14} />
                Add to Queue
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => setShowPlaylistSubmenu(!showPlaylistSubmenu)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <Plus size={14} />
                Add to Playlist
              </button>
              {showPlaylistSubmenu && (
                <div className="border-t border-border max-h-40 overflow-y-auto">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => { addToPlaylist(pl.id, track); setShowMenu(false); setShowPlaylistSubmenu(false); }}
                      className="w-full text-left px-5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate"
                    >
                      {pl.name}
                    </button>
                  ))}
                  {playlists.length === 0 && (
                    <p className="px-5 py-2 text-[10px] text-muted-foreground/50">No playlists</p>
                  )}
                  <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPlaylistName.trim()) {
                          const pl = createPlaylist(newPlaylistName.trim());
                          addToPlaylist(pl.id, track);
                          setNewPlaylistName("");
                          setShowMenu(false);
                          setShowPlaylistSubmenu(false);
                        }
                      }}
                      placeholder="New playlist..."
                      className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"search" | "favorites">("search");
  const { results, loading, error, search, loadMore, hasMore } = useMusicSearch();
  const { playTrackList } = usePlayer();
  const {
    searchHistory,
    favorites,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    isFavorite,
    toggleFavorite,
  } = useLocalData();
  const [hasSearched, setHasSearched] = useState(false);
  const [showActressesModal, setShowActressesModal] = useState(false);
  const [actressPlaylist, setActressPlaylist] = useState<{ name: string; query: string } | null>(null);


  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setView("search");
    setHasSearched(true);
    addToHistory(query.trim());
    search(query);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setView("search");
    setHasSearched(true);
    addToHistory(historyQuery);
    search(historyQuery);
  };

  const currentResults = results;
  const currentLoading = loading;
  const currentError = error;

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
      <div className="px-4 md:px-6 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("search")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === "search" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              Search
            </div>
          </button>
          <button
            onClick={() => setView("favorites")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === "favorites" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Heart size={16} />
              Favorites ({favorites.length})
            </div>
          </button>
        </div>

        {/* Search Tab */}
        {view === "search" && (
          <>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for any song, artist, or album..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={currentLoading || !query.trim()}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {currentLoading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
              </button>
            </form>


            {/* Search History */}
            {!hasSearched && searchHistory.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <History size={14} />
                    Recent Searches
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-card border border-border hover:bg-accent transition-colors"
                    >
                      <button
                        onClick={() => handleHistoryClick(h)}
                        className="text-sm text-foreground"
                      >
                        {h}
                      </button>
                      <button
                        onClick={() => removeHistoryItem(h)}
                        className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {currentError && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
                <AlertCircle size={18} />
                <p className="text-sm">{currentError}</p>
              </div>
            )}

            {/* Loading */}
            {currentLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            )}

            {/* No results */}
            {!currentLoading && hasSearched && currentResults.length === 0 && !currentError && (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No results found for "{query}"</p>
              </div>
            )}

            {/* Initial state */}
            {!hasSearched && !currentLoading && searchHistory.length === 0 && (
              <>
                <div className="text-center py-12">
                  <Search size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Search for any song to start playing</p>
                </div>

                {/* Actress & Singers Section */}
                <div className="mt-12 pt-8 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎤</span>
                      <h3 className="text-lg font-bold text-foreground">Actress & Singers</h3>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-600/20 text-pink-400 font-bold">NEW</span>
                    </div>
                    <button
                      onClick={() => setShowActressesModal(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                    >
                      View All <ChevronRight size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Search and explore all artists</p>
                  <button
                    onClick={() => setShowActressesModal(true)}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-pink-600/20 to-pink-600/10 border border-pink-600/30 hover:border-pink-600/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
                        <Search size={16} className="text-pink-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Search Actress & Singers</p>
                        <p className="text-xs text-muted-foreground">Find and explore all artists</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Results */}
            {currentResults.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">
                    {currentResults.length} results for "{query}"
                  </p>
                  <button
                    onClick={() => playTrackList(currentResults, 0)}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Play All
                  </button>
                </div>
                {currentResults.map((track, i) => (
                  <SongRow
                    key={`${track.src}-${i}`}
                    track={track}
                    index={i}
                    isFavorite={isFavorite(track.src)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
                {/* Load More Button */}
                {hasMore && (
                  <div className="py-4">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full py-3 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {loading ? "Loading more..." : "Load More Results"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Favorites Tab */}
        {view === "favorites" && (
          <>
            {favorites.length === 0 ? (
              <div className="text-center py-20">
                <Heart size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No favorites yet</p>
                <p className="text-xs text-muted-foreground mt-1">Search and tap the heart icon to add favorites</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{favorites.length} favorite songs</p>
                  <button
                    onClick={() => playTrackList(favorites, 0)}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Play All
                  </button>
                </div>
                {favorites.map((track, i) => (
                  <SongRow
                    key={`fav-${track.src}-${i}`}
                    track={track}
                    index={i}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showActressesModal && (
        <ActressesModal
          onSelectArtist={(artist) => {
            setShowActressesModal(false);
            setActressPlaylist({ name: artist.name, query: artist.searchQuery });
          }}
          onClose={() => setShowActressesModal(false)}
        />
      )}
      {actressPlaylist && (
        <ArtistPlaylist
          artistName={actressPlaylist.name}
          searchQuery={actressPlaylist.query}
          onClose={() => setActressPlaylist(null)}
        />
      )}
    </main>
  );
};

export default SearchPage;
