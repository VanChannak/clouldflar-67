import HeroBanner from '@/components/HeroBanner';
import TopSection from '@/components/TopSection';
import MobileTopSection from '@/components/MobileTopSection';
import MobilePaginatedGrid from '@/components/MobilePaginatedGrid';
import DesktopPaginatedGrid from '@/components/DesktopPaginatedGrid';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';

const Series = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  return (
    <div className={isMobile ? "pt-16" : "space-y-6"}>
      {isMobile ? (
        <>
          <MobileTopSection contentType="series" />
          <MobilePaginatedGrid contentType="series" title="ALL SERIES" />
        </>
      ) : (
        <>
          {currentPage === 1 && (
            <>
              <HeroBanner page="series" />
              <TopSection />
            </>
          )}
          <DesktopPaginatedGrid contentType="series" title="ALL SERIES" />
        </>
      )}
    </div>
  );
};

export default Series;
