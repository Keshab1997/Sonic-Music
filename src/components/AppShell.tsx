
import { useState, useCallback } from "react";
import { WifiOff } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { BottomPlayer } from "@/components/BottomPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { ShortcutsPanel } from "@/components/ShortcutsPanel";
import { PWAInstallPrompt, usePWAInstall } from "@/components/PWAInstallPrompt";
import { usePlayer } from "@/context/PlayerContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCoverGradient } from "@/hooks/useCoverGradient";
import { useOffline } from "@/hooks/useOffline";
import { useMediaSession } from "@/hooks/useMediaSession";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const { currentTrack, isPlaying, progress, duration, play, pause, next, prev, seek } = usePlayer();
  const { gradient } = useCoverGradient(currentTrack?.cover);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const isOffline = useOffline();
  const { isInstallable, showPrompt, handleInstall, dismiss: dismissPWA } = usePWAInstall();

  // MediaSession for lock screen / bluetooth controls
  useMediaSession({
    currentTrack,
    isPlaying,
    progress,
    duration,
    onPlay: play,
    onPause: pause,
    onNext: next,
    onPrev: prev,
    onSeek: seek,
  });

  // Keyboard shortcuts with callbacks
  useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcuts((s) => !s),
  });

  const handleCloseShortcuts = useCallback(() => setShowShortcuts(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative overflow-x-hidden">
      {/* Cover gradient background */}
      {gradient && (
        <div
          className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 z-0"
          style={{ background: gradient }}
        />
      )}

      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[80] bg-destructive text-destructive-foreground text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 safe-top">
          <WifiOff size={13} />
          No internet connection — some features may not work
        </div>
      )}

      <AppSidebar />
      <div className={`relative flex-1 min-w-0 flex flex-col overflow-x-hidden z-10 ${isOffline ? "pt-8" : ""}`}>
        {children}
      </div>
      <MobileNav onClosePlaylist={() => setShowPlaylist(false)} />
      <BottomPlayer
        onShowMiniPlayer={() => setShowMiniPlayer(true)}
        onShowEqualizer={() => {}}
        showPlaylist={showPlaylist}
        setShowPlaylist={setShowPlaylist}
      />

      {/* Mini Player */}
      {showMiniPlayer && currentTrack && (
        <MiniPlayer
          onExpand={() => setShowMiniPlayer(false)}
          onClose={() => setShowMiniPlayer(false)}
        />
      )}

      {/* Keyboard shortcuts help */}
      {showShortcuts && <ShortcutsPanel onClose={handleCloseShortcuts} />}

      {/* PWA Install Prompt */}
      {isInstallable && showPrompt && (
        <PWAInstallPrompt onInstall={handleInstall} onDismiss={dismissPWA} />
      )}
    </div>
  );
};

