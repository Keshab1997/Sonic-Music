
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./lib/orientationLock";

// Mouse wheel → horizontal scroll for all scrollbar-hide sections
document.addEventListener("wheel", (e) => {
  const el = (e.target as Element)?.closest(".scrollbar-hide") as HTMLElement | null;
  if (el && el.scrollWidth > el.clientWidth) {
    e.preventDefault();
    el.scrollLeft += e.deltaY + e.deltaX;
  }
}, { passive: false });

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

