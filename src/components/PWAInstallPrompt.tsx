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
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

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
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[100] animate-slide-up">
      <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Install Sonic Bloom</h3>
              <p className="text-xs text-zinc-400">Get the app experience</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <ul className="text-xs text-zinc-400 space-y-1.5 mb-4">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            Works offline
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            Home screen access
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 bg-green-500 rounded-full" />
            Faster loading
          </li>
        </ul>
        
        <button
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Install App
        </button>
      </div>
    </div>
  );
}
