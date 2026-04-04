# Sonic Bloom Player

A modern, feature-rich music player application built with React, TypeScript, and Vite. Stream music from YouTube, download tracks for offline playback, and enjoy a premium listening experience with equalizer, crossfade, and more.

## Features

- **YouTube Music Integration** - Search and stream music directly from YouTube
- **Offline Playback** - Download tracks for offline listening with IndexedDB storage
- **Audio Equalizer** - 3-band EQ with presets (Rock, Pop, Bass, Vocal, etc.)
- **Crossfade** - Smooth transitions between tracks with true overlap crossfade
- **Queue Management** - Add, reorder, shuffle, and manage your playback queue
- **Sleep Timer** - Auto-stop playback after a set duration
- **Playback Speed** - Adjust speed from 0.5x to 2.0x
- **Audio Quality Selection** - Choose between 96, 160, or 320 kbps
- **PWA Support** - Install as a native app on your device
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Keyboard Shortcuts** - Full keyboard control for playback
- **Media Session API** - Lock screen and Bluetooth controls
- **Dynamic Backgrounds** - Album art-based gradient backgrounds

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router DOM v6
- **State**: React Query + Context API
- **Testing**: Vitest + Playwright
- **Backend**: Vercel Serverless Functions
- **Storage**: IndexedDB for offline downloads

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Vercel account for deployment

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

Create a `.env.local` file:

```env
ALLOWED_ORIGIN=https://your-domain.com
```

## Project Structure

```
sonic-bloom-player/
├── api/                    # Vercel serverless functions
│   ├── lib/               # Shared API utilities
│   │   ├── invidious.ts   # Invidious instances & config
│   │   └── rate-limiter.ts # Rate limiting middleware
│   ├── youtube-search.ts  # YouTube search endpoint
│   ├── yt-stream.ts       # Audio stream extraction
│   └── proxy-yt-download.ts # Download proxy
├── src/
│   ├── components/        # React components
│   ├── context/           # React contexts (PlayerContext, DJMixerContext)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Route pages
│   ├── lib/               # Utilities & constants
│   ├── data/              # Static data (playlists, etc.)
│   └── types/             # TypeScript type declarations
└── public/                # Static assets
```

## API Routes

| Endpoint | Description | Rate Limit |
|----------|-------------|------------|
| `/api/youtube-search` | Search YouTube for music | 30 req/min |
| `/api/yt-stream` | Get audio stream URL | 20 req/min |
| `/api/proxy-yt-download` | Proxy audio download | 10 req/min |
| `/api/proxy-audio` | Proxy audio streaming | 50 req/min |

## Key Features Explained

### Offline Downloads
- Uses IndexedDB for persistent storage
- Supports download resume on failure
- Progress tracking with streaming
- Storage limit warnings at 500MB and 800MB

### Crossfade
- True overlap crossfade with dual audio elements
- Preloads next track while fading out current
- Configurable duration (0s, 3s, 5s)

### Rate Limiting
- In-memory rate limiter for API routes
- Per-IP tracking with configurable windows
- Returns `X-RateLimit-*` headers

### PWA
- Installable on mobile and desktop
- Works offline with cached assets
- Auto-prompt for installation

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `→` | Next track |
| `←` | Previous track |
| `↑` | Volume up |
| `↓` | Volume down |
| `S` | Toggle shuffle |
| `R` | Toggle repeat |
| `?` | Show shortcuts |

## Deployment

### Vercel

The project is configured for easy deployment on Vercel:

```bash
vercel deploy
```

### Environment Setup

Set the `ALLOWED_ORIGIN` environment variable in Vercel dashboard to your production domain.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

**Created by Keshab Sarkar**

## License

This project is open source and available under the MIT License.
