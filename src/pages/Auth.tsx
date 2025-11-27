import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthBackground } from '@/hooks/useAuthBackground';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const { background, loading: bgLoading } = useAuthBackground();
  const { effectiveTheme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const logo = effectiveTheme === 'light' ? logoLight : logoDark;

  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && !agreedToTerms) {
      toast({
        title: 'Agreement Required',
        description: 'Please agree to the terms and conditions to sign up.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: isSignUp ? 'Account created! Please check your email.' : 'Welcome back!'
        });
        if (!isSignUp) {
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('guestMode', 'true');
    navigate('/');
  };

  // Desktop: backdrop image (landscape), Mobile: poster image (portrait)
  const backgroundImage = background
    ? `url(${isMobile ? background.poster_path : background.backdrop_path})`
    : 'none';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden -mt-[env(safe-area-inset-top)] pt-[env(safe-area-inset-top)]"
      style={{
        backgroundImage: !bgLoading ? backgroundImage : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: 'calc(100vh + env(safe-area-inset-top))'
      }}
    >
      {/* Gradient overlay - clear at top, darker at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background/80" />

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full max-w-md relative z-10">
        <div className="w-full space-y-6">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <img 
              src={logo} 
              alt="KHMERZOON" 
              className="w-20 h-20 mx-auto object-contain"
            />
            <h1 className="text-4xl font-bold uppercase tracking-wider text-foreground">
              KHMERZOON
            </h1>
          </div>

          {/* Glassmorphism Form Card */}
          <form 
            onSubmit={handleSubmit} 
            className="space-y-6 bg-card/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-border/20"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isSignUp ? 'Join KHMERZOON today' : 'Welcome back to KHMERZOON'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-11 h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-11 h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start space-x-3 p-4 bg-background/30 backdrop-blur-sm rounded-lg border border-border/30">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    agreedToTerms 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/50 bg-background/50'
                  }`}>
                    {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                  </div>
                </button>
                <label 
                  htmlFor="terms" 
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  I agree to the terms and conditions. I confirm I am a human and will use this service responsibly.
                </label>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loading || (isSignUp && !agreedToTerms)}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/40 px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            <Button 
              type="button"
              onClick={handleSkip}
              className="w-full h-12 bg-muted hover:bg-muted/80 text-foreground font-semibold"
            >
              SKIP ⏭
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex md:hidden w-full max-w-sm relative z-10">
        <div className="w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-3">
            <img 
              src={logo} 
              alt="KHMERZOON" 
              className="w-16 h-16 mx-auto object-contain"
            />
            <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
              KHMERZOON
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Create Your Account' : 'Sign In'}
            </p>
          </div>

          {/* Mobile Form - Minimal Design */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  type="email"
                  placeholder="E-Mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-12 h-14 bg-background/30 backdrop-blur-md border-border/30 text-foreground placeholder:text-muted-foreground/70 rounded-xl focus:bg-background/40"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-12 h-14 bg-background/30 backdrop-blur-md border-border/30 text-foreground placeholder:text-muted-foreground/70 rounded-xl focus:bg-background/40"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start space-x-3 p-4 bg-background/20 backdrop-blur-sm rounded-xl border border-border/20">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    agreedToTerms 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/50 bg-background/30'
                  }`}>
                    {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                  </div>
                </button>
                <label 
                  className="text-sm text-foreground/80 cursor-pointer select-none"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  I agree to the terms and confirm I'm human
                </label>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-bold uppercase tracking-wide rounded-xl" 
              disabled={loading || (isSignUp && !agreedToTerms)}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </Button>

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-foreground/80 hover:text-foreground font-medium"
              >
                {isSignUp ? 'LOGIN' : 'SIGN UP'}
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-muted-foreground/70">Or</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-14 bg-background/30 backdrop-blur-md border-border/30 hover:bg-background/40 rounded-xl" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button 
              type="button"
              onClick={handleSkip}
              className="w-full h-14 bg-muted hover:bg-muted/80 text-foreground font-bold uppercase rounded-xl"
            >
              SKIP ⏭
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
