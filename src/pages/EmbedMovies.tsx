import { useParams } from 'react-router-dom';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/VideoPlayer';
import ContentAccessCheck from '@/components/ContentAccessCheck';
import { useContentData } from '@/hooks/useContentData';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

const EmbedMovies = () => {
  const { id } = useParams<{ id: string }>();
  
  // Allow landscape orientation on embed player
  useScreenOrientation(true);
  
  const { content, videoSources, loading, error } = useContentData(id, 'movie');

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

  // Determine access version and pricing
  const accessVersion = (content as any)?.access_type || 'membership';
  const contentPrice = Number((content as any)?.price ?? 0);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <AspectRatio ratio={16 / 9} className="bg-black h-full">
        <ContentAccessCheck
          contentId={content.id}
          contentType="movie"
          contentTitle={content.title}
          price={contentPrice}
          rentalPeriod={(content as any)?.purchase_period || 7}
          contentBackdrop={content?.backdrop_path}
          excludeFromPlan={(content as any)?.exclude_from_plan || false}
          version={accessVersion}
        >
          <VideoPlayer 
            videoSources={videoSources}
            contentBackdrop={content?.backdrop_path}
            contentId={content?.id}
          />
        </ContentAccessCheck>
      </AspectRatio>
    </div>
  );
};

export default EmbedMovies;
