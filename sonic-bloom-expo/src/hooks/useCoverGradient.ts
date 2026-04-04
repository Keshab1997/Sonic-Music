
import { useEffect, useState } from "react";

const getContrastColor = (r: number, g: number, b: number): string => {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "dark" : "light";
};

export const useCoverGradient = (coverUrl: string | undefined) => {
  const [gradient, setGradient] = useState<string>("");
  const [dominantColor, setDominantColor] = useState<{ r: number; g: number; b: number } | null>(null);

  useEffect(() => {
    if (!coverUrl) {
      setGradient("");
      setDominantColor(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Small canvas for speed
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);

        const data = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Sample center area (skip edges for better dominant color)
        for (let y = 8; y < 24; y++) {
          for (let x = 8; x < 24; x++) {
            const i = (y * 32 + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Make darker for gradient
        const dr = Math.round(r * 0.4);
        const dg = Math.round(g * 0.4);
        const db = Math.round(b * 0.4);

        setDominantColor({ r, g, b });
        setGradient(
          `linear-gradient(135deg, rgb(${r},${g},${b}) 0%, rgb(${dr},${dg},${db}) 100%)`
        );
      } catch { /* CORS or other error */ }
    };

    img.onerror = () => {};
    img.src = coverUrl;
  }, [coverUrl]);

  return { gradient, dominantColor };
};

