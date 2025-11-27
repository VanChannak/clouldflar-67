import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Search, User, LogOut, Upload, Bell, Mic, Menu, Wallet, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import BottomNav from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import VoiceSearchButton from './VoiceSearchButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/contexts/ThemeContext';
import { KHQRPaymentDialog } from './payment/KHQRPaymentDialog';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';
import { MembershipDialog } from '@/components/MembershipDialog';
import { PullToRefresh } from './PullToRefresh';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { effectiveTheme } = useTheme();
  const logo = effectiveTheme === 'light' ? logoLight : logoDark;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);

  const handleRefresh = async () => {
    // Reload the current page
    window.location.reload();
  };

  useEffect(() => {
    const isGuestMode = localStorage.getItem('guestMode') === 'true';
    if (!loading && !user && !isGuestMode) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (user) {
        const { data } = await import('@/lib/supabase').then(m => m.supabase
          .from('user_profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single()
        );
        if (data) {
          setWalletBalance(Number(data.wallet_balance || 0));
        }
      } else {
        setWalletBalance(0); // Guest mode
      }
    };
    fetchWalletBalance();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('guestMode');
    navigate('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleVoiceSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isGuestMode = localStorage.getItem('guestMode') === 'true';
  if (!user && !isGuestMode) {
    return null;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background dark:bg-black">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        
        <PullToRefresh onRefresh={handleRefresh}>
          <main className="min-h-screen pb-16 px-[1px]">
            {children}
          </main>
        </PullToRefresh>

        <BottomNav />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 backdrop-blur-md border-b border-border/50 bg-white dark:bg-[hsl(220,13%,8%)]">
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Left: Collapse Icon + Logo/Brand */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isTablet ? setTabletSidebarOpen(!tabletSidebarOpen) : setSidebarCollapsed(!sidebarCollapsed)}
              className="hover:bg-accent text-primary dark:text-white"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <img src={logo} alt="KHMERZOON" className="w-10 h-10 object-contain" />
            <span className="font-bold text-xl hidden sm:block text-primary dark:text-white">KHMERZOON</span>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-4 pr-4 rounded-full bg-secondary border-border text-gray-800 dark:text-white"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-12 rounded-r-full hover:bg-accent text-primary dark:text-white"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              <VoiceSearchButton onSearchResult={handleVoiceSearch} />
            </form>
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-2">
            <LanguageToggle variant="icon" />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent text-primary dark:text-white">
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                } else {
                  setShowPaymentDialog(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all hover:scale-105"
            >
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {user ? `$${walletBalance.toFixed(2)}` : 'Sign In'}
              </span>
            </Button>
            <Button 
              variant="default"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setMembershipDialogOpen(true)}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Join Member</span>
            </Button>
          </div>
        </div>
      </header>

      <KHQRPaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={(newBalance) => setWalletBalance(newBalance)}
      />

      <MembershipDialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen} />

      {/* Sidebar - Hidden on tablets/iPad */}
      {!isTablet && (
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}

      {/* Tablet Slide-in Sidebar */}
      {isTablet && (
        <>
          {/* Overlay */}
          {tabletSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={() => setTabletSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed top-0 left-0 h-full w-[280px] border-r border-border z-50 backdrop-blur-md transform transition-transform duration-300 ease-in-out bg-white dark:bg-[hsl(220,13%,8%)] ${
              tabletSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar collapsed={false} onToggle={() => setTabletSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main 
          className="pt-16 transition-all duration-300 ease-in-out min-h-screen"
          style={{ 
            marginLeft: isTablet ? '0' : (sidebarCollapsed ? '5rem' : '16rem')
          }}
        >
          <div 
            className={isTablet ? 'p-0 mx-[0.2rem]' : 'p-4 md:p-6 lg:p-0 max-w-[1920px] mx-auto'}
          >
            {children}
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Layout;
