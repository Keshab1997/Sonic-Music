import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { BottomPlayer } from "@/components/BottomPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { usePlayer } from "@/context/PlayerContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCoverGradient } from "@/hooks/useCoverGradient";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  useKeyboardShortcuts();

  const { currentTrack } = usePlayer();
  const { gradient } = useCoverGradient(currentTrack?.cover);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative overflow-x-hidden">
      {/* Cover gradient background */}
      {gradient && (
        <div
          className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 z-0"
          style={{ background: gradient }}
        />
      )}

      <AppSidebar />
      <div className="relative flex-1 min-w-0 flex flex-col overflow-x-hidden z-10">
        {children}
      </div>
      <MobileNav />
      <BottomPlayer
        onShowMiniPlayer={() => setShowMiniPlayer(true)}
        onShowEqualizer={() => {}}
      />

      {/* Mini Player */}
      {showMiniPlayer && currentTrack && (
        <MiniPlayer
          onExpand={() => setShowMiniPlayer(false)}
          onClose={() => setShowMiniPlayer(false)}
        />
      )}
    </div>
  );
};
