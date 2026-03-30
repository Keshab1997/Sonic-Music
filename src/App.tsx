import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/context/PlayerContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { BottomPlayer } from "@/components/BottomPlayer";
import { MainContent } from "@/components/MainContent";
import { SearchPage } from "@/pages/SearchPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PlayerProvider>
          <Routes>
            <Route path="/" element={
              <div className="flex h-screen overflow-hidden bg-background">
                <AppSidebar />
                <MainContent />
                <MobileNav />
                <BottomPlayer />
              </div>
            } />
            <Route path="/search" element={
              <div className="flex h-screen overflow-hidden bg-background">
                <AppSidebar />
                <SearchPage />
                <MobileNav />
                <BottomPlayer />
              </div>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PlayerProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
