import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeroSlide {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  category?: string;
  content_type?: 'movie' | 'series';
  tmdb_id?: number;
  genre?: string;
  popularity?: number;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface TabletHeroBannerProps {
  page?: 'home' | 'movies' | 'series';
}

const TabletHeroBanner = ({ page = 'home' }: TabletHeroBannerProps) => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        let query = supabase
          .from('slider_settings')
          .select('*')
          .eq('status', 'active');

        // For non-home pages, filter by section
        if (page !== 'home') {
          query = query.eq('section', page);
        }

        const { data, error } = await query
          .order('position', { ascending: true })
          .limit(5);

        if (error) {
          console.error('Error fetching hero slides:', error);
        } else if (data) {
          const mappedSlides = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            overview: item.description,
            backdrop_path: item.backdrop_path,
            poster_path: item.poster_path,
            tmdb_id: item.content_id,
            genre: item.content_type,
            content_type: item.content_type,
          })) as HeroSlide[];
          setSlides(mappedSlides);
        }
      } catch (error) {
        console.error('Error fetching slides:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, [page]);

  // Auto-advance slides every 10 seconds with pause functionality
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    timerRef.current = setInterval(() => {
      handleSlideChange('next');
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused, currentIndex]);

  const handleSlideChange = (direction: 'next' | 'prev' | number) => {
    setFadeState('out');
    
    setTimeout(() => {
      if (typeof direction === 'number') {
        setCurrentIndex(direction);
      } else if (direction === 'next') {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
      }
      setFadeState('in');
    }, 300);
  };

  const handlePlayClick = () => {
    const currentSlide = slides[currentIndex];
    if (currentSlide?.tmdb_id) {
      // Use content_id from slider_settings which is stored in tmdb_id field
      navigate(`/watch/${currentSlide.content_type || 'movie'}/${currentSlide.tmdb_id}`);
    }
  };

  if (loading || slides.length === 0) {
    return (
      <div className="relative w-full h-[60vh] bg-muted animate-pulse rounded-b-2xl" />
    );
  }

  const currentSlide = slides[currentIndex];
  const backdropUrl = currentSlide.backdrop_path 
    ? `${TMDB_IMAGE_BASE_URL}${currentSlide.backdrop_path}` 
    : null;

  return (
    <div 
      className="relative w-full overflow-hidden rounded-b-2xl -mt-[env(safe-area-inset-top)]"
      style={{ 
        height: 'calc(60vh + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      {/* Background Image with Fade Animation */}
      {backdropUrl && (
        <div 
          className={cn(
            "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
            fadeState === 'in' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-background/50 via-background/30 to-transparent" />
        </div>
      )}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => handleSlideChange('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => handleSlideChange('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content Container */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-8 z-20 max-w-3xl transition-opacity duration-500",
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-2xl">
          {currentSlide.title}
        </h1>

        {/* Genre & Rating */}
        <div className="flex items-center gap-3 mb-4">
          {currentSlide.popularity && (
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground font-semibold">
              ★ {currentSlide.popularity.toFixed(1)}
            </Badge>
          )}
          {currentSlide.genre && (
            <Badge variant="outline" className="border-white/60 text-white bg-black/40 backdrop-blur-sm font-medium">
              {currentSlide.genre}
            </Badge>
          )}
        </div>

        {/* Description */}
        {currentSlide.overview && (
          <p className="text-base text-white/90 mb-6 line-clamp-3 max-w-2xl drop-shadow-lg">
            {currentSlide.overview}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            size="lg" 
            onClick={handlePlayClick}
            className="gap-2 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Play className="w-5 h-5 fill-current" />
            Play
          </Button>
          <Button 
            size="lg" 
            variant="secondary" 
            className="gap-2 transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
          >
            <Info className="w-5 h-5" />
            More Info
          </Button>
        </div>
      </div>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-8 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-8 bg-white" 
                  : "w-4 bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TabletHeroBanner;
