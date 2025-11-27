import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

export default function AdminAdManager() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ad Manager</h1>
            <p className="text-muted-foreground">Manage advertisements and campaigns</p>
          </div>
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Create Ad
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Advertisement Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ad management tools will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
