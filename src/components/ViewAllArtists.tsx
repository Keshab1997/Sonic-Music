import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Search } from "lucide-react";
import { Artist } from "@/data/homeData";

interface ViewAllArtistsProps {
  onSelectArtist: (artist: Artist & { artistId?: string }) => void;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getImage = (images: { quality: string; link: string }[], prefer = "500x500") =>
  images?.find((img) => img.quality === prefer)?.link ||
  images?.find((img) => img.quality === "150x150")?.link ||
  images?.[images.length - 1]?.link || "";

interface ApiArtist {
  id: string;
  name: string;
  image: { quality: string; link: string }[];
}

export const ViewAllArtists = ({ onSelectArtist, onClose }: ViewAllArtistsProps) => {
  const [search, setSearch] = useState("");
  const [artists, setArtists] = useState<(Artist & { artistId: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchArtists = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArtists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search/artists?query=${encodeURIComponent(query)}&page=1&limit=30`
      );
      const json = await res.json();
      const results: ApiArtist[] = json?.data?.results ?? [];
      const mapped = results.map((a) => ({
        name: a.name,
        image: getImage(a.image),
        searchQuery: a.name,
        language: "hindi" as const,
        artistId: a.id,
      }));
      setArtists(mapped);
    } catch {
      setArtists([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchArtists(search);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchArtists]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-24 md:pb-28">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-120px)] glass-heavy border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Top Indian Artists</h2>
              <p className="text-xs text-muted-foreground">Search any artist globally</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artists..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!search.trim() ? null : loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
          ) : artists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No artist found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {artists.map((artist) => (
                <button
                  key={artist.artistId}
                  onClick={() => onSelectArtist(artist)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-accent transition-colors group text-left"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                    {artist.image && (
                      <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{artist.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
