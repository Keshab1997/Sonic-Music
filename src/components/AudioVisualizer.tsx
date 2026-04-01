
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

export const AudioVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { analyserRef, isPlaying } = usePlayer();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    let running = true;

    const draw = () => {
      if (!running) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      if (!analyser || !isPlaying) {
        const barCount = 64;
        const barW = w / barCount - 2;
        for (let i = 0; i < barCount; i++) {
          const barH = 2 + Math.sin(Date.now() / 1000 + i * 0.3) * 3;
          const x = i * (barW + 2);
          ctx.fillStyle = `hsla(141, 73%, 42%, 0.15)`;
          ctx.fillRect(x, h - barH, barW, barH);
        }
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(data);

      const barCount = Math.min(bufferLength, 64);
      const barW = w / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const val = data[i] / 255;
        const barH = val * h * 0.85 + 2;
        const x = i * (barW + 2);

        const hue = 141 + (i / barCount) * 130;
        const saturation = 73 + val * 15;
        const lightness = 42 + val * 15;

        const gradient = ctx.createLinearGradient(x, h, x, h - barH);
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue + 40}, ${saturation}%, ${lightness + 10}%, 0.5)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, h - barH, barW, barH, [barW / 2, barW / 2, 0, 0]);
        ctx.fill();

        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [analyserRef, isPlaying, isVisible]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-card border border-border">
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none z-10" />
      <canvas ref={canvasRef} className="w-full h-48 md:h-64" />
      <div className="absolute bottom-4 left-4 z-20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {isPlaying ? "Now Playing" : "Audio Visualizer"}
        </p>
      </div>
    </div>
  );
};
