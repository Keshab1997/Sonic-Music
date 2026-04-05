
import { AppSidebar } from "@/components/AppSidebar";
import { MainContent } from "@/components/MainContent";
import { BottomPlayer } from "@/components/BottomPlayer";
import { MobileNav } from "@/components/MobileNav";

// Note: This component is not used in the current routing.
// App.tsx renders MainContent directly with PlayerProvider at the app level.
// This file is kept for potential standalone usage.
const Index = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <MainContent />
      <MobileNav />
      <BottomPlayer />
    </div>
  );
};

export default Index;

