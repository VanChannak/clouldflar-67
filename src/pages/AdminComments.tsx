import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export default function AdminComments() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comments</h1>
            <p className="text-muted-foreground">Moderate user comments</p>
          </div>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comment Moderation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Comment moderation tools will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
