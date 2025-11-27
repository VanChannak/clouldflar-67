import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function AdminLanguages() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
            <p className="text-muted-foreground">Manage supported languages</p>
          </div>
          <Button>
            <Globe className="h-4 w-4 mr-2" />
            Add Language
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Language Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Language management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
