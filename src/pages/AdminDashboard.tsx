import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Film, 
  DollarSign, 
  TrendingUp, 
  Eye,
  Star,
  Tv
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalContent: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalViews: number;
  totalWatchTime: number;
  recentPayments: any[];
  recentUsers: any[];
  contentStats: any[];
  notifications: any[];
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
        return;
      }

      fetchDashboardData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for better performance
      const [
        usersResult,
        contentResult,
        revenueResult,
        subsResult,
        shortsResult,
        watchResult,
        paymentsResult,
        usersListResult,
        contentStatsResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('content').select('*', { count: 'exact', head: true }),
        supabase.from('payment_transactions').select('amount').eq('status', 'completed'),
        supabase.from('user_memberships').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shorts').select('views'),
        supabase.from('watch_progress').select('progress_seconds'),
        supabase.from('payment_transactions').select('*, profiles(username)').order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('id, username, wallet_balance, updated_at').order('updated_at', { ascending: false }).limit(10),
        supabase.from('content').select('content_type, access_type').order('created_at', { ascending: false }).limit(100),
        supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      const totalRevenue = revenueResult.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const totalViews = shortsResult.data?.reduce((sum, short) => sum + (short.views || 0), 0) || 0;
      const totalWatchTime = Math.floor((watchResult.data?.reduce((sum, w) => sum + (w.progress_seconds || 0), 0) || 0) / 3600);

      setStats({
        totalUsers: usersResult.count || 0,
        totalContent: contentResult.count || 0,
        totalRevenue,
        activeSubscriptions: subsResult.count || 0,
        totalViews,
        totalWatchTime,
        recentPayments: paymentsResult.data || [],
        recentUsers: usersListResult.data || [],
        contentStats: contentStatsResult.data || [],
        notifications: notificationsResult.data || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your streaming platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Movies</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Film className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">36</div>
              <p className="text-xs text-green-500 mt-1">+12.5%</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Series</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Tv className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">43</div>
              <p className="text-xs text-green-500 mt-1">+8.2%</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0</div>
              <p className="text-xs text-green-500 mt-1">+0%</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${stats?.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-green-500 mt-1">+15.3%</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">All Content</CardTitle>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              + Add New
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Access</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Genre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Year</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rating</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.contentStats.slice(0, 5).map((content: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">{content.title || 'Untitled'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {content.content_type || 'Movie'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={content.access_type === 'free' ? 'default' : 'secondary'}
                          className={content.access_type === 'free' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'}
                        >
                          {content.access_type?.toUpperCase() || 'FREE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                      <td className="py-3 px-4 text-sm">⭐ -</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/content/${content.id}/edit`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
