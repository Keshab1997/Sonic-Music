import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Languages } from "lucide-react";
import type { LyricLine } from "@/lib/lyricsParser";
import { transliterate, hasDevanagari } from "@/lib/transliterate";

interface SyncedLyricsProps {
  lines: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  className?: string;
  variant?: "light" | "dark";
}

function findActiveLine(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

const variantStyles = {
  dark: {
    active: "text-white font-bold",
    past: "text-white/30",
    upcoming: "text-white/50",
    hover: "hover:text-white/80",
  },
  light: {
    active: "text-foreground font-bold lyric-active",
    past: "text-muted-foreground/40",
    upcoming: "text-muted-foreground/60",
    hover: "hover:text-foreground/80",
  },
};

export function SyncedLyrics({
  lines,
  currentTime,
  isPlaying,
  onSeek,
  className = "",
  variant = "light",
}: SyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const lastScrollTime = useRef(0);
  const userScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [showRoman, setShowRoman] = useState(false);

  const activeIdx = findActiveLine(lines, currentTime);
  const styles = variantStyles[variant];

  // Check if any line contains Devanagari
  const hasDevanagariLyrics = useMemo(
    () => lines.some((l) => hasDevanagari(l.text)),
    [lines]
  );

  // Transliterated lines
  const displayLines = useMemo(() => {
    if (!showRoman) return lines;
    return lines.map((l) => ({
      ...l,
      text: hasDevanagari(l.text) ? transliterate(l.text) : l.text,
    }));
  }, [lines, showRoman]);

  // Auto-scroll to active line
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    if (userScrolling.current) return;

    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;
    lastScrollTime.current = now;

    activeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIdx]);

  const handleScroll = useCallback(() => {
    userScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      userScrolling.current = false;
    }, 3000);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [handleScroll]);

  if (lines.length === 0) return null;

  const toggleBtnBase =
    variant === "dark"
      ? "text-white/50 hover:text-white bg-white/10 hover:bg-white/20"
      : "text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted";

  return (
    <div className="relative h-full">
      {/* Transliteration toggle */}
      {hasDevanagariLyrics && (
        <button
          onClick={() => setShowRoman(!showRoman)}
          className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${toggleBtnBase} ${showRoman ? "ring-1 ring-primary/50" : ""}`}
          title={showRoman ? "Show original script" : "Show Roman script"}
        >
          <Languages size={12} />
          {showRoman ? "हिन्दी" : "ABC"}
        </button>
      )}

      <div
        ref={containerRef}
        className={`overflow-y-auto scrollbar-hide ${className}`}
      >
        <div className="py-[40%]">
          {displayLines.map((line, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <button
                key={`${line.time}-${i}`}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSeek?.(line.time)}
                disabled={!onSeek}
                className={`block w-full text-left px-4 py-2.5 transition-all duration-500 ease-out
                  ${isActive ? styles.active : isPast ? styles.past : styles.upcoming}
                  ${isActive ? "text-lg scale-[1.02] opacity-100" : "text-base opacity-70"}
                  ${onSeek ? `cursor-pointer ${styles.hover}` : "cursor-default"}
                `}
              >
                {line.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
