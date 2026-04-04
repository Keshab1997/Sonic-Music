import React from 'react';
import { LikedSongsScreen } from './LikedSongsScreen';

// LibraryScreen is a wrapper for LikedSongsScreen
// This provides a consistent interface for the tab navigator
export const LibraryScreen: React.FC = () => {
  return <LikedSongsScreen />;
};
