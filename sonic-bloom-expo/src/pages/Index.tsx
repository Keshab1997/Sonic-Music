
import { PlayerProvider } from "@/context/PlayerContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MainContent } from "@/components/MainContent";
import { BottomPlayer } from "@/components/BottomPlayer";
import { MobileNav } from "@/components/MobileNav";

const Index = () => {
  return (
    <PlayerProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <MainContent />
        <MobileNav />
        <BottomPlayer />
      </div>
    </PlayerProvider>
  );
};

export default Index;

