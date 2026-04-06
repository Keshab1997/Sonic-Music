
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/context/PlayerContext";
import { DJMixerProvider } from "@/context/DJMixerContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import { MainContent } from "@/components/MainContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load heavy routes — only download when navigated to
const DJMixerPage = lazy(() => import("@/components/DJMixerPage").then(m => ({ default: m.DJMixerPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then(m => ({ default: m.SearchPage })));
const LikedSongsPage = lazy(() => import("@/pages/LikedSongsPage").then(m => ({ default: m.LikedSongsPage })));
const DownloadsPage = lazy(() => import("@/pages/DownloadsPage").then(m => ({ default: m.DownloadsPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Auth guard component - allows access but shows login prompt for user-specific features
function OptionalAuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PlayerProvider>
            <DJMixerProvider>
              <Routes>
                {/* Auth routes (no AppShell) */}
                <Route path="/login" element={
                  <Suspense fallback={<PageLoader />}>
                    <LoginPage />
                  </Suspense>
                } />
                <Route path="/signup" element={
                  <Suspense fallback={<PageLoader />}>
                    <SignupPage />
                  </Suspense>
                } />
                
                {/* Main app routes - accessible without login */}
                <Route path="/" element={
                  <OptionalAuthRoute>
                    <AppShell>
                      <ErrorBoundary>
                        <MainContent />
                      </ErrorBoundary>
                    </AppShell>
                  </OptionalAuthRoute>
                } />
                <Route path="/search" element={
                  <OptionalAuthRoute>
                    <AppShell>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <SearchPage />
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </OptionalAuthRoute>
                } />
                <Route path="/dj" element={
                  <OptionalAuthRoute>
                    <AppShell>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <DJMixerPage />
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </OptionalAuthRoute>
                } />
                <Route path="/liked" element={
                  <OptionalAuthRoute>
                    <AppShell>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <LikedSongsPage />
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </OptionalAuthRoute>
                } />
                <Route path="/downloads" element={
                  <OptionalAuthRoute>
                    <AppShell>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <DownloadsPage />
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </OptionalAuthRoute>
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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

