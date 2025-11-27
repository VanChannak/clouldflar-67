import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AnimesTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: animes, isLoading } = useQuery({
    queryKey: ['admin-animes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'anime')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredAnimes = animes?.filter((anime) =>
    anime.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('content')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Animes deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-animes'] });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete animes: ' + error.message);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAnimes?.map(a => a.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(aid => aid !== id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} animes?`)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search animes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredAnimes?.length && filteredAnimes?.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Cover</TableHead>
              <TableHead>TMDB ID</TableHead>
              <TableHead>IMDB ID</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Vote</TableHead>
              <TableHead>Pinned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAnimes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  No animes found
                </TableCell>
              </TableRow>
            ) : (
              filteredAnimes?.map((anime) => (
                <TableRow key={anime.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(anime.id)}
                      onCheckedChange={(checked) => handleSelectOne(anime.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {anime.poster_path ? (
                      <img
                        src={anime.poster_path}
                        alt={anime.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{anime.tmdb_id || '-'}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell className="font-medium">{anime.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      ⭐ {anime.popularity ? (anime.popularity / 10).toFixed(1) : '0'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      📌 No
                    </span>
                  </TableCell>
                  <TableCell>
                    <select className="px-3 py-1 rounded border bg-background">
                      <option>Public</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select className="px-3 py-1 rounded border bg-background">
                      <option>{anime.access_type === 'free' ? 'Free' : anime.access_type === 'membership' ? 'Premium' : 'Purchase'}</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/animes/${anime.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this anime?')) {
                            deleteMutation.mutate([anime.id]);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
