import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/VideoPlayer';
import ContentAccessCheck from '@/components/ContentAccessCheck';
import { useContentData } from '@/hooks/useContentData';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

const EmbedSeries = () => {
  const { id, season, episode } = useParams<{ id: string; season: string; episode: string }>();
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | undefined>();
  
  // Allow landscape orientation on embed player
  useScreenOrientation(true);
  
  const { content, seasons, episodes, videoSources, loading, error } = useContentData(id, 'series');

  // Set current episode based on URL params
  useEffect(() => {
    if (episodes.length > 0 && episode) {
      const episodeNum = parseInt(episode);
      const foundEpisode = episodes.find(ep => ep.episode_number === episodeNum);
      setCurrentEpisodeId(foundEpisode?.id || episodes[0].id);
    }
  }, [episodes, episode]);

  // Handle episode selection
  const handleEpisodeSelect = (episodeId: string) => {
    setCurrentEpisodeId(episodeId);
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
          <p className="text-white/70">{error || 'The requested content could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  // Filter video sources for the current episode only
  const currentEpisodeSources = currentEpisodeId 
    ? videoSources.filter(source => source.episode_id === currentEpisodeId)
    : [];

  // Get current episode for access check
  const currentEpisode = episodes.find(ep => ep.id === currentEpisodeId);
  
  // Determine access version and pricing from current episode or content
  const accessVersion = (currentEpisode as any)?.access_type || 
                        (currentEpisode as any)?.version || 
                        (content as any)?.access_type || 
                        'free';
  
  const episodePrice = Number((currentEpisode as any)?.price ?? (content as any)?.price ?? 0);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <AspectRatio ratio={16 / 9} className="bg-black h-full">
        <ContentAccessCheck
          contentId={content.id}
          episodeId={currentEpisodeId}
          contentType="series"
          contentTitle={content.title}
          price={episodePrice}
          rentalPeriod={(content as any)?.purchase_period || 7}
          contentBackdrop={content?.backdrop_path}
          excludeFromPlan={(content as any)?.exclude_from_plan || false}
          version={accessVersion}
        >
          <VideoPlayer 
            videoSources={currentEpisodeSources}
            episodes={episodes}
            currentEpisodeId={currentEpisodeId}
            onEpisodeSelect={handleEpisodeSelect}
            contentBackdrop={content?.backdrop_path}
            contentId={content?.id}
          />
        </ContentAccessCheck>
      </AspectRatio>
    </div>
  );
};

export default EmbedSeries;
