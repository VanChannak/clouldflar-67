import { useState } from 'react';
import { 
  Gamepad2, TrendingUp, Radio, Trophy, 
  Flame, Mic, Award, Video, Newspaper, Heart, Music, 
  Film, ChevronDown, ChevronUp, Menu, Tv, Clapperboard, User, Play, ShoppingBag, Crown, Folder
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo-red-lion.png';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(true);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const isSlideIn = !collapsed && onToggle; // If not collapsed and has onToggle, it's a slide-in sidebar

  const HomeIcon = () => (
    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
      <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z"/>
    </svg>
  );

  const mainNavItems = [
    { title: t('myFeed'), icon: HomeIcon, path: '/' },
    { title: t('dashboard'), icon: User, path: '/dashboard' },
    { title: t('liked'), icon: Heart, path: '/liked' },
    { title: 'Collections', icon: Folder, path: '/collections' },
    { title: t('shorts'), icon: Play, path: '/short' },
    { title: t('series'), icon: Tv, path: '/series' },
    { title: t('movies'), icon: Clapperboard, path: '/movies' },
    { title: t('shop'), icon: ShoppingBag, path: '/shop' },
    { title: t('premium'), icon: Crown, path: '/premium' },
    { title: t('gaming'), icon: Gamepad2, path: '/gaming' },
    { title: t('finance'), icon: TrendingUp, path: '/finance' },
    { title: t('live'), icon: Radio, path: '/live', badge: t('live') },
    { title: t('sports'), icon: Trophy, path: '/sports' },
    { title: t('viral'), icon: Flame, path: '/viral' },
  ];

  const contentCategories = [
    { title: t('sls'), icon: Video, path: '/sls' },
    { title: t('podcasts'), icon: Mic, path: '/podcasts' },
    { title: t('leaderboard'), icon: Award, path: '/leaderboard' },
    { title: t('vlogs'), icon: Video, path: '/vlogs' },
    { title: t('news'), icon: Newspaper, path: '/news' },
    { title: t('health'), icon: Heart, path: '/health' },
    { title: t('music'), icon: Music, path: '/music' },
    { title: t('entertainment'), icon: Film, path: '/movies' },
  ];

  const subscriptions = [
    { name: 'Tech Review', avatar: '👨‍💻', unread: 3 },
    { name: 'Gaming Pro', avatar: '🎮', unread: 0 },
    { name: 'Crypto News', avatar: '💰', unread: 5 },
    { name: 'Sports Daily', avatar: '⚽', unread: 2 },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] backdrop-blur-md transition-all duration-300 ease-in-out z-30 bg-white dark:bg-[hsl(220,13%,8%)]',
        collapsed ? 'w-20' : 'w-64',
        isSlideIn && 'top-0 h-full' // Full height when slide-in
      )}
    >
      <ScrollArea className="h-full">
        <div className="py-2">
          {/* Logo/Branding with Menu Icon (only for slide-in mode) */}
          {isSlideIn && (
            <>
              <div className="flex items-center gap-3 px-6 py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hover:bg-accent text-gray-800 dark:text-white"
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <img src={logo} alt="KHMERZOON" className="w-10 h-10 object-contain" />
                <span className="font-bold text-xl text-primary dark:text-white">KHMERZOON</span>
              </div>
              <Separator />
            </>
          )}

          {/* Main Navigation */}
          <nav className={cn("space-y-1", collapsed ? "px-1" : "px-3")}>
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={isSlideIn ? onToggle : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex rounded-lg text-sm font-medium transition-colors text-gray-800 dark:text-white',
                    'hover:bg-gray-100 dark:hover:bg-accent',
                    isActive && 'bg-primary text-white',
                    collapsed 
                      ? 'flex-col items-center justify-center gap-1 px-2 py-3' 
                      : 'flex-row items-center gap-3 px-3 py-2.5'
                  )
                }
              >
                <item.icon className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-6 w-6")} />
                {collapsed ? (
                  <span className="text-[10px] text-center leading-tight">{item.title}</span>
                ) : (
                  <span className="flex-1">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Divider */}
          {!collapsed && <div className="my-4 border-t border-border" />}

          {/* Content Categories */}
          {!collapsed && (
            <div className="px-3">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('explore')}
              </h3>
              <nav className="space-y-1">
                {contentCategories.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={isSlideIn ? onToggle : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-800 dark:text-white',
                        'hover:bg-gray-100 dark:hover:bg-accent',
                        isActive && 'bg-primary text-white'
                      )
                    }
                  >
                    <item.icon className="h-6 w-6 flex-shrink-0" />
                    <span className="flex-1">{item.title}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Divider */}
          {!collapsed && <div className="my-4 border-t border-border" />}

          {/* Subscriptions */}
          {!collapsed && (
            <div className="px-3">
              <button
                onClick={() => setSubscriptionsExpanded(!subscriptionsExpanded)}
                className="flex items-center justify-between w-full px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{t('subscriptions')}</span>
                {subscriptionsExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              {subscriptionsExpanded && (
                <nav className="space-y-1">
                  {subscriptions.map((sub) => (
                    <button
                      key={sub.name}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-accent text-gray-800 dark:text-white"
                    >
                      <span className="text-xl flex-shrink-0">{sub.avatar}</span>
                      <span className="flex-1 text-left truncate">{sub.name}</span>
                      {sub.unread > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                          {sub.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
