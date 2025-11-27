import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';

export default function AdminGenres() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Genres</h1>
            <p className="text-muted-foreground">Manage content genres and categories</p>
          </div>
          <Button>
            <Tag className="h-4 w-4 mr-2" />
            Add Genre
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Genre Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Genre management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
