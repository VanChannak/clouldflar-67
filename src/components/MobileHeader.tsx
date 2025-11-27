
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsTablet } from '@/hooks/use-tablet';
import { Wallet } from 'lucide-react';
import logo from '@/assets/logo-red-lion.png';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
  const { effectiveTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const isShortPage = location.pathname === '/short';
  const hideHeaderStyles = isShortPage && isTablet;

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (data) setBalance(data.balance);
    };
    fetchBalance();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
        hideHeaderStyles 
          ? 'bg-transparent border-0' 
          : isScrolled 
            ? 'backdrop-blur-md bg-background/85' 
            : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-accent rounded-lg transition-colors text-gray-800 dark:text-white"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
            <path d="M96 160C96 142.3 110.3 128 128 128L512 128C529.7 128 544 142.3 544 160C544 177.7 529.7 192 512 192L128 192C110.3 192 96 177.7 96 160zM96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320zM544 480C544 497.7 529.7 512 512 512L128 512C110.3 512 96 497.7 96 480C96 462.3 110.3 448 128 448L512 448C529.7 448 544 462.3 544 480z"/>
          </svg>
        </button>

        {/* Spacer for centering balance */}
        <div className="flex-1"></div>

        {/* Balance & Theme Toggle */}
        <div className="flex items-center gap-2">
          {!isShortPage && (
            <button
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                } else {
                  setIsPaymentDialogOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {user ? `$${balance.toFixed(2)}` : 'Sign In'}
              </span>
            </button>
          )}
          {!isShortPage && <ThemeToggle />}
        </div>
      </div>

      <KHQRPaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        onSuccess={(newBalance) => setBalance(newBalance)}
      />
    </header>
  );
};

export default MobileHeader;
