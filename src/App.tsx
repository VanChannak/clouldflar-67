import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Series from "./pages/Series";
import Movies from "./pages/Movies";
import Short from "./pages/Short";
import Watch from "./pages/Watch";
import WatchPage from "./pages/WatchPage";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Liked from "./pages/Liked";
import Subscriptions from "./pages/Subscriptions";
import Shop from "./pages/Shop";
import PremiumMember from "./pages/PremiumMember";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import EmbedSeries from "./pages/EmbedSeries";
import EmbedMovies from "./pages/EmbedMovies";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPaymentSettings from "./pages/AdminPaymentSettings";
import AdminContentManagement from "./pages/AdminContentManagement";
import AdminContentEdit from "./pages/AdminContentEdit";
import AdminMovies from "./pages/AdminMovies";
import AdminMoviesEdit from "./pages/AdminMoviesEdit";
import AdminUsers from "./pages/AdminUsers";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminPlaceholder from "./pages/AdminPlaceholder";
import AdminSeries from "./pages/AdminSeries";
import AdminSeriesEdit from "./pages/AdminSeriesEdit";
import AdminSeriesAdd from "./pages/AdminSeriesAdd";
import AdminStreaming from "./pages/AdminStreaming";
import AdminStreamingCategories from "./pages/AdminStreamingCategories";
import AdminSettings from "./pages/AdminSettings";
import AdminServersDRM from "./pages/AdminServersDRM";
import AdminReports from "./pages/AdminReports";
import AdminFeatured from "./pages/AdminFeatured";
import AdminFeaturedEdit from "./pages/AdminFeaturedEdit";
import AdminAnimes from "./pages/AdminAnimes";
import AdminMediaManager from "./pages/AdminMediaManager";
import AdminUpcoming from "./pages/AdminUpcoming";
import AdminUpcomingAdd from "./pages/AdminUpcomingAdd";
import AdminUpcomingEdit from "./pages/AdminUpcomingEdit";
import AdminHeadersUserAgents from "./pages/AdminHeadersUserAgents";
import AdminGenres from "./pages/AdminGenres";
import AdminLanguages from "./pages/AdminLanguages";
import AdminCollections from "./pages/AdminCollections";
import AdminNetworks from "./pages/AdminNetworks";
import AdminCasters from "./pages/AdminCasters";
import AdminComments from "./pages/AdminComments";
import AdminCoupons from "./pages/AdminCoupons";
import AdminAdManager from "./pages/AdminAdManager";
import AdminSuggestions from "./pages/AdminSuggestions";
import AdminNotifications from "./pages/AdminNotifications";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminModerators from "./pages/AdminModerators";
import SplashScreen from "./components/SplashScreen";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ContentProtection } from "./components/ContentProtection";
// import { StandaloneMode } from "./components/StandaloneMode";
import { ThemeStatusBar } from "./components/ThemeStatusBar";

const queryClient = new QueryClient();

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
            <ContentProtection />
            {/* <StandaloneMode /> */}
            <ThemeStatusBar />
            <SplashScreen />
            <PWAInstallPrompt />
            <Toaster />
            <Sonner />
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/payment-settings" element={<AdminPaymentSettings />} />
            <Route path="/admin/content" element={<AdminContentManagement />} />
            <Route path="/admin/content/edit" element={<AdminContentEdit />} />
            <Route path="/admin/featured" element={<AdminFeatured />} />
            <Route path="/admin/featured/new" element={<AdminFeaturedEdit />} />
            <Route path="/admin/featured/:id/edit" element={<AdminFeaturedEdit />} />
            <Route path="/admin/movies" element={<AdminMovies />} />
            <Route path="/admin/movies/:id/edit" element={<AdminMoviesEdit />} />
            <Route path="/admin/series/new" element={<AdminSeriesAdd />} />
            <Route path="/admin/movies/new" element={<AdminMoviesEdit />} />
            <Route path="/admin/series" element={<AdminSeries />} />
            <Route path="/admin/series/:id/edit" element={<AdminSeriesEdit />} />
            <Route path="/admin/series/new" element={<AdminSeriesEdit />} />
            <Route path="/admin/animes" element={<AdminAnimes />} />
            <Route path="/admin/media" element={<AdminMediaManager />} />
            <Route path="/admin/streaming" element={<AdminStreaming />} />
            <Route path="/admin/upcoming" element={<AdminUpcoming />} />
            <Route path="/admin/upcoming/add" element={<AdminUpcomingAdd />} />
            <Route path="/admin/upcoming/:id/edit" element={<AdminUpcomingEdit />} />
            <Route path="/admin/servers" element={<AdminServersDRM />} />
            <Route path="/admin/headers" element={<AdminHeadersUserAgents />} />
            <Route path="/admin/categories" element={<AdminStreamingCategories />} />
            <Route path="/admin/genres" element={<AdminGenres />} />
            <Route path="/admin/languages" element={<AdminLanguages />} />
            <Route path="/admin/collections" element={<AdminCollections />} />
            <Route path="/admin/networks" element={<AdminNetworks />} />
            <Route path="/admin/casters" element={<AdminCasters />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/comments" element={<AdminComments />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/ads" element={<AdminAdManager />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/suggestions" element={<AdminSuggestions />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/moderators" element={<AdminModerators />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/shorts" element={<AdminPlaceholder title="Shorts" description="Manage short videos" />} />
            
            <Route path="/history" element={<Layout><History /></Layout>} />
            <Route path="/liked" element={<Layout><Liked /></Layout>} />
            <Route path="/subscriptions" element={<Layout><Subscriptions /></Layout>} />
            <Route path="/shop" element={<Layout><Shop /></Layout>} />
            <Route path="/premium" element={<Layout><PremiumMember /></Layout>} />
            <Route path="/collections" element={<Layout><Collections /></Layout>} />
            <Route path="/collections/:slug" element={<Layout><CollectionDetail /></Layout>} />
            <Route path="/series" element={<Layout><Series /></Layout>} />
            <Route path="/movies" element={<Layout><Movies /></Layout>} />
            <Route path="/short" element={<Layout><Short /></Layout>} />
            <Route path="/watch/:id" element={<Layout><Watch /></Layout>} />
            <Route path="/watch/:type/:id" element={<WatchPage />} />
            <Route path="/watch/:type/:id/:season/:episode" element={<WatchPage />} />
            <Route path="/embed/series/:id/:season/:episode" element={<EmbedSeries />} />
            <Route path="/embed/movies/:id" element={<EmbedMovies />} />
            <Route path="/search" element={<Layout><Search /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
