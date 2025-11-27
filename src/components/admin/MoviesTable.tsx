import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export function MoviesTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: movies, isLoading } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'movie')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMovies = movies?.filter((movie) =>
    movie.title?.toLowerCase().includes(searchQuery.toLowerCase())
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
      toast.success('Movies deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete movies: ' + error.message);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredMovies?.map(m => m.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(mid => mid !== id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} movies?`)) {
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
            placeholder="Search movies..."
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
                  checked={selectedIds.length === filteredMovies?.length && filteredMovies?.length > 0}
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
            {filteredMovies?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  No movies found
                </TableCell>
              </TableRow>
            ) : (
              filteredMovies?.map((movie) => (
                <TableRow key={movie.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(movie.id)}
                      onCheckedChange={(checked) => handleSelectOne(movie.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {movie.poster_path ? (
                      <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{movie.tmdb_id || '-'}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell className="font-medium">{movie.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      ⭐ {movie.popularity ? (movie.popularity / 10).toFixed(1) : '0'}
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
                      <option>{movie.access_type === 'free' ? 'Free' : movie.access_type === 'membership' ? 'Premium' : 'Purchase'}</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/movies/${movie.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this movie?')) {
                            deleteMutation.mutate([movie.id]);
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
