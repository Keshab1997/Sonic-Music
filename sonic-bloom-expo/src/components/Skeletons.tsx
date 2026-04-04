
export function SectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2.5 md:gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-28 md:w-36 animate-pulse">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg bg-muted mb-1.5 md:mb-2" />
          <div className="h-3 bg-muted rounded w-3/4 mb-1" />
          <div className="h-2 bg-muted/60 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="w-full h-44 md:h-64 rounded-xl bg-muted animate-pulse mb-6 md:mb-8" />
  );
}

export function ArtistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted mb-1.5" />
          <div className="h-2.5 bg-muted rounded w-14" />
        </div>
      ))}
    </div>
  );
}

export function SongRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
          <div className="w-10 h-10 rounded bg-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-muted rounded w-3/4 mb-1.5" />
            <div className="h-2 bg-muted/60 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

