
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Track, playlist } from "@/data/playlist";

export type DeckId = "A" | "B";

interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
}

interface DJMixerContextType {
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number;
  masterVolume: number;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  availableTracks: Track[];
  // Deck A controls
  loadTrackA: (track: Track) => void;
  playA: () => void;
  pauseA: () => void;
  seekA: (time: number) => void;
  setVolumeA: (v: number) => void;
  setEqBassA: (v: number) => void;
  setEqMidA: (v: number) => void;
  setEqTrebleA: (v: number) => void;
  // Deck B controls
  loadTrackB: (track: Track) => void;
  playB: () => void;
  pauseB: () => void;
  seekB: (time: number) => void;
  setVolumeB: (v: number) => void;
  setEqBassB: (v: number) => void;
  setEqMidB: (v: number) => void;
  setEqTrebleB: (v: number) => void;
  // Master controls
  setCrossfader: (v: number) => void;
  setMasterVolume: (v: number) => void;
}

const DJMixerContext = createContext<DJMixerContextType | null>(null);

export const useDJMixer = () => {
  const ctx = useContext(DJMixerContext);
  if (!ctx) throw new Error("useDJMixer must be used within DJMixerProvider");
  return ctx;
};

interface DeckRefs {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  bassFilterRef: React.MutableRefObject<BiquadFilterNode | null>;
  midFilterRef: React.MutableRefObject<BiquadFilterNode | null>;
  trebleFilterRef: React.MutableRefObject<BiquadFilterNode | null>;
  gainRef: React.MutableRefObject<GainNode | null>;
}

const useDeckRefs = (): DeckRefs => ({
  audioRef: useRef<HTMLAudioElement | null>(null),
  sourceRef: useRef<MediaElementAudioSourceNode | null>(null),
  bassFilterRef: useRef<BiquadFilterNode | null>(null),
  midFilterRef: useRef<BiquadFilterNode | null>(null),
  trebleFilterRef: useRef<BiquadFilterNode | null>(null),
  gainRef: useRef<GainNode | null>(null),
});

