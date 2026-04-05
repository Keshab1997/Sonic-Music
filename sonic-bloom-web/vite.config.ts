import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "youtube-search-api",
      configureServer(server) {
        server.middlewares.use("/api/youtube-search", async (req, res) => {
          const url = new URL(req.url || "", `http://${req.headers.host}`);
          const query = url.searchParams.get("q");
          if (!query) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing q parameter" }));
            return;
          }

          try {
            const yts = (await import("yt-search")).default;
            const result = await yts({ query, category: "music" });
            const videos = result.videos.slice(0, 20).map((v: {
              videoId: string;
              title: string;
              author: { name: string };
              seconds: number;
              thumbnail: string;
            }) => ({
              videoId: v.videoId,
              title: v.title,
              author: v.author.name,
              duration: v.seconds,
              thumbnail: v.thumbnail,
            }));
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify(videos));
          } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Search failed", details: String(err) }));
          }
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx_dev_runtime"],
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
          "router": ["react-router-dom"],
          "radix-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
            "@radix-ui/react-slider",
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-separator",
            "@radix-ui/react-switch",
          ],
          "query": ["@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));