import { useState } from "react";
import { Shuffle, Trash2, X, ChevronUp, ChevronDown, ListMusic } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { toast } from "@/hooks/use-toast";

interface QueueManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const QueueManager = ({ isOpen, onClose }: QueueManagerProps) => {
  const {
    queue,
    playTrack,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
    shuffleQueue,
    currentTrack,
  } = usePlayer();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 z-[101] md:z-50 w-[calc(100vw-1.5rem)] max-w-80 max-h-[60vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-bold text-foreground">Queue</h3>
        <div className="flex items-center gap-1.5">
          {queue.length > 1 && (
            <button
              onClick={shuffleQueue}
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Shuffle queue"
            >
              <Shuffle size={14} />
            </button>
          )}
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Clear queue"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <ListMusic size={24} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Queue is empty</p>
          </div>
        ) : (
          queue.map((track, i) => (
            <div
              key={`${track.src}-${i}`}
              onClick={() => {
                removeFromQueue(i);
                playTrack(track);
              }}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent group cursor-pointer transition-colors"
            >
              <img
                src={track.cover}
                alt=""
                width={36}
                height={36}
                loading="lazy"
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {track.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {track.artist}
                </p>
              </div>
              <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                {i > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQueueItem(i, i - 1);
                    }}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                )}
                {i < queue.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQueueItem(i, i + 1);
                    }}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(i);
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};