export const DJMixerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const initializedRef = useRef(false);

  const deckARefs = useDeckRefs();
  const deckBRefs = useDeckRefs();

  const [deckA, setDeckA] = useState<DeckState>({
    track: null, isPlaying: false, progress: 0, duration: 0,
    volume: 0.8, eqBass: 0, eqMid: 0, eqTreble: 0,
  });
  const [deckB, setDeckB] = useState<DeckState>({
    track: null, isPlaying: false, progress: 0, duration: 0,
    volume: 0.8, eqBass: 0, eqMid: 0, eqTreble: 0,
  });
  const [crossfader, setCrossfaderState] = useState(0.5);
  const [masterVolume, setMasterVolumeState] = useState(0.8);

  const crossfaderRef = useRef(0.5);
  const deckAVolumeRef = useRef(0.8);
  const deckBVolumeRef = useRef(0.8);

  const updateCrossfaderGains = useCallback(() => {
    const cf = crossfaderRef.current;
    const aGain = Math.cos(cf * Math.PI / 2);
    const bGain = Math.sin(cf * Math.PI / 2);
    if (deckARefs.gainRef.current) {
      deckARefs.gainRef.current.gain.value = aGain * deckAVolumeRef.current;
    }
    if (deckBRefs.gainRef.current) {
      deckBRefs.gainRef.current.gain.value = bGain * deckBVolumeRef.current;
    }
  }, []);

  const setupAudioContext = useCallback(() => {
    if (initializedRef.current) return;
    try {
      const ctx = new AudioContext();

      // Master chain
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      // Deck A filters + gain
      const bassA = ctx.createBiquadFilter();
      bassA.type = "lowshelf"; bassA.frequency.value = 320;
      const midA = ctx.createBiquadFilter();
      midA.type = "peaking"; midA.frequency.value = 1000; midA.Q.value = 1;
      const trebleA = ctx.createBiquadFilter();
      trebleA.type = "highshelf"; trebleA.frequency.value = 3200;
      const gainA = ctx.createGain();
      gainA.gain.value = 0.8 * Math.cos(0.5 * Math.PI / 2);

      // Deck B filters + gain
      const bassB = ctx.createBiquadFilter();
      bassB.type = "lowshelf"; bassB.frequency.value = 320;
      const midB = ctx.createBiquadFilter();
      midB.type = "peaking"; midB.frequency.value = 1000; midB.Q.value = 1;
      const trebleB = ctx.createBiquadFilter();
      trebleB.type = "highshelf"; trebleB.frequency.value = 3200;
      const gainB = ctx.createGain();
      gainB.gain.value = 0.8 * Math.sin(0.5 * Math.PI / 2);

      // Connect deck A chain
      deckARefs.bassFilterRef.current = bassA;
      deckARefs.midFilterRef.current = midA;
      deckARefs.trebleFilterRef.current = trebleA;
      deckARefs.gainRef.current = gainA;

      // Connect deck B chain
      deckBRefs.bassFilterRef.current = bassB;
      deckBRefs.midFilterRef.current = midB;
      deckBRefs.trebleFilterRef.current = trebleB;
      deckBRefs.gainRef.current = gainB;

      // Both decks -> master gain -> analyser -> destination
      gainA.connect(masterGain);
      gainB.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
      analyserRef.current = analyser;
      initializedRef.current = true;
    } catch {
      // ignore
    }
  }, []);

  const getAudioSrc = (track: Track): string => {
    if (track.audioUrls) {
      return track.audioUrls["160kbps"] || track.audioUrls["96kbps"] || track.audioUrls["320kbps"] || track.src;
    }
    if (track.src.includes("soundhelix.com")) {
      const path = new URL(track.src).pathname;
      return `/api/proxy-audio?path=${encodeURIComponent(path)}`;
    }
    return track.src;
  };

  const connectDeck = useCallback((refs: DeckRefs, track: Track) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Disconnect existing source
    if (refs.sourceRef.current) {
      refs.sourceRef.current.disconnect();
    }
    if (refs.audioRef.current) {
      refs.audioRef.current.pause();
      refs.audioRef.current.src = "";
    }

    // Create new audio element
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.src = getAudioSrc(track);
    refs.audioRef.current = audio;

    // Create source and connect chain
    const source = ctx.createMediaElementSource(audio);
    refs.sourceRef.current = source;

    source.connect(refs.bassFilterRef.current!);
    refs.bassFilterRef.current!.connect(refs.midFilterRef.current!);
    refs.midFilterRef.current!.connect(refs.trebleFilterRef.current!);
    refs.trebleFilterRef.current!.connect(refs.gainRef.current!);

    // Event listeners
    const onTime = () => {
      const setter = refs === deckARefs ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, progress: audio.currentTime }));
    };
    const onMeta = () => {
      const setter = refs === deckARefs ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, duration: audio.duration }));
    };
    const onEnd = () => {
      const setter = refs === deckARefs ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, isPlaying: false }));
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
  }, []);

  // Deck A controls
  const loadTrackA = useCallback((track: Track) => {
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    setDeckA(prev => ({ ...prev, track, progress: 0, duration: track.duration || 0, isPlaying: false }));
    connectDeck(deckARefs, track);
  }, [setupAudioContext, connectDeck]);

  const playA = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    deckARefs.audioRef.current?.play().catch(() => {});
    setDeckA(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pauseA = useCallback(() => {
    deckARefs.audioRef.current?.pause();
    setDeckA(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const seekA = useCallback((time: number) => {
    if (deckARefs.audioRef.current) deckARefs.audioRef.current.currentTime = time;
    setDeckA(prev => ({ ...prev, progress: time }));
  }, []);

  const setVolumeA = useCallback((v: number) => {
    deckAVolumeRef.current = v;
    setDeckA(prev => ({ ...prev, volume: v }));
    updateCrossfaderGains();
  }, [updateCrossfaderGains]);

  const setEqBassA = useCallback((v: number) => {
    if (deckARefs.bassFilterRef.current) deckARefs.bassFilterRef.current.gain.value = v;
    setDeckA(prev => ({ ...prev, eqBass: v }));
  }, []);

  const setEqMidA = useCallback((v: number) => {
    if (deckARefs.midFilterRef.current) deckARefs.midFilterRef.current.gain.value = v;
    setDeckA(prev => ({ ...prev, eqMid: v }));
  }, []);

  const setEqTrebleA = useCallback((v: number) => {
    if (deckARefs.trebleFilterRef.current) deckARefs.trebleFilterRef.current.gain.value = v;
    setDeckA(prev => ({ ...prev, eqTreble: v }));
  }, []);

  // Deck B controls
  const loadTrackB = useCallback((track: Track) => {
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    setDeckB(prev => ({ ...prev, track, progress: 0, duration: track.duration || 0, isPlaying: false }));
    connectDeck(deckBRefs, track);
  }, [setupAudioContext, connectDeck]);

  const playB = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    deckBRefs.audioRef.current?.play().catch(() => {});
    setDeckB(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pauseB = useCallback(() => {
    deckBRefs.audioRef.current?.pause();
    setDeckB(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const seekB = useCallback((time: number) => {
    if (deckBRefs.audioRef.current) deckBRefs.audioRef.current.currentTime = time;
    setDeckB(prev => ({ ...prev, progress: time }));
  }, []);

  const setVolumeB = useCallback((v: number) => {
    deckBVolumeRef.current = v;
    setDeckB(prev => ({ ...prev, volume: v }));
    updateCrossfaderGains();
  }, [updateCrossfaderGains]);

  const setEqBassB = useCallback((v: number) => {
    if (deckBRefs.bassFilterRef.current) deckBRefs.bassFilterRef.current.gain.value = v;
    setDeckB(prev => ({ ...prev, eqBass: v }));
  }, []);

  const setEqMidB = useCallback((v: number) => {
    if (deckBRefs.midFilterRef.current) deckBRefs.midFilterRef.current.gain.value = v;
    setDeckB(prev => ({ ...prev, eqMid: v }));
  }, []);

  const setEqTrebleB = useCallback((v: number) => {
    if (deckBRefs.trebleFilterRef.current) deckBRefs.trebleFilterRef.current.gain.value = v;
    setDeckB(prev => ({ ...prev, eqTreble: v }));
  }, []);

  // Master controls
  const setCrossfader = useCallback((v: number) => {
    crossfaderRef.current = v;
    setCrossfaderState(v);
    updateCrossfaderGains();
  }, [updateCrossfaderGains]);

  const setMasterVolume = useCallback((v: number) => {
    setMasterVolumeState(v);
    if (masterGainRef.current) masterGainRef.current.gain.value = v;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      deckARefs.audioRef.current?.pause();
      deckBRefs.audioRef.current?.pause();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <DJMixerContext.Provider
      value={{
        deckA, deckB, crossfader, masterVolume, analyserRef,
        availableTracks: playlist,
        loadTrackA, playA, pauseA, seekA, setVolumeA, setEqBassA, setEqMidA, setEqTrebleA,
        loadTrackB, playB, pauseB, seekB, setVolumeB, setEqBassB, setEqMidB, setEqTrebleB,
        setCrossfader, setMasterVolume,
      }}
    >
      {children}
    </DJMixerContext.Provider>
  );
};

