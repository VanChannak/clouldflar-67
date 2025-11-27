import { Home, Tv, Film, Video, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const BottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/series', icon: Tv, label: t('series') },
    { path: '/movies', icon: Film, label: t('movies') },
    { path: '/short', icon: Video, label: t('shorts') },
    { path: '/search', icon: Search, label: t('search') },
  ];

  const isShortPage = location.pathname === '/short';

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 ${
      isShortPage 
        ? '' 
        : isMobile 
          ? 'bg-background/50 backdrop-blur-md border-t border-border/50' 
          : 'bg-background/80 backdrop-blur-lg border-t border-border'
    }`}
    style={{ 
      marginBottom: '0.1px',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      <div className="flex justify-around items-center h-12 max-w-screen-xl mx-auto py-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
