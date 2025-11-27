import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network } from 'lucide-react';

export default function AdminNetworks() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
            <p className="text-muted-foreground">Manage TV networks and studios</p>
          </div>
          <Button>
            <Network className="h-4 w-4 mr-2" />
            Add Network
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Network Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Network management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
