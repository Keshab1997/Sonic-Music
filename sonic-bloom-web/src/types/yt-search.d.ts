declare module "yt-search" {
  interface VideoAuthor {
    name: string;
    url: string;
  }

  interface VideoResult {
    title: string;
    url: string;
    videoId: string;
    author: VideoAuthor | string;
    seconds: number;
    image: string;
    thumbnail: string;
    description: string;
    duration: string;
    views: number;
    ago: string;
  }

  interface AudioResult {
    title: string;
    url: string;
    audioId: string;
    author: VideoAuthor | string;
    seconds: number;
    image: string;
    thumbnail: string;
    duration: string;
  }

  interface PlaylistResult {
    title: string;
    url: string;
    listId: string;
    author: VideoAuthor | string;
    videoCount: number;
  }

  interface ChannelResult {
    title: string;
    url: string;
    channelId: string;
    subscribers: string;
    videos: number;
  }

  interface SearchResult {
    videos: VideoResult[];
    audios: AudioResult[];
    playlists: PlaylistResult[];
    channels: ChannelResult[];
    lists: PlaylistResult[];
    _results: (VideoResult | AudioResult | PlaylistResult | ChannelResult)[];
  }

  interface SearchQuery {
    query?: string;
    page?: number;
    list?: number;
    category?: string;
    type?: string;
    duration?: string;
    sort?: string;
  }

  function ytSearch(query: SearchQuery | string): Promise<SearchResult>;
  
  namespace ytSearch {
    function video(query: string): Promise<VideoResult>;
    function audio(query: string): Promise<AudioResult>;
    function playlist(query: string): Promise<PlaylistResult>;
    function channel(query: string): Promise<ChannelResult>;
    function search(query: SearchQuery | string): Promise<SearchResult>;
  }

  export = ytSearch;
}
