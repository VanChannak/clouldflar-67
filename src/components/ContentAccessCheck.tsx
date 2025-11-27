import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, CreditCard, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';
import { MembershipDialog } from '@/components/MembershipDialog';

interface ContentAccessCheckProps {
  contentId: string;
  episodeId?: string;
  contentType: 'movie' | 'series';
  contentTitle: string;
  price: number;
  rentalPeriod: number;
  contentBackdrop?: string;
  excludeFromPlan?: boolean;
  version?: string;
  onAccessGranted?: () => void;
  children: ReactNode;
}

const ContentAccessCheck = ({
  contentId,
  episodeId,
  contentType,
  contentTitle,
  price,
  rentalPeriod,
  contentBackdrop,
  excludeFromPlan = false,
  version,
  onAccessGranted,
  children
}: ContentAccessCheckProps) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [accessReason, setAccessReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showMembershipDialog, setShowMembershipDialog] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Check user access
  useEffect(() => {
    checkAccess();
  }, [contentId, episodeId]);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Explicit handling for guests (not logged in)
      if (!user) {
        // Check if content is free (explicitly marked as free or price is 0)
        const isFreeContent = version?.toLowerCase() === 'free' || 
                             (price === 0 && version?.toLowerCase() !== 'purchase' && version?.toLowerCase() !== 'membership');
        
        if (isFreeContent) {
          // For free content, grant access to everyone including guests
          setHasAccess(true);
          setAccessReason('free_content');
          setLoading(false);
          onAccessGranted?.();
        } else {
          // For paid/restricted content, deny access and show overlay
          setHasAccess(false);
          setIsPremium(false);
          setAccessReason('authentication_required');
          setLoading(false);
        }
        return;
      }

      // Check if user has premium membership
      const { data: membership } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        setIsPremium(true);
      }

      // Use the database function to check access
      const checkFunction = episodeId ? 'check_episode_access' : 'check_content_access';
      const checkId = episodeId || contentId;
      
      const params = episodeId 
        ? { episode_uuid: checkId }
        : { content_uuid: checkId };
      
      const { data, error } = await supabase.rpc(checkFunction, params as any);

      if (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
        setAccessReason('error');
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const accessData = data[0];
        setHasAccess(accessData.has_access);
        setAccessReason(accessData.access_reason || '');
        
        if (accessData.has_access) {
          onAccessGranted?.();
        }
      } else {
        setHasAccess(false);
        setAccessReason('no_access');
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(price === 0);
      setAccessReason('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setWalletBalance(profileData?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const handlePurchase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please login to purchase content',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      if (walletBalance < price) {
        toast({
          title: 'Insufficient Balance',
          description: `Your wallet balance is $${walletBalance.toFixed(2)}. You need $${price.toFixed(2)} to purchase this content. Please top up your wallet.`,
          variant: 'destructive'
        });
        return;
      }

      // Use the wallet purchase function
      const purchaseId = episodeId || contentId;
      const { error } = await supabase.rpc('purchase_content_with_wallet', {
        p_user_id: user.id,
        p_content_id: purchaseId,
        p_amount: price,
        p_currency: 'USD'
      });

      if (error) throw error;

      toast({
        title: 'Purchase Successful!',
        description: `You now have access to ${contentTitle}. $${price} deducted from your wallet.`,
      });

      setHasAccess(true);
      setShowPurchaseDialog(false);
      onAccessGranted?.();
      await checkAccess(); // Refresh access status
    } catch (error: any) {
      console.error('Error purchasing:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Lock screen overlay
  const backdropUrl = contentBackdrop?.startsWith('http') 
    ? contentBackdrop 
    : contentBackdrop 
      ? `https://image.tmdb.org/t/p/original${contentBackdrop}`
      : null;

  return (
    <>
      <div 
        className="w-full h-full relative flex flex-col items-center justify-center bg-black/90 overflow-hidden"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay - Responsive gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70" />

        {/* Content - Fully responsive layout with scale reduction and max-height */}
        <div className={`relative z-10 text-center w-full max-h-[85vh] overflow-y-auto ${
          isMobile 
            ? 'space-y-3 px-3 py-4 scale-[0.85]' 
            : isTablet 
              ? 'space-y-4 px-6 max-w-lg scale-[0.85]' 
              : 'space-y-5 px-5 max-w-md scale-[0.85]'
        }`}>
          {/* Title and Badge - Responsive typography */}
          <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
            <div className="flex justify-center">
              <Badge 
                variant="outline" 
                className={`backdrop-blur-md font-semibold ${
                  version?.toLowerCase() === 'purchase'
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                    : 'bg-red-500/20 border-red-500/50 text-red-500'
                } ${
                  isMobile 
                    ? 'px-2.5 py-0.5 text-[10px]' 
                    : 'px-3 py-0.5 text-xs'
                }`}
              >
                {version?.toLowerCase() === 'purchase' ? (
                  <>
                    <Key className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    For Rent
                  </>
                ) : (
                  <>
                    <Crown className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    Premium Content
                  </>
                )}
              </Badge>
            </div>
            
            <h2 className={`font-bold text-white ${
              isMobile 
                ? 'text-lg' 
                : isTablet 
                  ? 'text-xl' 
                  : 'text-2xl'
            }`}>
              {version?.toLowerCase() === 'purchase' 
                ? 'Rent Content' 
                : 'Premium Membership Required'}
            </h2>
            
            <p className={`text-gray-300 max-w-sm mx-auto ${
              isMobile 
                ? 'text-xs px-1' 
                : isTablet 
                  ? 'text-sm' 
                  : 'text-base'
            }`}>
              {version?.toLowerCase() === 'purchase' && excludeFromPlan
                ? 'Purchase to watch now!'
                : version?.toLowerCase() === 'purchase' && !excludeFromPlan
                  ? 'This content requires a purchase or premium subscription'
                  : 'Purchase to watch now!'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className={`pt-1 ${isMobile ? 'px-1' : ''}`}>
            {/* Case 1: Purchase with exclude_from_plan = true */}
            {version?.toLowerCase() === 'purchase' && excludeFromPlan && (
              <Button 
                size={isMobile ? "sm" : "default"}
                className={`w-full font-semibold bg-red-500 hover:bg-red-600 text-white ${
                  isMobile 
                    ? 'text-sm h-10' 
                    : 'text-base h-12'
                }`}
                onClick={() => setShowPurchaseDialog(true)}
              >
                <CreditCard className={`mr-1.5 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                Purchase ${price} ({rentalPeriod}d)
              </Button>
            )}

            {/* Case 2: Purchase with exclude_from_plan = false */}
            {version?.toLowerCase() === 'purchase' && !excludeFromPlan && (
              <div className="flex gap-1.5 w-full">
                <Button 
                  size={isMobile ? "sm" : "default"}
                  className={`flex-1 font-semibold bg-red-500 hover:bg-red-600 text-white ${
                    isMobile 
                      ? 'text-xs h-10' 
                      : 'text-sm h-12'
                  }`}
                  onClick={() => setShowPurchaseDialog(true)}
                >
                  <CreditCard className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                  Purchase ${price} ({rentalPeriod}d)
                </Button>
                <Button 
                  size={isMobile ? "sm" : "default"}
                  className={`flex-1 font-semibold bg-[hsl(var(--watching))] hover:bg-[hsl(var(--watching))]/90 text-black ${
                    isMobile 
                      ? 'text-xs h-10' 
                      : 'text-sm h-12'
                  }`}
                  onClick={() => setShowMembershipDialog(true)}
                >
                  <Crown className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                  View Subscription Plans
                </Button>
              </div>
            )}

            {/* Case 3: Membership version */}
            {version?.toLowerCase() === 'membership' && (
              <Button 
                size={isMobile ? "sm" : "default"}
                className={`w-full font-semibold bg-[hsl(var(--watching))] hover:bg-[hsl(var(--watching))]/90 text-black ${
                  isMobile 
                    ? 'text-sm h-10' 
                    : 'text-base h-12'
                }`}
                onClick={() => setShowMembershipDialog(true)}
              >
                <Crown className={`mr-1.5 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                Join Membership
              </Button>
            )}
          </div>

          {/* Info text - Responsive sizing */}
          <p className={`text-gray-400 max-w-xs mx-auto ${
            isMobile 
              ? 'text-[10px] px-1 pt-0.5' 
              : 'text-xs'
          }`}>
            {version?.toLowerCase() === 'purchase' && excludeFromPlan
              ? 'This content is excluded from premium plans and requires purchase'
              : version?.toLowerCase() === 'purchase' && !excludeFromPlan
                ? 'Or subscribe to Premium for unlimited access'
                : 'Join our membership for unlimited access to all content'
            }
          </p>
        </div>
      </div>

      {/* Purchase Confirmation Dialog - Responsive */}
      <Dialog open={showPurchaseDialog} onOpenChange={(open) => {
        setShowPurchaseDialog(open);
        if (open) fetchWalletBalance();
      }}>
        <DialogContent className={isMobile ? 'max-w-[90vw] rounded-lg' : 'sm:max-w-md'}>
          <DialogHeader>
            <DialogTitle className={isMobile ? 'text-lg' : ''}>Purchase Content</DialogTitle>
            <DialogDescription className={isMobile ? 'text-xs' : 'text-sm'}>
              Complete your purchase using your wallet balance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Content Info */}
            <div>
              <h3 className="font-semibold text-lg">{contentTitle}</h3>
              <p className="text-sm text-muted-foreground capitalize">{contentType}</p>
            </div>

            {/* Wallet Balance */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">Wallet Balance</span>
              </div>
              <span className="font-bold text-lg">${walletBalance.toFixed(2)}</span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
              <span className="text-sm font-medium">Price</span>
              <span className="font-bold text-lg text-red-500">${price.toFixed(2)} USD</span>
            </div>
          </div>

          <DialogFooter className={`gap-2 ${isMobile ? 'flex-col' : ''}`}>
            <Button 
              variant="outline" 
              onClick={() => setShowPurchaseDialog(false)}
              className={isMobile ? 'w-full' : ''}
            >
              Cancel
            </Button>
            {walletBalance < price ? (
              <Button 
                onClick={() => setShowTopUpDialog(true)}
                className={`bg-red-500 hover:bg-red-600 ${isMobile ? 'w-full' : ''}`}
              >
                Top Up Balance
              </Button>
            ) : (
              <Button 
                onClick={handlePurchase}
                className={`bg-red-500 hover:bg-red-600 ${isMobile ? 'w-full' : ''}`}
              >
                Purchase for ${price.toFixed(2)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KHQRPaymentDialog 
        isOpen={showTopUpDialog}
        onClose={() => setShowTopUpDialog(false)}
        onSuccess={(newBalance) => {
          setWalletBalance(newBalance);
          setShowTopUpDialog(false);
          toast({
            title: 'Top Up Successful!',
            description: `Your new balance is $${newBalance.toFixed(2)}`,
          });
        }}
      />

      <MembershipDialog 
        open={showMembershipDialog}
        onOpenChange={setShowMembershipDialog}
      />
    </>
  );
};

export default ContentAccessCheck;
