import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Heart, Copy, Code2, Home, LayoutDashboard, Tv, Film, Zap, Sparkles, Info, MessageSquare, Crown, ShoppingBag, User } from 'lucide-react';
import logoImage from '@/assets/khmerzoon.png';
import logoLightImage from '@/assets/logo-light-new.png';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Header from '@/components/Header';
import WatchSidebar from '@/components/WatchSidebar';
import VideoPlayer from '@/components/VideoPlayer';
import { useContentData } from '@/hooks/useContentData';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import whatsappIcon from '@/assets/share-whatsapp.svg';
import facebookIcon from '@/assets/share-facebook.svg';
import xIcon from '@/assets/share-x.svg';
import telegramIcon from '@/assets/share-telegram.svg';
import ContentAccessCheck from '@/components/ContentAccessCheck';
import { SupportDialog } from '@/components/SupportDialog';
import MobileCastScroll from '@/components/cast/MobileCastScroll';
import CastMemberDialog from '@/components/cast/CastMemberDialog';
import { CommentsList } from '@/components/Comments/CommentsList';
import { MembershipDialog } from '@/components/MembershipDialog';

interface RelatedContent {
  id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  tmdb_id?: string | number;
  episode_count?: number;
  content_type?: 'movie' | 'series';
  access_type?: 'free' | 'purchase' | 'membership';
  version?: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
}

interface Short {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  views: number;
}

