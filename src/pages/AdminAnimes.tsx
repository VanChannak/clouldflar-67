import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AnimesTable } from '@/components/admin/AnimesTable';

export default function AdminAnimes() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Animes</h1>
            <p className="text-muted-foreground">Manage your anime content</p>
          </div>
          <Button onClick={() => window.location.href = '/admin/animes/new'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Anime
          </Button>
        </div>

        <AnimesTable />
      </div>
    </AdminLayout>
  );
}
