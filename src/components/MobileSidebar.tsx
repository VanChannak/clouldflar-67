import { Tv, Film, Video, Heart, Clock, Download, TrendingUp, Users, User, ShoppingBag, Crown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/khmerzoon.png';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const HomeIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z"/>
  </svg>
);

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', icon: HomeIcon, label: t('home') },
    { path: '/dashboard', icon: User, label: t('dashboard') },
    { path: '/series', icon: Tv, label: t('tvSeries') },
    { path: '/movies', icon: Film, label: t('movies') },
    { path: '/short', icon: Video, label: t('shortVideos') },
    { path: '/trending', icon: TrendingUp, label: t('trending') },
    { path: '/shop', icon: ShoppingBag, label: t('shop') },
    { path: '/premium', icon: Crown, label: t('premium') },
  ];

  const libraryItems = [
    { path: '/history', icon: Clock, label: t('history') },
    { path: '/liked', icon: Heart, label: t('likedVideos') },
    { path: '/downloads', icon: Download, label: t('downloads') },
  ];

  const subscriptions = [
    { name: 'Channel 1', avatar: '🎬' },
    { name: 'Channel 2', avatar: '🎭' },
    { name: 'Channel 3', avatar: '🎪' },
    { name: 'Channel 4', avatar: '🎨' },
  ];
  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-md z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar - 60% of screen width */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[60%] bg-background/50 backdrop-blur-lg z-50 transform transition-transform duration-300 md:hidden border-r border-border/30",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 pb-4 border-b border-border/50">
              <img src={logo} alt="KHMERZOON" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold text-white uppercase tracking-wide">Khmerzoon</span>
            </div>

            {/* Main Navigation */}
            <nav className="space-y-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Library */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                {t('library')}
              </h3>
              <nav className="space-y-1">
                {libraryItems.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Subscriptions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                {t('subscriptions')}
              </h3>
              <nav className="space-y-1">
                {subscriptions.map((sub) => (
                  <button
                    key={sub.name}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/80 hover:bg-muted hover:text-foreground transition-colors w-full text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">
                      {sub.avatar}
                    </div>
                    <span className="text-sm">{sub.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Language Toggle */}
            <div className="pt-4 border-t border-border/50">
              <LanguageToggle variant="full" />
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};

export default MobileSidebar;