const WatchPage = () => {
  const { type, id, season, episode } = useParams<{ type: 'movie' | 'series'; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { effectiveTheme } = useTheme();
  
  // Allow landscape orientation on player pages
  useScreenOrientation(true);
  
  // Detect landscape orientation - MUST be at top level, not inside conditional
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  
  // Stable key for VideoPlayer to prevent remounting
  const playerKey = `player-${type}-${id}`;
  
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | undefined>();
  const [cast, setCast] = useState<CastMember[]>([]);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userInteraction, setUserInteraction] = useState<'like' | 'dislike' | null>(null);
  const [shares, setShares] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [hasSupported, setHasSupported] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [donateAmount, setDonateAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'episodes' | 'foryou' | 'comments' | 'home'>('episodes');
  const [selectedCastMember, setSelectedCastMember] = useState<CastMember | null>(null);
  const [isCastDialogOpen, setIsCastDialogOpen] = useState(false);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch content data using the hook
  const { content, seasons, episodes, videoSources, loading, error } = useContentData(id, type || 'movie');
  
  // Season selection state
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  
  // Filter episodes by selected season
  const filteredEpisodes = useMemo(() => {
    if (type !== 'series' || !selectedSeasonId) return episodes;
    return episodes.filter(ep => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId, type]);
  
  // Set default season when seasons load
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      // If season param in URL, use that; otherwise use first season
      if (season) {
        const seasonNum = parseInt(season);
        const foundSeason = seasons.find(s => s.season_number === seasonNum);
        setSelectedSeasonId(foundSeason?.id || seasons[0].id);
      } else {
        setSelectedSeasonId(seasons[0].id);
      }
    }
  }, [seasons, season, selectedSeasonId]);

  // Filter video sources for the current episode (for series) or use all sources (for movies)
  const currentVideoSources = useMemo(() => {
    if (type === 'series' && currentEpisodeId) {
      return videoSources.filter(vs => vs.episode_id === currentEpisodeId);
    }
    return videoSources;
  }, [videoSources, currentEpisodeId, type]);

  // Get default or first video source for pricing/version info from current episode sources
  const defaultVideoSource = currentVideoSources.find(vs => vs.is_default) || currentVideoSources[0];

  // Get current episode data for access check
  const currentEpisode = useMemo(() => {
    if (type === 'series' && currentEpisodeId) {
      return episodes.find(ep => ep.id === currentEpisodeId);
    }
    return null;
  }, [episodes, currentEpisodeId, type]);

  // Determine access version (purchase vs membership) prioritizing content access_type
  const accessVersion = (
    type === 'series' && currentEpisode
      ? (currentEpisode as any).access_type || (currentEpisode as any).version
      : (content as any)?.access_type
  ) || defaultVideoSource?.version || (currentEpisode as any)?.version || 'membership';

  // Set current episode based on URL params or default to first episode
  useEffect(() => {
    console.log('[WatchPage] Episodes check:', {
      type,
      contentId: id,
      episodesCount: episodes.length,
      filteredEpisodesCount: filteredEpisodes.length,
      selectedSeasonId,
      seasonsCount: seasons.length
    });

    if (filteredEpisodes.length > 0) {
      if (episode) {
        const episodeNum = parseInt(episode);
        const foundEpisode = filteredEpisodes.find(ep => ep.episode_number === episodeNum);
        setCurrentEpisodeId(foundEpisode?.id || filteredEpisodes[0].id);
        console.log('[WatchPage] Set episode from URL:', foundEpisode?.id || filteredEpisodes[0].id);
      } else {
        setCurrentEpisodeId(filteredEpisodes[0].id);
        console.log('[WatchPage] Set first episode:', filteredEpisodes[0].id);
      }
    } else if (type === 'series') {
      console.warn('[WatchPage] No episodes found for series');
    }
  }, [filteredEpisodes, episode, type, id, episodes.length, selectedSeasonId, seasons.length]);

  // Handle season selection
  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const selectedSeason = seasons.find(s => s.id === seasonId);
    if (selectedSeason) {
      // Get first episode of this season
      const seasonEpisodes = episodes.filter(ep => ep.season_id === seasonId);
      if (seasonEpisodes.length > 0) {
        const firstEpisode = seasonEpisodes[0];
        navigate(`/watch/${type}/${id}/${selectedSeason.season_number}/${firstEpisode.episode_number}`, { replace: true });
        setCurrentEpisodeId(firstEpisode.id);
      }
    }
  };

  // Handle episode selection
  const handleEpisodeSelect = (episodeId: string) => {
    const selectedEpisode = filteredEpisodes.find(ep => ep.id === episodeId);
    if (selectedEpisode && content) {
      const currentSeason = seasons.find(s => s.id === selectedSeasonId);
      // Update URL to reflect the new episode
      navigate(`/watch/${type}/${id}/${currentSeason?.season_number || season || 1}/${selectedEpisode.episode_number}`, { replace: true });
      setCurrentEpisodeId(episodeId);
    }
  };

  // Fetch cast from TMDB
  useEffect(() => {
    const fetchCast = async () => {
      if (!content?.tmdb_id) return;

      try {
        const mediaType = type === 'series' ? 'tv' : 'movie';
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${content.tmdb_id}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`
        );
        const data = await response.json();
        
        if (data.cast) {
          // Get top 10 cast members
          setCast(data.cast.slice(0, 10));
        }
      } catch (err) {
        console.error('Error fetching cast:', err);
      }
    };

    fetchCast();
  }, [content, type]);

  // Fetch interaction counts
  useEffect(() => {
    const fetchInteractions = async () => {
      if (!content?.id) return;

      try {
        const { data, error } = await supabase
          .rpc('get_content_interaction_counts', { content_uuid: content.id });

        if (error) {
          console.error('Error fetching interactions:', error);
          return;
        }

        if (data && data.length > 0) {
          setLikes(Number(data[0].likes || 0));
          setDislikes(Number(data[0].dislikes || 0));
          setShares(Number(data[0].shares || 0));
        }
      } catch (err) {
        console.error('Error fetching interactions:', err);
      }
    };

    fetchInteractions();
  }, [content]);

  // Fetch user's support status
  useEffect(() => {
    const fetchSupportStatus = async () => {
      if (!content?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasSupported(false);
          return;
        }

        const { data, error } = await supabase
          .from('content_support')
          .select('id')
          .eq('content_id', content.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching support status:', error);
          return;
        }

        setHasSupported(!!data);
      } catch (err) {
        console.error('Error fetching support status:', err);
      }
    };

    fetchSupportStatus();
  }, [content]);

  // Fetch user's interaction
  useEffect(() => {
    const fetchUserInteraction = async () => {
      if (!content?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('content_interactions')
          .select('interaction_type')
          .eq('content_id', content.id)
          .eq('user_id', user.id)
          .in('interaction_type', ['like', 'dislike'])
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user interaction:', error);
          return;
        }

        if (data) {
          setUserInteraction(data.interaction_type as 'like' | 'dislike');
        }
      } catch (err) {
        console.error('Error fetching user interaction:', err);
      }
    };

    fetchUserInteraction();
  }, [content]);

  // Fetch user's favorite status
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!content?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('content_id', content.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching favorite status:', error);
          return;
        }

        setIsFavorited(!!data);
      } catch (err) {
        console.error('Error fetching favorite status:', err);
      }
    };

    fetchFavoriteStatus();
  }, [content]);

  // Fetch related content - filtered by content type
  useEffect(() => {
    const fetchRelatedContent = async () => {
      if (!content) return;

      try {
        // Fetch content of the same type (movie or series) excluding the current one
        const { data, error } = await supabase
          .from('content')
          .select('id, title, poster_path, backdrop_path, tmdb_id, content_type, access_type')
          .eq('content_type', type || 'movie')
          .neq('id', content.id)
          .limit(10);

        if (error) {
          console.error('Error fetching related content:', error);
          return;
        }

        setRelatedContent(data || []);
      } catch (err) {
        console.error('Error fetching related content:', err);
      }
    };

    fetchRelatedContent();
  }, [content, type]);

  // Fetch shorts
  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const { data, error } = await supabase
          .from('shorts')
          .select('id, title, video_url, thumbnail_url, views, status, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) {
          console.error('Error fetching shorts:', error);
          return;
        }

        setShorts(data || []);
      } catch (err) {
        console.error('Error fetching shorts:', err);
      }
    };

    fetchShorts();
  }, []);

  // Memoized VideoPlayer - MUST be before early returns to maintain hook order
  const videoPlayerElement = useMemo(() => {
    if (!content) return null;
    
    return (
      <ContentAccessCheck
        key={playerKey}
        contentId={content.id}
        episodeId={currentEpisodeId}
        contentType={type || 'movie'}
        contentTitle={content.title}
        price={Number((currentEpisode as any)?.price || (content as any).price || 0)}
        rentalPeriod={(content as any).purchase_period || 7}
        contentBackdrop={content?.backdrop_path}
        excludeFromPlan={(content as any).exclude_from_plan || false}
        version={accessVersion}
        onAccessGranted={() => setAccessGranted(true)}
      >
        <VideoPlayer 
          key={playerKey}
          videoSources={currentVideoSources}
          episodes={episodes}
          currentEpisodeId={currentEpisodeId}
          onEpisodeSelect={handleEpisodeSelect}
          contentBackdrop={content?.backdrop_path}
          contentId={content?.id}
        />
      </ContentAccessCheck>
    );
  }, [
    playerKey, 
    content, 
    currentEpisodeId, 
    type, 
    currentEpisode, 
    accessVersion, 
    currentVideoSources, 
    episodes, 
    handleEpisodeSelect
  ]);

  if (loading) {
    console.log('[WatchPage] Loading state, isTablet:', isTablet, 'isLandscape:', isLandscape);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
        <p className="text-muted-foreground text-lg">Loading content...</p>
      </div>
    );
  }

  if (error || !content) {
    console.log('[WatchPage] Error or no content:', error, 'isTablet:', isTablet, 'isLandscape:', isLandscape);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Content Not Available</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'The requested content could not be found or is not available at this time.'}
          </p>
          <Button onClick={() => navigate('/')} size="lg">
            Go to Home Page
          </Button>
        </div>
      </div>
    );
  }

  // Log diagnostic info for debugging (but don't return early - would break hooks)
  if (type === 'series' && episodes.length === 0) {
    console.warn('[WatchPage] Series has no episodes:', {
      contentId: id,
      tmdbId: content.tmdb_id,
      title: content.title
    });
  }
  
  if (type === 'series' && currentEpisodeId && currentVideoSources.length === 0) {
    console.warn('[WatchPage] Episode has no video sources:', { episodeId: currentEpisodeId });
  }

  console.log('[WatchPage] Rendering, isTablet:', isTablet, 'isLandscape:', isLandscape, 'content:', content?.title);

  // Format view count from popularity
  const formatViews = (popularity: number) => {
    const views = Math.floor(popularity * 100000); // Convert popularity to approximate views
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Format date to relative time
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Handle like/dislike
  const handleLikeDislike = async (type: 'like' | 'dislike') => {
    if (!content?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // If clicking the same button, remove the interaction
      if (userInteraction === type) {
        const { error } = await supabase
          .from('content_interactions')
          .delete()
          .eq('content_id', content.id)
          .eq('user_id', user.id)
          .eq('interaction_type', type);

        if (error) throw error;

        // Update local state
        if (type === 'like') {
          setLikes(prev => Math.max(0, prev - 1));
        } else {
          setDislikes(prev => Math.max(0, prev - 1));
        }
        setUserInteraction(null);
      } else {
        // If switching from one to another, update the interaction
        if (userInteraction) {
          const { error } = await supabase
            .from('content_interactions')
            .update({ interaction_type: type })
            .eq('content_id', content.id)
            .eq('user_id', user.id);

          if (error) throw error;

          // Update counts
          if (type === 'like') {
            setLikes(prev => prev + 1);
            setDislikes(prev => Math.max(0, prev - 1));
          } else {
            setDislikes(prev => prev + 1);
            setLikes(prev => Math.max(0, prev - 1));
          }
        } else {
          // Insert new interaction
          const { error } = await supabase
            .from('content_interactions')
            .insert({
              content_id: content.id,
              user_id: user.id,
              interaction_type: type
            });

          if (error) throw error;

          // Update count
          if (type === 'like') {
            setLikes(prev => prev + 1);
          } else {
            setDislikes(prev => prev + 1);
          }
        }
        setUserInteraction(type);
      }
    } catch (err) {
      console.error('Error updating interaction:', err);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!content) return;

    const shareData = {
      title: content.title,
      text: content.overview || `Watch ${content.title} on KHMERZOON`,
      url: window.location.href,
    };

    try {
      // Record share in database (best-effort)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && content.id) {
        await supabase
          .from('content_interactions')
          .insert({ content_id: content.id, user_id: user.id, interaction_type: 'share' });
        setShares(prev => prev + 1);
      }

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err: any) {
          // If user dismissed silently, just return; otherwise open dialog
          if (err?.name === 'NotAllowedError') {
            setShowShareDialog(true);
            return;
          }
          setShowShareDialog(true);
          return;
        }
      }

      // Fallback: open our share dialog with platform options
      setShowShareDialog(true);
    } catch (err) {
      // Any unexpected error -> open dialog as fallback
      setShowShareDialog(true);
      console.error('Error sharing:', err);
    }
  };

  // Handle download
  const handleDownload = () => {
    alert('Download feature coming soon!');
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!content?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('content_id', content.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsFavorited(false);
        toast({
          title: "Removed from Favorites",
          description: `${content.title} removed from your favorites`,
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            content_id: content.id,
            user_id: user.id,
            title: content.title,
            poster_path: content.poster_path,
            type: type === 'series' ? 'series' : 'movie'
          });

        if (error) throw error;

        setIsFavorited(true);
        toast({
          title: "Added to Favorites",
          description: `${content.title} added to your favorites`,
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format counts
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const videoTitle = content?.title || "Video Title";
  const channelName = "";
  const subscribers = "2.5M";
  const views = content?.popularity ? formatViews(content.popularity) : "0";
  const uploadDate = content?.created_at ? formatDate(content.created_at) : formatDate(content?.release_date || '');
  const description = content?.overview || "No description available.";
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(`${videoTitle} - Watch on KHMERZOON`);
  
  // Generate proper embed URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  let embedUrl = '';
  if (type === 'series') {
    const currentSeason = season || '1';
    const currentEpisode = episode || '1';
    embedUrl = `${baseUrl}/embed/series/${id}/${currentSeason}/${currentEpisode}`;
  } else {
    embedUrl = `${baseUrl}/embed/movies/${id}`;
  }
  
  const embedCode = `<iframe width="560" height="315" src="${embedUrl}" title="${videoTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

  // iPad Layout
  if (isTablet) {
    // LANDSCAPE LAYOUT: No header, Video left (0 margins), Sidebar right (0 margins), Independent scrolling
    if (isLandscape) {
      return (
        <div className="fixed inset-0 bg-background">
          <div className="flex h-full w-full">
            {/* LEFT SIDE: Video Player (Sticky) + Scrollable Content - 2/3 width */}
            <div className="w-2/3 flex flex-col">
              {/* Video Player Container - Sticky at top, 0 margins */}
              <div className="sticky top-0 z-10 bg-black">
                <AspectRatio ratio={16 / 9} className="bg-black overflow-hidden">
                  {videoPlayerElement}
                </AspectRatio>
              </div>

              {/* Scrollable Content Below Player */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-3">
                  {/* Title, Channel, and Action Buttons */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary">
                      <img 
                        src={content?.poster_path || "/placeholder.svg"} 
                        alt={content?.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-base font-bold">{content?.title}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={() => !hasSupported && setShowSupportDialog(true)}
                        variant={hasSupported ? 'destructive' : (isSubscribed ? 'default' : 'outline')}
                        size="sm"
                        className="gap-1 h-8"
                        disabled={hasSupported}
                      >
                        <Heart className={`h-3 w-3 ${hasSupported ? 'fill-current' : ''}`} />
                        {hasSupported ? 'Supported' : 'Support'}
                      </Button>
                      <Button 
                        onClick={() => handleLikeDislike('like')}
                        variant={userInteraction === 'like' ? 'default' : 'outline'} 
                        size="sm"
                        className="gap-1 h-8"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span className="text-xs">{formatCount(likes)}</span>
                      </Button>
                      <Button 
                        onClick={() => handleLikeDislike('dislike')}
                        variant={userInteraction === 'dislike' ? 'default' : 'outline'} 
                        size="sm"
                        className="h-8"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={handleFavoriteToggle}
                        variant={isFavorited ? 'default' : 'outline'} 
                        size="sm"
                        className="h-8"
                      >
                        <Heart className={`h-3 w-3 ${isFavorited ? 'fill-current' : ''}`} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-1 h-8"
                        onClick={handleShare}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="text-green-500">★</span> {(content as any)?.vote_average?.toFixed(1) || '9.6'}
                    </span>
                    <span>•</span>
                    <span>{new Date(content?.release_date || '').getFullYear()}</span>
                    <span>•</span>
                    <span>G</span>
                    <span>•</span>
                    <span>Subtitle</span>
                    <span>•</span>
                    <span>Chinese Mainland</span>
                    <span>•</span>
                    <span>Mystery</span>
                  </div>

                  {/* Cast - Horizontal scroll with circles */}
                  {cast.length > 0 && (
                    <div>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {cast.slice(0, 10).map((member) => (
                          <div key={member.id} className="flex-shrink-0 text-center cursor-pointer" onClick={() => {
                            setSelectedCastMember(member);
                            setIsCastDialogOpen(true);
                          }}>
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                              {member.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">
                                  👤
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] mt-1 w-12 truncate">{member.name}</p>
                            <p className="text-[8px] text-muted-foreground w-12 truncate">{member.character}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tabs: Episodes / For You / Comments / Home */}
                  <Tabs defaultValue="episodes" className="w-full">
                    <TabsList className="w-full grid grid-cols-4">
                      <TabsTrigger value="episodes">Episodes</TabsTrigger>
                      <TabsTrigger value="foryou">For You</TabsTrigger>
                      <TabsTrigger value="comments">Comments</TabsTrigger>
                      <TabsTrigger value="home">Home</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="episodes" className="mt-3">
                      {/* Episodes - Horizontal scroll with backdrop banners (portrait style) */}
                      {episodes.length > 0 && (
                        <div className="w-full overflow-x-auto scrollbar-hide">
                          <div className="flex gap-2 pb-2">
                            {episodes.map((ep) => (
                              <button
                                key={ep.id}
                                onClick={() => handleEpisodeSelect(ep.id)}
                                className={`flex-shrink-0 w-32 aspect-video rounded overflow-hidden relative border-2 transition-all ${
                                  currentEpisodeId === ep.id ? 'border-primary' : 'border-transparent'
                                }`}
                              >
                                <img
                                  src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                                  alt={`Episode ${ep.episode_number}`}
                                  className="w-full h-full object-cover"
                                />
                                {/* Big number in bottom right corner */}
                                <div className="absolute bottom-2 right-3">
                                  <span className="text-white font-black text-6xl drop-shadow-[0_2px_12px_rgba(0,0,0,1)] [text-shadow:_3px_3px_8px_rgb(0_0_0)]">
                                    {ep.episode_number}
                                  </span>
                                </div>
                                {/* Access Type Ribbon - Bottom Right Triangle */}
                                {ep.access_type === 'membership' && (
                                  <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
                                    <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-amber-400 via-yellow-500 to-orange-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                    <div className="absolute bottom-0.5 right-0.5 z-10">
                                      <Crown className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                                    </div>
                                  </div>
                                )}
                                {ep.access_type === 'purchase' && (
                                  <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none">
                                    <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                    <div className="absolute bottom-1.5 right-1.5 z-10">
                                      <ShoppingBag className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
                                    </div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="foryou" className="mt-3">
                      {/* For You Grid - 6 columns */}
                      <div className="grid grid-cols-6 gap-2">
                        {relatedContent.slice(0, 12).map((item) => {
                          const imagePath = item.poster_path || item.backdrop_path;
                          const imageUrl = imagePath?.startsWith('http') 
                            ? imagePath 
                            : imagePath 
                              ? `https://image.tmdb.org/t/p/w500${imagePath}`
                              : null;
                          const contentId = item.tmdb_id || item.id;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigate(`/watch/${type}/${contentId}`)}
                              className="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="relative w-full">
                                <div className="aspect-[2/3] rounded overflow-hidden bg-muted">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-2xl">🎬</span>
                                    </div>
                                  )}
                                </div>
                                {item.episode_count && (
                                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] px-1">
                                    {item.episode_count} Episodes
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <h4 className="text-[10px] font-medium line-clamp-2">{item.title}</h4>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="comments" className="mt-3">
                      <CommentsList contentId={content.id} episodeId={type === 'series' ? currentEpisodeId : undefined} />
                    </TabsContent>

                    <TabsContent value="home" className="mt-3">
                      <div className="space-y-2">
                        <Button
                          onClick={() => navigate('/')}
                          variant="outline"
                          className="w-full justify-start gap-2"
                          size="sm"
                        >
                          <Home className="h-4 w-4" />
                          <span className="text-sm">Go Home</span>
                        </Button>
                        <Button
                          onClick={() => navigate('/dashboard')}
                          variant="outline"
                          className="w-full justify-start gap-2"
                          size="sm"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span className="text-sm">Dashboard</span>
                        </Button>
                        <Button
                          onClick={() => navigate('/series')}
                          variant="outline"
                          className="w-full justify-start gap-2"
                          size="sm"
                        >
                          <Tv className="h-4 w-4" />
                          <span className="text-sm">Series</span>
                        </Button>
                        <Button
                          onClick={() => navigate('/movies')}
                          variant="outline"
                          className="w-full justify-start gap-2"
                          size="sm"
                        >
                          <Film className="h-4 w-4" />
                          <span className="text-sm">Movies</span>
                        </Button>
                        <Button
                          onClick={() => navigate('/dashboard')}
                          variant="outline"
                          className="w-full justify-start gap-2"
                          size="sm"
                        >
                          <Zap className="h-4 w-4" />
                          <span className="text-sm">Wallet</span>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: Recommendations & Shorts - iPad Landscape style */}
            <div className="w-1/3 border-l border-border bg-background overflow-y-auto scrollbar-hide">
              <div className="p-3 space-y-4">
                {/* VIP Banner */}
                <button 
                  onClick={() => setMembershipDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-primary/20 to-accent/20 p-2.5 rounded-lg hover:from-primary/30 hover:to-accent/30 transition-all"
                >
                  <h3 className="text-xs font-bold flex items-center gap-1">
                    <span className="truncate">Subscribe to Membership, Enjoy watching our Premium videos</span>
                    <Crown className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
                  </h3>
                </button>

                {/* Recommended Section - 4 columns, 8 items */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recommended</h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    {relatedContent.slice(0, 8).map((item) => {
                      const imagePath = item.poster_path || item.backdrop_path;
                      const imageUrl = imagePath?.startsWith('http') 
                        ? imagePath 
                        : imagePath 
                          ? `https://image.tmdb.org/t/p/w500${imagePath}`
                          : null;
                      const contentId = item.tmdb_id || item.id;
                      const itemType = item.content_type || type || 'movie';
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(`/watch/${itemType}/${contentId}`)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="relative w-full rounded overflow-hidden bg-muted" style={{ aspectRatio: '2/3' }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xl">🎬</span>
                              </div>
                            )}
                            {/* Version/Access Type Badge */}
                            {item.access_type === 'membership' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-lg">
                                <Crown className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {item.access_type === 'purchase' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                                <ShoppingBag className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {item.episode_count && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded">
                                {item.episode_count} Episodes
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* More button */}
                  <button className="w-full mt-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More
                  </button>
                </div>

                {/* Short Videos Section - 4 columns, 8 items */}
                {shorts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Short Videos</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {shorts.slice(0, 8).map((short) => {
                        const thumbnailUrl = short.thumbnail_url?.startsWith('http')
                          ? short.thumbnail_url
                          : short.thumbnail_url
                            ? `https://image.tmdb.org/t/p/w500${short.thumbnail_url}`
                            : '/placeholder.svg';

                        return (
                          <button
                            key={short.id}
                            onClick={() => navigate(`/short?id=${short.id}`)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="rounded overflow-hidden bg-muted" style={{ aspectRatio: '9/16' }}>
                              <img
                                src={thumbnailUrl}
                                alt={short.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {/* More button */}
                    <button className="w-full mt-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      More
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cast Member Dialog */}
          {selectedCastMember && (
            <CastMemberDialog
              castMember={{
                ...selectedCastMember,
                role: selectedCastMember.character,
                image: selectedCastMember.profile_path ? `https://image.tmdb.org/t/p/w185${selectedCastMember.profile_path}` : ''
              }}
              isOpen={isCastDialogOpen}
              onClose={() => {
                setIsCastDialogOpen(false);
                setSelectedCastMember(null);
              }}
            />
          )}

          {/* Support Dialog */}
          <SupportDialog 
            open={showSupportDialog} 
            onOpenChange={setShowSupportDialog}
            contentId={content.id}
            contentTitle={content.title}
            onSupportSuccess={() => setHasSupported(true)}
          />

          {/* Share Dialog */}
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share</DialogTitle>
                <DialogDescription>Share this content with others</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="social" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="social">Social</TabsTrigger>
                  <TabsTrigger value="embed">Embed</TabsTrigger>
                </TabsList>
                
                <TabsContent value="social" className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <a
                      href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <img src={whatsappIcon} alt="WhatsApp" className="w-10 h-10" />
                      <span className="text-xs text-center">WhatsApp</span>
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <img src={facebookIcon} alt="Facebook" className="w-10 h-10" />
                      <span className="text-xs text-center">Facebook</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <img src={xIcon} alt="X (Twitter)" className="w-10 h-10" />
                      <span className="text-xs text-center">X</span>
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <img src={telegramIcon} alt="Telegram" className="w-10 h-10" />
                      <span className="text-xs text-center">Telegram</span>
                    </a>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="share-url">Page URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="share-url"
                        value={pageUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(pageUrl);
                          toast({
                            title: "Copied!",
                            description: "Link copied to clipboard",
                          });
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="embed" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="embed-code">Embed Code</Label>
                    <div className="relative">
                      <textarea
                        id="embed-code"
                        value={embedCode}
                        readOnly
                        className="w-full h-32 p-3 text-xs font-mono bg-muted rounded-md resize-none"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(embedCode);
                          toast({
                            title: "Copied!",
                            description: "Embed code copied to clipboard",
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 gap-2"
                      >
                        <Code2 className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    // PORTRAIT LAYOUT: Original iPad portrait layout
    console.log('[WatchPage iPad] Rendering PORTRAIT layout');
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <WatchSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Sticky Player at top with 0 margins/padding */}
        <div className="flex-shrink-0 w-full bg-black" style={{ margin: 0, padding: 0 }}>
          <AspectRatio ratio={16 / 9} className="bg-black overflow-hidden">
            {videoPlayerElement}
          </AspectRatio>
        </div>

        {/* Scrollable Content - scrolls behind sticky player */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-6">
          {/* Channel Info */}
          <div className="flex items-center gap-3 px-4 pt-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary">
              <img 
                src={content?.poster_path || "/placeholder.svg"} 
                alt={content?.title} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-medium">{content?.title}</h2>
              {type === 'series' && currentEpisodeId && episodes.length > 0 && (() => {
                const currentEpisode = episodes.find(ep => ep.id === currentEpisodeId);
                if (currentEpisode) {
                  return (
                    <p className="text-[#FFD700] font-medium text-sm">
                      Watching S{season || 1} EP{currentEpisode.episode_number}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <Button
              onClick={() => setShowSupportDialog(true)}
              variant={isSubscribed ? 'default' : 'outline'}
              className="rounded-full px-6 gap-2"
            >
              <Heart className="h-4 w-4 fill-current" />
              Support
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-4 py-3">
            <Button 
              onClick={() => handleLikeDislike('like')}
              variant={userInteraction === 'like' ? 'default' : 'outline'} 
              className="rounded-full gap-2"
            >
              <ThumbsUp className="h-4 w-4 fill-current" />
              <span>{formatCount(likes)}</span>
            </Button>
            <Button 
              onClick={() => handleLikeDislike('dislike')}
              variant={userInteraction === 'dislike' ? 'default' : 'outline'} 
              className="rounded-full"
            >
              <ThumbsDown className="h-4 w-4 fill-current" />
            </Button>
            <Button 
              onClick={handleFavoriteToggle}
              variant={isFavorited ? 'default' : 'outline'} 
              className="rounded-full"
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
            <Button 
              variant="default" 
              className="rounded-full gap-2"
              onClick={() => setMembershipDialogOpen(true)}
            >
              <User className="h-4 w-4" />
              <span>Join Member</span>
            </Button>
          </div>

          {/* Description - NO "Detail" label, 2 lines max with "... Read more" */}
          <div className="px-4 py-3">
            {showFullDescription ? (
              <>
                <p className="text-sm text-muted-foreground">{description}</p>
                <button
                  onClick={() => setShowFullDescription(false)}
                  className="text-sm text-primary hover:underline mt-1"
                >
                  Show less
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                {description && description.length > 100 && (
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

          {/* Cast - Horizontal scroll, NO "Cast" label, 10% smaller (72px instead of 80px) */}
          {cast.length > 0 && (
            <div className="px-4">
              <div className="w-full overflow-x-auto py-2 scrollbar-hide">
                <div className="flex gap-3">
                  {cast.map((member) => (
                    <div key={member.id} className="inline-block">
                      <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {member.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            👤
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-center mt-1 w-[72px] truncate text-muted-foreground">{member.name}</p>
                      <p className="text-[9px] text-center w-[72px] truncate text-muted-foreground">{member.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs: Conditional based on content type and device */}
          <Tabs defaultValue={type === 'series' ? 'episodes' : 'foryou'} className="w-full mt-4">
            <TabsList className={`w-full grid ${type === 'series' ? 'grid-cols-4' : 'grid-cols-3'} h-12 bg-transparent border-b-2 border-border rounded-none p-0 px-4`}>
              {type === 'series' && (
                <TabsTrigger 
                  value="episodes"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Film className="h-4 w-4" />
                  Episodes
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="foryou"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                For You
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger 
                value="home" 
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Home className="h-4 w-4" />
                Home
              </TabsTrigger>
            </TabsList>

            {/* Episodes Tab - Horizontal scroll with season selector and big number art */}
            <TabsContent value="episodes" className="mt-4 px-4">
              {/* Season Selector */}
              {type === 'series' && seasons.length > 1 && (
                <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {seasons.map((s) => (
                    <Button
                      key={s.id}
                      variant={selectedSeasonId === s.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSeasonSelect(s.id)}
                      className="flex-shrink-0"
                    >
                      Season {s.season_number}
                    </Button>
                  ))}
                </div>
              )}
              {filteredEpisodes.length > 0 && (
                <div className="w-full overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 pb-2">
                    {filteredEpisodes.map((ep) => (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeSelect(ep.id)}
                        className={`flex-shrink-0 w-32 aspect-video rounded overflow-hidden relative border-2 transition-all ${
                          currentEpisodeId === ep.id ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                          alt={`Episode ${ep.episode_number}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Big number in bottom right corner */}
                        <div className="absolute bottom-2 right-3">
                          <span className="text-white font-black text-6xl drop-shadow-[0_2px_12px_rgba(0,0,0,1)] [text-shadow:_3px_3px_8px_rgb(0_0_0)]">
                            {ep.episode_number}
                          </span>
                        </div>
                        {/* Access Type Ribbon - Left Triangle */}
                        {ep.access_type === 'membership' && (
                          <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
                            <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-amber-400 via-yellow-500 to-orange-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                            <div className="absolute bottom-0.5 right-0.5 z-10">
                              <Crown className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>
                          </div>
                        )}
                        {ep.access_type === 'purchase' && (
                          <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none">
                            <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                            <div className="absolute bottom-1.5 right-1.5 z-10">
                              <ShoppingBag className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* For You Tab - 5 columns */}
            <TabsContent value="foryou" className="mt-4 px-4">
              <div className="grid grid-cols-5 gap-px">
                {relatedContent.slice(0, 10).map((item) => {
                  const imagePath = item.poster_path || item.backdrop_path;
                  const imageUrl = imagePath?.startsWith('http') 
                    ? imagePath 
                    : imagePath 
                      ? `https://image.tmdb.org/t/p/w500${imagePath}`
                      : null;
                  const contentId = item.tmdb_id || item.id;
                  const itemType = item.content_type || type || 'movie';
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/watch/${itemType}/${contentId}`)}
                      className="w-full"
                    >
                      <AspectRatio ratio={2 / 3}>
                        <div className="relative w-full h-full">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )}
                          {/* Version/Access Type Badge */}
                          {item.access_type === 'membership' && (
                            <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-lg">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {item.access_type === 'purchase' && (
                            <div className="absolute top-1 right-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                              <ShoppingBag className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </AspectRatio>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-4 px-4">
              <CommentsList contentId={content.id} episodeId={type === 'series' ? currentEpisodeId : undefined} />
            </TabsContent>

            {/* Home Tab - Navigation with icons */}
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
                  <LayoutDashboard className="h-5 w-5" />
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
                  onClick={() => navigate('/short')}
                  className="w-full justify-start gap-3 h-11"
                >
                  <Zap className="h-5 w-5" />
                  <span>Shorts</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recommended Section - 5 columns below tabs */}
          <div className="mt-6 px-4">
            <h3 className="text-base font-semibold mb-3">Recommended</h3>
            <div className="grid grid-cols-5 gap-px">
              {relatedContent.slice(0, 10).map((item) => {
                const imagePath = item.poster_path || item.backdrop_path;
                const imageUrl = imagePath?.startsWith('http') 
                  ? imagePath 
                  : imagePath 
                    ? `https://image.tmdb.org/t/p/w500${imagePath}`
                    : null;
                const contentId = item.tmdb_id || item.id;
                const itemType = item.content_type || type || 'movie';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/watch/${itemType}/${contentId}`)}
                    className="w-full"
                  >
                    <AspectRatio ratio={2 / 3}>
                      <div className="relative w-full h-full">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                            <span className="text-2xl">🎬</span>
                          </div>
                        )}
                        {/* Version/Access Type Badge */}
                        {item.access_type === 'membership' && (
                          <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-lg">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {item.access_type === 'purchase' && (
                          <div className="absolute top-1 right-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                            <ShoppingBag className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </AspectRatio>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share this video</DialogTitle>
              <DialogDescription>
                Choose how you'd like to share this video
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              <a
                href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                  <img src={whatsappIcon} alt="WhatsApp" className="w-6 h-6" />
                </div>
                <span className="text-xs">WhatsApp</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <img src={facebookIcon} alt="Facebook" className="w-6 h-6" />
                </div>
                <span className="text-xs">Facebook</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                  <img src={xIcon} alt="X" className="w-6 h-6" />
                </div>
                <span className="text-xs">X</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#0088cc] flex items-center justify-center">
                  <img src={telegramIcon} alt="Telegram" className="w-6 h-6" />
                </div>
                <span className="text-xs">Telegram</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={pageUrl}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(pageUrl);
                  toast({
                    title: "Link copied!",
                    description: "The link has been copied to your clipboard",
                  });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  toast({
                    title: "Embed code copied!",
                    description: "The embed code has been copied to your clipboard",
                  });
                }}
              >
                <Code2 className="h-4 w-4 mr-2" />
                Copy Embed Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <SupportDialog 
          open={showSupportDialog}
          onOpenChange={setShowSupportDialog}
          contentId={content.id}
          contentTitle={content.title}
          onSupportSuccess={() => setHasSupported(true)}
        />

        {selectedCastMember && (
          <CastMemberDialog
            castMember={{
              id: selectedCastMember.id,
              name: selectedCastMember.name,
              role: selectedCastMember.character,
              image: selectedCastMember.profile_path 
                ? `https://image.tmdb.org/t/p/w185${selectedCastMember.profile_path}`
                : '',
              profile_path: selectedCastMember.profile_path
            }}
            isOpen={isCastDialogOpen}
            onClose={() => {
              setIsCastDialogOpen(false);
              setSelectedCastMember(null);
            }}
          />
        )}

        <MembershipDialog 
          open={membershipDialogOpen}
          onOpenChange={setMembershipDialogOpen}
        />
      </div>
    );
  }

  // Desktop/Mobile Layout (default)
  console.log('[WatchPage Desktop] Rendering, isMobile:', isMobile, 'isTablet:', isTablet, 'content:', content?.title, 'currentEpisodeId:', currentEpisodeId, 'videoSources:', currentVideoSources.length);

  // For series, ensure we have episode ID and video sources before rendering
  if (type === 'series' && (!currentEpisodeId || currentVideoSources.length === 0)) {
    console.log('[WatchPage Desktop] Waiting for episode data...');
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
        <p className="text-muted-foreground text-lg">Loading episode...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && !isTablet && (
        <Header onMenuClick={() => setSidebarOpen(true)} hideJoinMember />
      )}
      <WatchSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={isMobile ? "" : "container mx-auto px-4 py-6"}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: Video & Info */}
          <div className={isMobile ? "" : "space-y-4 min-w-0"}>
            {/* Video Player */}
            <div className={isMobile ? "fixed top-0 left-0 right-0 z-50" : ""}>
              <AspectRatio ratio={16 / 9} className={`bg-black overflow-hidden ${isMobile ? 'rounded-none' : 'rounded-lg'}`}>
                {videoPlayerElement}
              </AspectRatio>
            </div>

            {/* Content below player - scrollable on mobile */}
            <div className={isMobile ? "mt-[56.25vw] space-y-4 px-0 pt-0" : "space-y-4"}>
              {/* Channel Info & Actions */}
              <div className={`flex flex-wrap items-center justify-between ${isMobile ? 'gap-2 px-2' : 'gap-4'}`}>
                {/* Channel */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary">
                    <img 
                      src={content?.poster_path || "/placeholder.svg"} 
                      alt={content?.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1">
                    {!isMobile && <h3 className="font-semibold">{channelName}</h3>}
                    <h2 className="text-base font-medium">{content?.title}</h2>
                    {type === 'series' && currentEpisodeId && episodes.length > 0 && (() => {
                      const currentEpisode = episodes.find(ep => ep.id === currentEpisodeId);
                      if (currentEpisode) {
                        return (
                          <p className={`text-[#FFD700] font-medium ${isMobile ? 'text-[8.4px]' : 'text-sm'}`}>
                            Watching S{season || 1} EP{currentEpisode.episode_number}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <Button
                    onClick={() => !hasSupported && setShowSupportDialog(true)}
                    variant={hasSupported ? 'destructive' : (isSubscribed ? 'default' : 'outline')}
                    className="rounded-full px-6 gap-2 hover-scale active:scale-95"
                    disabled={hasSupported}
                  >
                    <Heart className={`h-4 w-4 ${hasSupported ? 'fill-current' : ''}`} />
                    {hasSupported ? 'Supported' : 'Support'}
                  </Button>
                </div>

                {/* Actions */}
                <div className={`flex items-center ${isMobile ? 'justify-between w-full' : 'gap-2'}`}>
                  <Button 
                    onClick={() => handleLikeDislike('like')}
                    variant={userInteraction === 'like' ? 'default' : 'outline'} 
                    className={`rounded-full ${isMobile ? 'gap-1 px-3 h-[39px] text-xs' : 'gap-2'} hover-scale active:scale-95`}
                    aria-pressed={userInteraction === 'like'}
                  >
                    <ThumbsUp 
                      className={`${isMobile ? "h-[21px] w-[21px]" : "h-4 w-4"} fill-current transition-transform ${userInteraction === 'like' ? 'scale-105' : ''}`}
                    />
                    <span className={isMobile ? "text-xs" : ""}>{formatCount(likes)}</span>
                  </Button>
                  <Button 
                    onClick={() => handleLikeDislike('dislike')}
                    variant={userInteraction === 'dislike' ? 'default' : 'outline'} 
                    className={`rounded-full ${isMobile ? 'gap-1 px-3 h-[39px] text-xs' : 'gap-2'} hover-scale active:scale-95`}
                    aria-pressed={userInteraction === 'dislike'}
                  >
                    <ThumbsDown 
                      className={`${isMobile ? "h-[21px] w-[21px]" : "h-4 w-4"} fill-current transition-transform ${userInteraction === 'dislike' ? 'scale-105' : ''}`}
                    />
                  </Button>
                  <Button 
                    onClick={handleFavoriteToggle}
                    variant={isFavorited ? 'default' : 'outline'} 
                    className={`rounded-full ${isMobile ? 'gap-1 px-3 h-[39px] text-xs' : 'gap-2'} hover-scale active:scale-95`}
                    aria-pressed={isFavorited}
                  >
                    <Heart 
                      className={`${isMobile ? "h-[21px] w-[21px]" : "h-4 w-4"} ${isFavorited ? 'fill-current' : ''} transition-transform ${isFavorited ? 'scale-105' : ''}`}
                    />
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`rounded-full ${isMobile ? 'gap-1 px-3 h-[39px]' : 'gap-2'}`}
                    onClick={handleShare}
                  >
                    <Share2 className={isMobile ? "h-[21px] w-[21px]" : "h-4 w-4"} />
                    {!isMobile && <span>Share</span>}
                  </Button>
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      className="gap-1 px-2 h-[39px] hover:bg-transparent rounded-full"
                      onClick={() => setMembershipDialogOpen(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-[48px] w-[48px]" viewBox="0 0 32 32" fill="none">
                        <path stroke="#FFD700" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 13l3 6.5l3-6.5m3.5 0v6.5m4-2.225h1.48c.651 0 1.277-.275 1.721-.75a2.338 2.338 0 0 0 .215-2.932a1.394 1.394 0 0 0-1.14-.593H20.5v4.275Zm0 0V19.5M5 7h22a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/>
                      </svg>
                    </Button>
                  )}
                </div>
              </div>

              {/* Cast Section - Desktop only - Horizontal scroll with click functionality */}
              {!isMobile && cast.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Cast</h3>
                  <div className="w-full overflow-x-auto scrollbar-hide">
                    <div className="flex gap-4 pb-2">
                      {cast.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex flex-col items-center text-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedCastMember(member);
                            setIsCastDialogOpen(true);
                          }}
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted mb-2">
                            {member.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                👤
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium line-clamp-1 max-w-[64px]">{member.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[64px]">{member.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              {/* Tabs Section - Desktop: Episodes / For You / Comments / Detail (hide Detail on tablet) */}
              {!isMobile && (
                <Tabs defaultValue="episodes" className="w-full">
                  <TabsList className={`w-full grid ${isTablet ? 'grid-cols-3' : 'grid-cols-4'} h-12 bg-transparent border-b-2 border-border rounded-none p-0`}>
                    <TabsTrigger 
                      value="episodes" 
                      className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Film className="h-4 w-4" />
                      Episodes
                    </TabsTrigger>
                    <TabsTrigger 
                      value="foryou" 
                      className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Sparkles className="h-4 w-4" />
                      For You
                    </TabsTrigger>
                    <TabsTrigger 
                      value="comments" 
                      className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </TabsTrigger>
                    {!isTablet && (
                      <TabsTrigger 
                        value="detail" 
                        className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        <Info className="h-4 w-4" />
                        Detail
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Episodes Tab - Horizontal scroll with big number */}
                  <TabsContent value="episodes" className="mt-4">
                    {/* Season Selector */}
                    {type === 'series' && seasons.length > 1 && (
                      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                        {seasons.map((s) => (
                          <Button
                            key={s.id}
                            variant={selectedSeasonId === s.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSeasonSelect(s.id)}
                            className="flex-shrink-0"
                          >
                            Season {s.season_number}
                          </Button>
                        ))}
                      </div>
                    )}
                    {filteredEpisodes.length > 0 && (
                      <div className="w-full overflow-x-auto scrollbar-hide">
                        <div className="flex gap-3 pb-2">
                          {filteredEpisodes.map((ep) => (
                            <button
                              key={ep.id}
                              onClick={() => handleEpisodeSelect(ep.id)}
                              className={`flex-shrink-0 w-[128px] h-[72px] rounded-lg overflow-hidden relative border-2 transition-all ${
                                currentEpisodeId === ep.id ? 'border-primary' : 'border-transparent'
                              }`}
                            >
                              <img
                                src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                                alt={`Episode ${ep.episode_number}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-1 right-1">
                                <span className="text-white font-black text-6xl drop-shadow-[0_2px_12px_rgba(0,0,0,1)] [text-shadow:_3px_3px_8px_rgb(0_0_0)]">
                                  {ep.episode_number}
                                </span>
                              </div>
                              {/* Access Type Ribbon - Left Triangle */}
                              {ep.access_type === 'membership' && (
                                <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
                                  <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-amber-400 via-yellow-500 to-orange-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                  <div className="absolute bottom-0.5 right-0.5 z-10">
                                    <Crown className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                              {ep.access_type === 'purchase' && (
                                <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none">
                                  <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                  <div className="absolute bottom-1.5 right-1.5 z-10">
                                    <ShoppingBag className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* For You Tab - 5 columns */}
                  <TabsContent value="foryou" className="mt-4">
                    <div className="grid grid-cols-5 gap-3">
                      {relatedContent.slice(0, 10).map((item) => {
                        const imagePath = item.poster_path || item.backdrop_path;
                        const imageUrl = imagePath?.startsWith('http') 
                          ? imagePath 
                          : imagePath 
                            ? `https://image.tmdb.org/t/p/w500${imagePath}`
                            : null;
                        const contentId = item.tmdb_id || item.id;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/watch/${type}/${contentId}`)}
                            className="w-full group"
                          >
                            <AspectRatio ratio={2 / 3}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                  <span className="text-2xl">🎬</span>
                                </div>
                              )}
                            </AspectRatio>
                            <p className="text-sm font-medium line-clamp-2 mt-2 group-hover:text-primary transition-colors">{item.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  {/* Comments Tab */}
                  <TabsContent value="comments" className="mt-4">
                    <CommentsList contentId={content.id} episodeId={type === 'series' ? currentEpisodeId : undefined} />
                  </TabsContent>
                  
                  {/* Detail Tab */}
                  <TabsContent value="detail" className="mt-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="font-sans whitespace-pre-wrap text-sm">{description}</pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Mobile Cast Section - Using MobileCastScroll component */}
              {isMobile && cast.length > 0 && (
                <MobileCastScroll 
                  castWithProfiles={cast.map(member => ({
                    id: member.id,
                    name: member.name,
                    role: member.character,
                    image: member.profile_path 
                      ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                      : '',
                    profile_path: member.profile_path
                  }))}
                />
              )}

              {/* Mobile Tabs - Episodes / For You / Comments / Home */}
              {isMobile && (
                <div className="space-y-4">
                  <div className="border-b border-border">
                    <div className="flex gap-6 justify-center px-0 mx-0">
                      <button 
                        onClick={() => setActiveTab('episodes')}
                        className={`pb-2 px-0 font-medium transition-colors border-b-2 ${
                          activeTab === 'episodes' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        Episodes
                      </button>
                      <button 
                        onClick={() => setActiveTab('foryou')}
                        className={`pb-2 px-0 font-medium transition-colors border-b-2 ${
                          activeTab === 'foryou' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        For You
                      </button>
                      <button 
                        onClick={() => setActiveTab('comments')}
                        className={`pb-2 px-0 font-medium transition-colors border-b-2 flex items-center gap-1 ${
                          activeTab === 'comments' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Comments
                      </button>
                      <button 
                        onClick={() => setActiveTab('home')}
                        className={`pb-2 px-0 font-medium transition-colors border-b-2 flex items-center gap-1 ${
                          activeTab === 'home' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        <Home className="h-4 w-4" />
                        Home
                      </button>
                    </div>
                  </div>

                  {/* Episodes Tab Content */}
                  {activeTab === 'episodes' && filteredEpisodes.length > 0 && (
                    <div className="space-y-3 px-0 mx-0">
                      {/* Season Selector */}
                      {type === 'series' && seasons.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                          {seasons.map((s) => (
                            <Button
                              key={s.id}
                              variant={selectedSeasonId === s.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleSeasonSelect(s.id)}
                              className="flex-shrink-0"
                            >
                              Season {s.season_number}
                            </Button>
                          ))}
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <div className="flex gap-1 pb-2">
                          {filteredEpisodes.map((ep) => (
                            <button
                              key={ep.id}
                              onClick={() => handleEpisodeSelect(ep.id)}
                              className={`flex-shrink-0 w-[86px] h-[58px] rounded-lg overflow-hidden relative border-2 transition-all ${
                                currentEpisodeId === ep.id ? 'border-primary' : 'border-transparent'
                              }`}
                            >
                              <img
                                src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                                alt={`Episode ${ep.episode_number}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1">
                              <span className="text-white font-black text-2xl drop-shadow-lg">
                                {ep.episode_number}
                              </span>
                            </div>
                            {/* Access Type Ribbon - Left Triangle */}
                            {ep.access_type === 'membership' && (
                              <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none">
                                <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-amber-400 via-yellow-500 to-orange-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                <div className="absolute bottom-0.5 right-0.5 z-10">
                                  <Crown className="w-2 h-2 text-white drop-shadow-md" strokeWidth={2.5} />
                                </div>
                              </div>
                            )}
                            {ep.access_type === 'purchase' && (
                              <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
                                <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                                <div className="absolute bottom-1 right-1 z-10">
                                  <ShoppingBag className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For You Tab Content */}
                  {activeTab === 'foryou' && (
                    <div className="grid grid-cols-3 gap-1 px-2">
                      {relatedContent.slice(0, 6).map((item) => {
                        const imagePath = item.poster_path || item.backdrop_path;
                        const imageUrl = imagePath?.startsWith('http') 
                          ? imagePath 
                          : imagePath 
                            ? `https://image.tmdb.org/t/p/w500${imagePath}`
                            : null;
                        const contentId = item.tmdb_id || item.id;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/watch/${type}/${contentId}`)}
                            className="w-full"
                          >
                            <AspectRatio ratio={2 / 3}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                  <span className="text-2xl">🎬</span>
                                </div>
                              )}
                            </AspectRatio>
                            <p className="text-xs font-medium line-clamp-2 mt-1">{item.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Comments Tab Content */}
                  {activeTab === 'comments' && (
                    <div className="px-2">
                      <CommentsList contentId={content.id} episodeId={type === 'series' ? currentEpisodeId : undefined} />
                    </div>
                  )}

                  {/* Home Tab Content */}
                  {activeTab === 'home' && (
                    <div className="space-y-2 px-2">
                      <button 
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Home className="h-5 w-5" />
                        <span className="font-medium">Go Home</span>
                      </button>
                      <button 
                        onClick={() => navigate('/dashboard')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="font-medium">Dashboard</span>
                      </button>
                      <button 
                        onClick={() => navigate('/series')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Tv className="h-5 w-5" />
                        <span className="font-medium">Series</span>
                      </button>
                      <button 
                        onClick={() => navigate('/movies')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Film className="h-5 w-5" />
                        <span className="font-medium">Movies</span>
                      </button>
                      <button 
                        onClick={() => navigate('/short')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Zap className="h-5 w-5" />
                        <span className="font-medium">Shorts</span>
                      </button>
                    </div>
                  )}

                  {/* Recommended Section */}
                  <div className="space-y-3 px-2">
                    <h3 className="text-lg font-semibold">Recommended</h3>
                    <div className="grid grid-cols-3 gap-1">
                      {relatedContent.slice(6, 12).map((item) => {
                        const imagePath = item.poster_path || item.backdrop_path;
                        const imageUrl = imagePath?.startsWith('http') 
                          ? imagePath 
                          : imagePath 
                            ? `https://image.tmdb.org/t/p/w500${imagePath}`
                            : null;
                        const contentId = item.tmdb_id || item.id;
                        const itemType = item.content_type || type || 'movie';
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/watch/${itemType}/${contentId}`)}
                            className="w-full"
                          >
                            <AspectRatio ratio={2 / 3}>
                              <div className="relative w-full h-full">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                    <span className="text-2xl">🎬</span>
                                  </div>
                                )}
                                {/* Version/Access Type Badge */}
                                {item.access_type === 'membership' && (
                                  <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-lg">
                                    <Crown className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                                {item.access_type === 'purchase' && (
                                  <div className="absolute top-1 right-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                                    <ShoppingBag className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                            </AspectRatio>
                            <p className="text-xs font-medium line-clamp-2 mt-1">{item.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Related Content - iPad Landscape Style with 4-column grids */}
          <div className="hidden lg:block border-l border-border">
            <div className="p-3 space-y-4">
                {/* VIP Banner */}
                <button 
                  onClick={() => setMembershipDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-primary/20 to-accent/20 p-2.5 rounded-lg hover:from-primary/30 hover:to-accent/30 transition-all"
                >
                  <h3 className="text-xs font-bold flex items-center gap-1">
                    <span className="truncate">Subscribe to Membership, Enjoy watching our Premium videos</span>
                    <Crown className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
                  </h3>
                </button>

                {/* Recommended Section - 4 columns, 8 items */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recommended</h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    {relatedContent.slice(0, 8).map((item) => {
                      const imagePath = item.poster_path || item.backdrop_path;
                      const imageUrl = imagePath?.startsWith('http') 
                        ? imagePath 
                        : imagePath 
                          ? `https://image.tmdb.org/t/p/w500${imagePath}`
                          : null;
                      const contentId = item.tmdb_id || item.id;
                      const itemType = item.content_type || type || 'movie';
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(`/watch/${itemType}/${contentId}`)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="relative w-full rounded overflow-hidden bg-muted" style={{ aspectRatio: '2/3' }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xl">🎬</span>
                              </div>
                            )}
                            {/* Version/Access Type Badge */}
                            {item.access_type === 'membership' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-lg">
                                <Crown className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {item.access_type === 'purchase' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                                <ShoppingBag className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {item.episode_count && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded">
                                {item.episode_count} Episodes
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* More button */}
                  <button className="w-full mt-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More
                  </button>
                </div>

                {/* Shorts Section - 4 columns, 8 items */}
                {shorts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Shorts</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {shorts.slice(0, 8).map((short) => {
                        const thumbnailUrl = short.thumbnail_url?.startsWith('http')
                          ? short.thumbnail_url
                          : short.thumbnail_url
                            ? `https://image.tmdb.org/t/p/w500${short.thumbnail_url}`
                            : '/placeholder.svg';

                        return (
                          <div
                            key={short.id}
                            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
                            onClick={() => navigate(`/short?id=${short.id}`)}
                          >
                            <div className="rounded overflow-hidden bg-muted" style={{ aspectRatio: '9/16' }}>
                              <img
                                src={thumbnailUrl}
                                alt={short.title}
                                className="w-full h-full object-cover group-hover:hidden"
                              />
                              <video
                                src={short.video_url}
                                className="w-full h-full object-cover hidden group-hover:block"
                                loop
                                muted
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* More button */}
                    <button className="w-full mt-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      More
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      </main>
      
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share this video</DialogTitle>
            <DialogDescription>Select a platform, copy the link, or embed it.</DialogDescription>
          </DialogHeader>
          
          {/* Social Media Share Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <a 
              href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-accent transition-colors gap-2 text-sm"
            >
              <img src={whatsappIcon} alt="WhatsApp" className="h-4 w-4 flex-shrink-0" /> 
              <span className="truncate">WhatsApp</span>
            </a>
            <a 
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-accent transition-colors gap-2 text-sm"
            >
              <img src={facebookIcon} alt="Facebook" className="h-4 w-4 flex-shrink-0" /> 
              <span className="truncate">Facebook</span>
            </a>
            <a 
              href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-accent transition-colors gap-2 text-sm"
            >
              <img src={xIcon} alt="X" className="h-4 w-4 flex-shrink-0" /> 
              <span className="truncate">X (Twitter)</span>
            </a>
            <a 
              href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-accent transition-colors gap-2 text-sm"
            >
              <img src={telegramIcon} alt="Telegram" className="h-4 w-4 flex-shrink-0" /> 
              <span className="truncate">Telegram</span>
            </a>
          </div>
          
          {/* Copy Link Section */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold">Share Link</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 text-xs sm:text-sm bg-muted rounded px-3 py-2 break-all overflow-auto max-h-20">{pageUrl}</div>
              <Button 
                onClick={async () => { 
                  try { 
                    await navigator.clipboard.writeText(pageUrl); 
                    toast({ title: 'Link copied!', description: 'Share link copied to clipboard' }); 
                  } catch (err) {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = pageUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                      document.execCommand('copy');
                      toast({ title: 'Link copied!', description: 'Share link copied to clipboard' });
                    } catch (fallbackErr) {
                      toast({ title: 'Copy failed', description: 'Please copy the link manually', variant: 'destructive' });
                    }
                    document.body.removeChild(textArea);
                  }
                }}
                className="w-full sm:w-auto whitespace-nowrap"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" /> Copy link
              </Button>
            </div>
          </div>
          
          {/* Embed Code Section */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold">Embed Code</h4>
            <div className="rounded-md border bg-muted/50 p-2 max-h-32 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-all select-all">{embedCode}</pre>
            </div>
            <Button 
              onClick={async () => { 
                try { 
                  await navigator.clipboard.writeText(embedCode); 
                  toast({ title: 'Embed code copied!', description: 'Paste it in your website HTML' }); 
                } catch (err) {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = embedCode;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    toast({ title: 'Embed code copied!', description: 'Paste it in your website HTML' });
                  } catch (fallbackErr) {
                    toast({ title: 'Copy failed', description: 'Please copy the embed code manually', variant: 'destructive' });
                  }
                  document.body.removeChild(textArea);
                }
              }}
              className="w-full"
              variant="secondary"
              size="sm"
            >
              <Code2 className="h-4 w-4 mr-2" /> Copy embed code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SupportDialog 
        open={showSupportDialog}
        onOpenChange={setShowSupportDialog}
        contentId={content.id}
        contentTitle={content.title}
        onSupportSuccess={() => setHasSupported(true)}
      />

      {selectedCastMember && (
        <CastMemberDialog
          castMember={{
            id: selectedCastMember.id,
            name: selectedCastMember.name,
            role: selectedCastMember.character,
            image: selectedCastMember.profile_path 
              ? `https://image.tmdb.org/t/p/w185${selectedCastMember.profile_path}`
              : '',
            profile_path: selectedCastMember.profile_path
          }}
          isOpen={isCastDialogOpen}
          onClose={() => {
            setIsCastDialogOpen(false);
            setSelectedCastMember(null);
          }}
        />
      )}

      <MembershipDialog 
        open={membershipDialogOpen}
        onOpenChange={setMembershipDialogOpen}
      />
    </div>
  );
};

export default WatchPage;
