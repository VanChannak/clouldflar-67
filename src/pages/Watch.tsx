import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { supabase, Content, Episode, VideoSource } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Film, Tv, User, ThumbsUp, ThumbsDown, Share2, Flag, LayoutGrid, Heart, Download, MoreVertical, LayoutDashboard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "@/components/VideoPlayer";
import { useIsTablet } from "@/hooks/use-tablet";
import { ScrollArea } from "@/components/ui/scroll-area";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isTablet = useIsTablet();
  
  // Allow landscape orientation on player pages
  useScreenOrientation(true);
  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [relatedContent] = useState<Content[]>([]);

  useEffect(() => {
    if (id) {
      fetchContentAndEpisodes();
    }
  }, [id]);

  const fetchContentAndEpisodes = async () => {
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', id)
        .single();

      if (contentError) {
        console.error('Content error:', contentError);
        // Set placeholder content instead of throwing
        setContent({
          id: id || '1',
          title: 'Sample Series Title',
          overview: 'This is a placeholder description for the series. In a real scenario, this would contain detailed information about the show, its plot, characters, and other relevant details that help users understand what the series is about.',
          poster_path: '/placeholder.svg',
          backdrop_path: '/placeholder.svg',
          type: 'series',
          release_date: new Date().toISOString(),
          popularity: 100,
          vote_average: 8.5,
          vote_count: 1000,
          created_at: new Date().toISOString()
        } as Content);
      } else {
        setContent(contentData);
      }

      const { data: episodesData, error: episodesError } = await supabase
        .from('episodes')
        .select('*')
        .eq('show_id', id)
        .order('episode_number', { ascending: true });

      if (episodesError || !episodesData || episodesData.length === 0) {
        console.error('Episodes error:', episodesError);
        // Set placeholder episodes
        const placeholderEpisodes = Array.from({ length: 12 }, (_, i) => ({
          id: `ep-${i + 1}`,
          show_id: id || '1',
          season_number: 1,
          episode_number: i + 1,
          title: `Episode ${i + 1}`,
          overview: `This is episode ${i + 1}`,
          still_path: '/placeholder.svg',
          air_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        } as Episode));
        setEpisodes(placeholderEpisodes);
        setCurrentEpisode(placeholderEpisodes[0]);
        
        // Set placeholder video sources
        setVideoSources([{
          id: 'vs-1',
          episode_id: 'ep-1',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          quality: '1080p',
          is_default: true,
          created_at: new Date().toISOString()
        } as VideoSource]);
      } else {
        setEpisodes(episodesData || []);
        if (episodesData && episodesData.length > 0) {
          setCurrentEpisode(episodesData[0]);
          fetchVideoSource(episodesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoSource = async (episodeId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_sources')
        .select('*')
        .eq('episode_id', episodeId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setVideoSources(data || []);
      
      // Update current episode
      const episode = episodes.find(ep => ep.id === episodeId);
      if (episode) {
        setCurrentEpisode(episode);
      }
    } catch (error) {
      console.error('Error fetching video source:', error);
    }
  };

  const truncateDescription = (text: string, lines: number = 2) => {
    if (!text) return "";
    const words = text.split(' ');
    const avgWordsPerLine = 15; // Approximate
    const maxWords = lines * avgWordsPerLine;
    
    if (words.length <= maxWords) return text;
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // iPad Layout - Detect orientation
  if (isTablet) {
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

    useEffect(() => {
      const handleResize = () => {
        setIsLandscape(window.innerWidth > window.innerHeight);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // LANDSCAPE LAYOUT: Video left, Sidebar right, Content scrolls behind
    if (isLandscape) {
      return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden">
          <div className="flex h-screen">
            {/* LEFT SIDE: Video Player (Fixed) + Scrollable Content Below */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Fixed Video Player - Red Box */}
              <div className="w-full flex-shrink-0">
                {videoSources.length > 0 && (
                  <VideoPlayer 
                    videoSources={videoSources}
                    onEpisodeSelect={fetchVideoSource}
                    episodes={episodes}
                    currentEpisodeId={currentEpisode?.id}
                    contentBackdrop={content?.backdrop_path}
                  />
                )}
              </div>

              {/* Scrollable Content Below Player - Blue Box */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Title and Circular Poster */}
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                      <img
                        src={content?.poster_path || "/placeholder.svg"}
                        alt={content?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-base font-bold truncate">{content?.title}</h1>
                      <p className="text-xs text-muted-foreground">
                        Watching {currentEpisode ? `S1 EP${currentEpisode.episode_number}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 py-2 border-y border-border">
                    <Button variant="ghost" size="sm">
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Share2 className="h-3 w-3" />
                      <span className="text-xs">Share</span>
                    </Button>
                  </div>

                  {/* Description */}
                  <div>
                    {showFullDescription ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {content?.overview}
                        </p>
                        <button
                          onClick={() => setShowFullDescription(false)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Show less
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {content?.overview}
                        </p>
                        {content?.overview && content.overview.length > 100 && (
                          <button
                            onClick={() => setShowFullDescription(true)}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            ... Read more
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Episodes - Horizontal scroll */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Episodes</h3>
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex gap-2">
                        {episodes.map((episode) => (
                          <div
                            key={episode.id}
                            onClick={() => fetchVideoSource(episode.id)}
                            className={`inline-block cursor-pointer rounded overflow-hidden border-2 transition-all hover:border-primary flex-shrink-0 ${
                              currentEpisode?.id === episode.id ? 'border-primary' : 'border-transparent'
                            }`}
                          >
                            <div className="w-28 aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                              <img
                                src={episode.still_path || content?.poster_path || "/placeholder.svg"}
                                alt={`Episode ${episode.episode_number}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-1 right-2 text-white font-black text-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
                                {episode.episode_number}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Comments</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">U</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">@username</span>
                            <span className="text-[10px] text-muted-foreground">1 day ago</span>
                          </div>
                          <p className="text-xs mt-1">Amazing video! Can't wait to visit these places! 😍</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* RIGHT SIDEBAR: Recommendations - Green Box (Scrollable) */}
            <div className="w-[320px] border-l border-border flex-shrink-0 bg-background">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {/* VIP Banner */}
                  <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-3 rounded-lg">
                    <h3 className="text-sm font-bold mb-1">Subscribe to VIP</h3>
                    <p className="text-xs text-muted-foreground mb-2">Enjoy watching th... skipping ads privilege</p>
                    <Button size="sm" variant="default" className="w-full gap-2">
                      <User className="h-3 w-3" />
                      Join VIP
                    </Button>
                  </div>

                  {/* Exclusive Clips */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Exclusive Clips</h3>
                    <div className="space-y-2">
                      {episodes.slice(0, 6).map((episode, idx) => (
                        <div
                          key={episode.id}
                          onClick={() => fetchVideoSource(episode.id)}
                          className="flex gap-2 cursor-pointer hover:bg-accent/50 p-1 rounded transition-colors"
                        >
                          <div className="relative w-24 flex-shrink-0">
                            <div className="aspect-video rounded overflow-hidden bg-muted">
                              <img
                                src={episode.still_path || content?.poster_path || "/placeholder.svg"}
                                alt={episode.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute top-1 left-1">
                              <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded font-semibold">Original</span>
                            </div>
                            <div className="absolute bottom-1 right-1">
                              <span className="bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                                {`0${idx + 1}:${20 + idx * 10}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs line-clamp-2">
                              EP{episode.episode_number} {episode.title || 'Episode title goes here'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      );
    }

    // PORTRAIT LAYOUT: Original iPad layout
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Sticky Player - Edge to edge, 0px margins */}
        <div className="sticky top-0 z-50 w-full" style={{ margin: 0, padding: 0 }}>
          {videoSources.length > 0 && (
            <VideoPlayer 
              videoSources={videoSources}
              onEpisodeSelect={fetchVideoSource}
              episodes={episodes}
              currentEpisodeId={currentEpisode?.id}
              contentBackdrop={content?.backdrop_path}
            />
          )}
        </div>

        {/* Scrollable Content - scrolls behind sticky player */}
        <div className="pb-6">
          {/* Title and Circular Poster */}
          <div className="flex gap-3 py-4 px-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
              <img
                src={content?.poster_path || "/placeholder.svg"}
                alt={content?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{content?.title}</h1>
              <p className="text-sm text-muted-foreground">
                Watching {currentEpisode ? `S1 EP${currentEpisode.episode_number}` : ''}
              </p>
              <Button variant="outline" size="sm" className="mt-2 gap-2">
                <Heart className="h-4 w-4" />
                Support
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 py-3 border-y border-border px-4">
            <Button variant="ghost" size="icon">
              <ThumbsUp className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <ThumbsDown className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </Button>
            <Button variant="ghost" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="text-sm">Download</span>
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>

          {/* Description - NO "Detail" label, 2 lines max */}
          <div className="py-4 px-4">
            {showFullDescription ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {content?.overview}
                </p>
                <button
                  onClick={() => setShowFullDescription(false)}
                  className="text-sm text-primary hover:underline mt-1"
                >
                  Show less
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {content?.overview}
                </p>
                {content?.overview && content.overview.length > 100 && (
                  <button
                    onClick={() => setShowFullDescription(true)}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    ... Read more
                  </button>
                )}
              </>
            )}
          </div>

          {/* Cast - Horizontal scroll, NO "Cast" label, 10% smaller */}
          <div className="px-4">
            <ScrollArea className="w-full whitespace-nowrap py-2">
            <div className="flex gap-3">
              {['Dilraba Dilmurat', 'Gong Jun', 'Liu Yuning', 'Xie Nian', 'Pei Zihan', 'Qin Xiaoxian', 'Chen Tao', 'Li Shuting', 'Wang Yiling', 'Long Shuiting'].map((actor, idx) => (
                <div key={idx} className="inline-block">
                  <div className="w-[58px] h-[58px] rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src="/placeholder.svg"
                      alt={actor}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[9px] text-center mt-1 w-[58px] truncate text-muted-foreground">{actor}</p>
                </div>
              ))}
            </div>
            </ScrollArea>
          </div>

          {/* Tabs: Episodes / For You / Comments / Home */}
          <Tabs defaultValue="episodes" className="w-full mt-4">
            <TabsList className="w-full grid grid-cols-4 bg-muted mx-4">
              <TabsTrigger value="episodes">Episodes</TabsTrigger>
              <TabsTrigger value="foryou">For You</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="home">Home</TabsTrigger>
            </TabsList>

            {/* Episodes - Horizontal scroll, ONLY big number art */}
            <TabsContent value="episodes" className="mt-4 px-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                  {episodes.map((episode) => (
                    <div
                      key={episode.id}
                      onClick={() => fetchVideoSource(episode.id)}
                      className={`inline-block cursor-pointer rounded overflow-hidden border-2 transition-all hover:border-primary flex-shrink-0 ${
                        currentEpisode?.id === episode.id ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <div className="w-32 aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                        <img
                          src={episode.still_path || content?.poster_path || "/placeholder.svg"}
                          alt={`Episode ${episode.episode_number}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-3 text-white font-black text-6xl drop-shadow-[0_2px_12px_rgba(0,0,0,1)] [text-shadow:_3px_3px_8px_rgb(0_0_0)]">
                          {episode.episode_number}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* For You - 5 columns, smallest margin */}
            <TabsContent value="foryou" className="mt-4 px-4">
              <div className="grid grid-cols-5 gap-px">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="aspect-[2/3] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                    <img
                      src={content?.poster_path || "/placeholder.svg"}
                      alt={`For You ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Comments */}
            <TabsContent value="comments" className="mt-4 px-4">
              <div className="space-y-3">
                <h3 className="font-semibold">125 Comments</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">U</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">@username</span>
                        <span className="text-xs text-muted-foreground">1 day ago</span>
                      </div>
                      <p className="text-sm mt-1">Amazing video! Can't wait to visit these places! 😍 🎉</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Home - Navigation with icons */}
            <TabsContent value="home" className="mt-4 px-4">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <Home className="h-5 w-5" />
                  <span>Go Home</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <LayoutGrid className="h-5 w-5" />
                  <span>Dashboard</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/series')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <Tv className="h-5 w-5" />
                  <span>Series</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/movies')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <Film className="h-5 w-5" />
                  <span>Movies</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/shorts')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <Film className="h-5 w-5" />
                  <span>Shorts</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recommended - 5 columns below tabs */}
          <div className="mt-6 px-4">
            <h3 className="text-base font-semibold mb-3">Recommended</h3>
            <div className="grid grid-cols-5 gap-px">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="aspect-[2/3] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                  <img
                    src={relatedContent[idx]?.poster_path || content?.poster_path || "/placeholder.svg"}
                    alt={`Recommended ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Mobile Layout (Original)
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header + Player Container */}
      <div className="sticky top-0 z-50 bg-background">
        {/* Header would go here - using WatchPage header or similar */}
        
        {/* Video Player - Edge to edge, no padding/margin */}
        {videoSources.length > 0 && (
          <div className="w-full">
            <VideoPlayer 
              videoSources={videoSources}
              onEpisodeSelect={fetchVideoSource}
              episodes={episodes}
              currentEpisodeId={currentEpisode?.id}
              contentBackdrop={content?.backdrop_path}
            />
          </div>
        )}
      </div>

      {/* Scrollable Content Below */}
      <div className="pb-6">
        {/* Title and Circular Poster */}
        <div className="flex gap-4 py-4 px-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
            <img
              src={content?.poster_path || "/placeholder.svg"}
              alt={content?.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{content?.title}</h1>
            <p className="text-sm text-muted-foreground">
              Now watching: <span className="text-foreground">{currentEpisode?.title}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <ThumbsUp className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <ThumbsDown className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Flag className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Description - NO "Detail" label, 2 lines max */}
        <div className="py-4 px-6">
          {showFullDescription ? (
            <>
              <p className="text-sm text-muted-foreground">
                {content?.overview}
              </p>
              <button
                onClick={() => setShowFullDescription(false)}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Read Less
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {content?.overview}
              {content?.overview && content.overview.length > 100 && (
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="ml-2 text-primary hover:underline"
                >
                  ... Read more
                </button>
              )}
            </p>
          )}
        </div>

        {/* Cast - Horizontal scroll, NO "Cast" label, 10% smaller */}
        <div className="px-6">
          <ScrollArea className="w-full whitespace-nowrap py-2">
            <div className="flex gap-3">
              {['Dilraba Dilmurat', 'Gong Jun', 'Liu Yuning', 'Xie Nian', 'Pei Zihan', 'Qin Xiaoxian', 'Chen Tao', 'Li Shuting', 'Wang Yiling', 'Long Shuiting'].map((actor, idx) => (
                <div key={idx} className="inline-block">
                  <div className="w-[58px] h-[87px] rounded-lg overflow-hidden bg-muted">
                    <img
                      src="/placeholder.svg"
                      alt={actor}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-center mt-1 w-[58px] truncate">{actor}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Tabs: Episodes / For You / Comments / Home */}
        <Tabs defaultValue="episodes" className="w-full mt-4">
          <TabsList className="w-full grid grid-cols-4 bg-muted mx-6">
            <TabsTrigger value="episodes">Episodes</TabsTrigger>
            <TabsTrigger value="foryou">For You</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="home">Home</TabsTrigger>
          </TabsList>

          {/* Episodes - Horizontal scroll, ONLY big number art */}
          <TabsContent value="episodes" className="mt-4 px-6">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    onClick={() => fetchVideoSource(episode.id)}
                    className={`inline-block cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                      currentEpisode?.id === episode.id ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ width: '160px' }}
                  >
                    <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                      <img
                        src={episode.still_path || content?.poster_path || "/placeholder.svg"}
                        alt={`Episode ${episode.episode_number}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Big number art in bottom right corner */}
                      <div className="absolute bottom-1 right-2 text-white font-black text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                        {episode.episode_number}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* For You - 5 columns, smallest margin */}
          <TabsContent value="foryou" className="mt-4 px-6">
            <div className="grid grid-cols-5 gap-px">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="aspect-[2/3] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                  <img
                    src="/placeholder.svg"
                    alt={`For You ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Comments */}
          <TabsContent value="comments" className="mt-4 px-6">
            <div className="space-y-3">
              <h3 className="font-semibold">125 Comments</h3>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-card rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">User {idx + 1}</p>
                      <p className="text-xs text-muted-foreground mt-1">Great episode! Really enjoyed it.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Home - Navigation with icons */}
          <TabsContent value="home" className="mt-4 px-6">
            <div className="space-y-1">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="w-full justify-start gap-3 h-12"
              >
                <Home className="h-5 w-5" />
                <span>Go Home</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full justify-start gap-3 h-12"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/series')}
                className="w-full justify-start gap-3 h-12"
              >
                <Tv className="h-5 w-5" />
                <span>Series</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/movies')}
                className="w-full justify-start gap-3 h-12"
              >
                <Film className="h-5 w-5" />
                <span>Movies</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/short')}
                className="w-full justify-start gap-3 h-12"
              >
                <Smartphone className="h-5 w-5" />
                <span>Shorts</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recommended - 5 columns below tabs */}
        <div className="mt-6 px-6">
          <h3 className="text-base font-semibold mb-3">Recommended</h3>
          <div className="grid grid-cols-5 gap-px">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                <img
                  src="/placeholder.svg"
                  alt={`Recommended ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
