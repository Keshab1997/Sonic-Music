
import { Share2, Copy, Check } from "lucide-react-native";
import { useState, useCallback } from "react";
import type { Track } from "@/data/playlist";

interface ShareButtonProps {
  track: Track;
  className?: string;
  iconSize?: number;
}

export function ShareButton({ track, className = "", iconSize = 16 }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareText = `${track.title} by ${track.artist} — Sonic Bloom`;
    const shareUrl = track.songId
      ? `https://www.jiosaavn.com/song/${track.songId}`
      : window.location.href;

    // Try native Web Share API (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or not supported
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [track]);

  return (
    <button
      onClick={handleShare}
      className={`p-2 rounded-full hover:bg-white/10 transition-colors ${className}`}
      title="Share song"
    >
      {copied ? (
        <Check size={iconSize} className="text-green-400" />
      ) : (
        <Share2 size={iconSize} />
      )}
    </button>
  );
}

