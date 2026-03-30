import { useState } from "react";
import { X, Play, Search } from "lucide-react";
import { Artist, allArtists } from "@/data/homeData";

interface ViewAllArtistsProps {
  onSelectArtist: (artist: Artist) => void;
  onClose: () => void;
}

export const ViewAllArtists = ({ onSelectArtist, onClose }: ViewAllArtistsProps) => {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filters = [
    { key: "all", label: "All" },
    { key: "hindi", label: "Hindi" },
    { key: "bengali", label: "Bengali" },
    { key: "punjabi", label: "Punjabi" },
    { key: "tamil", label: "Tamil" },
  ];

  const filtered = allArtists
    .filter((a) => filter === "all" || a.language === filter)
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const grouped: Record<string, Artist[]> = {};
  filtered.forEach((a) => {
    const lang = a.language.charAt(0).toUpperCase() + a.language.slice(1);
    if (!grouped[lang]) grouped[lang] = [];
    grouped[lang].push(a);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Top Indian Artists</h2>
              <p className="text-xs text-muted-foreground">{allArtists.length} artists across Hindi, Bengali, Punjabi & Tamil</p>
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

          {/* Language filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors flex-shrink-0 ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {Object.entries(grouped).map(([lang, artists]) => (
            <div key={lang} className="mb-6 last:mb-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{lang} Artists</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {artists.map((artist) => (
                  <button
                    key={`${artist.name}-${artist.language}`}
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
                      <p className="text-[10px] text-muted-foreground capitalize">{artist.language}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No artists found</p>
          )}
        </div>
      </div>
    </div>
  );
};
