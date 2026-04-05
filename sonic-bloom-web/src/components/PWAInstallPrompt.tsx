import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      // Auto-show prompt after a short delay if not already shown
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return { isInstallable, showPrompt, handleInstall, dismiss };
}

interface PWAInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Smartphone size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Install Sonic Bloom</h3>
                <p className="text-xs text-muted-foreground">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Features list */}
        <div className="p-5 pt-2">
          <ul className="space-y-3 mb-5">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-500 text-sm">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Works Offline</p>
                <p className="text-xs text-muted-foreground">Listen to downloaded songs without internet</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-500 text-sm">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Home Screen Access</p>
                <p className="text-xs text-muted-foreground">Quick access from your device home screen</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-500 text-sm">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Faster Loading</p>
                <p className="text-xs text-muted-foreground">Optimized performance with caching</p>
              </div>
            </li>
          </ul>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={onInstall}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Download size={16} />
              Install Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
