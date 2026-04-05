import { YT_STREAM_API } from '../data/constants';

/**
 * Extract audio URL from YouTube video ID
 * @param videoId YouTube video ID
 * @returns Audio stream URL or null if extraction fails
 */
export const extractYouTubeAudio = async (videoId: string): Promise<string | null> => {
  try {
    console.log('Extracting audio for YouTube video:', videoId);
    const res = await fetch(`${YT_STREAM_API}?id=${videoId}`);
    
    if (!res.ok) {
      console.error('YouTube audio extraction failed:', res.status);
      return null;
    }
    
    const data = await res.json();
    const audioUrl = data.audioUrl || data.url || null;
    
    if (audioUrl) {
      console.log('YouTube audio URL extracted successfully');
    } else {
      console.error('No audio URL in response:', data);
    }
    
    return audioUrl;
  } catch (error) {
    console.error('YouTube audio extraction error:', error);
    return null;
  }
};
