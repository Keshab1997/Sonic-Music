import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Search } from "lucide-react";
import { Artist } from "@/data/homeData";

interface ViewAllArtistsProps {
  onSelectArtist: (artist: Artist) => void;
  onClose: () => void;
}

interface ApiArtist {
  id: string;
  name: string;
  image: { url: string }[];
  role?: string;
  type?: string;
}

export const ViewAllArtists = ({ onSelectArtist, onClose }: ViewAllArtistsProps) => {
  const [search, setSearch] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
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
        `https://saavn.dev/api/search/artists?query=${encodeURIComponent(query)}`
      );
      const json = await res.json();
      const results: ApiArtist[] = json?.data?.results ?? [];
      const mapped: Artist[] = results.map((a) => {
        const lastImage = a.image?.[a.image.length - 1]?.url ?? "";
        return {
          name: a.name,
          image: lastImage,
          searchQuery: a.name,
          language: "hindi" as const,
        };
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
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
          <div className="relative mb-3">
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

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {!search.trim() ? null : loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
          ) : artists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No artist found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {artists.map((artist) => (
                <button
                  key={`${artist.name}-${artist.searchQuery}`}
                  onClick={() => onSelectArtist(artist)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-accent transition-colors group text-left"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{artist.name}</p>
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
