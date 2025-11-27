import HeroBanner from '@/components/HeroBanner';
import ContentRow from '@/components/ContentRow';
import TopSection from '@/components/TopSection';
import TopMoviesSection from '@/components/TopMoviesSection';
import MobileHeroBanner from '@/components/MobileHeroBanner';
import MobileCircleSlider from '@/components/MobileCircleSlider';
import MobileTopSection from '@/components/MobileTopSection';
import TabletHeroBanner from '@/components/TabletHeroBanner';
import CollectionsScroll from '@/components/CollectionsScroll';
import HomeWatchHistory from '@/components/HomeWatchHistory';
import HomeContinuousWatch from '@/components/HomeContinuousWatch';
import { UpcomingSection } from '@/components/UpcomingSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';

const Home = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) {
    return (
      <div className="min-h-screen scrollbar-hide">
        <MobileHeroBanner page="home" />
        <MobileCircleSlider />
        <HomeContinuousWatch />
        <UpcomingSection />
        <MobileTopSection />
        <CollectionsScroll />
      </div>
    );
  }

  // Tablet/iPad Layout - Use tablet hero slider with touch optimization
  if (isTablet) {
    return (
      <div className="space-y-6 pb-8 scrollbar-hide overflow-y-auto">
        <TabletHeroBanner page="home" />
        <TopSection />
        <HomeContinuousWatch />
        <UpcomingSection />
        <TopMoviesSection />
        <CollectionsScroll />
        <ContentRow title="Trending Now" />
        <ContentRow title="New Releases" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <HeroBanner page="home" />
      <div className="space-y-6">
        <TopSection />
        <HomeWatchHistory />
        <HomeContinuousWatch />
        <UpcomingSection />
        <TopMoviesSection />
        <CollectionsScroll />
        <ContentRow title="Trending Now" />
        <ContentRow title="New Releases" />
      </div>
    </div>
  );
};

export default Home;
