
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/context/PlayerContext";
import { DJMixerProvider } from "@/context/DJMixerContext";
import { AppShell } from "@/components/AppShell";
import { MainContent } from "@/components/MainContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load heavy routes — only download when navigated to
const DJMixerPage = lazy(() => import("@/components/DJMixerPage").then(m => ({ default: m.DJMixerPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const YoutubeMusicPage = lazy(() => import("@/pages/YoutubeMusicPage"));
const LikedSongsPage = lazy(() => import("@/pages/LikedSongsPage").then(m => ({ default: m.LikedSongsPage })));
const DownloadsPage = lazy(() => import("@/pages/DownloadsPage").then(m => ({ default: m.DownloadsPage })));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PlayerProvider>
          <DJMixerProvider>
            <Routes>
              <Route path="/" element={
                <AppShell>
                  <ErrorBoundary>
                    <MainContent />
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="/search" element={
                <AppShell>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <SearchPage />
                    </Suspense>
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="/dj" element={
                <AppShell>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <DJMixerPage />
                    </Suspense>
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="/youtube" element={
                <AppShell>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <YoutubeMusicPage />
                    </Suspense>
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="/liked" element={
                <AppShell>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <LikedSongsPage />
                    </Suspense>
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="/downloads" element={
                <AppShell>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <DownloadsPage />
                    </Suspense>
                  </ErrorBoundary>
                </AppShell>
              } />
              <Route path="*" element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <NotFound />
                  </Suspense>
                </ErrorBoundary>
              } />
            </Routes>
          </DJMixerProvider>
        </PlayerProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

