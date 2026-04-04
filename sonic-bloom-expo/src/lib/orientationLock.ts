// Lock screen orientation to portrait for native app feel
if ('screen' in window && 'orientation' in window.screen) {
  // Lock to portrait on mobile devices
  if (window.matchMedia('(max-width: 768px)').matches) {
    screen.orientation.lock('portrait').catch(() => {
      // Orientation lock may fail on some browsers, that's okay
    });
  }
}

// Prevent double-tap zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Prevent pinch zoom
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
