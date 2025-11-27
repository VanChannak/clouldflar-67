import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';

interface UpcomingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

export function UpcomingDialog({ open, onOpenChange, item }: UpcomingDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    title: item?.title || '',
    poster_path: item?.poster_path || '',
    backdrop_path: item?.backdrop_path || '',
    release_date: item?.release_date?.split('T')[0] || '',
    description: item?.description || '',
    content_type: item?.content_type || 'movie',
    tmdb_id: item?.tmdb_id || null,
    is_featured: item?.is_featured || false,
    status: item?.status || 'upcoming',
  });

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.results?.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') || []);
    } catch (error) {
      toast.error('Failed to search TMDB');
    } finally {
      setIsSearching(false);
    }
  };

  const selectTMDBItem = (result: any) => {
    setFormData({
      ...formData,
      title: result.title || result.name,
      poster_path: result.poster_path ? `https://image.tmdb.org/t/p/original${result.poster_path}` : '',
      backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : '',
      release_date: result.release_date || result.first_air_date || '',
      description: result.overview,
      content_type: result.media_type === 'tv' ? 'series' : 'movie',
      tmdb_id: result.id,
      is_featured: formData.is_featured,
      status: formData.status,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (item) {
        const { error } = await supabase
          .from('upcoming_releases')
          .update(formData)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('upcoming_releases')
          .insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(item ? 'Updated successfully' : 'Created successfully');
      queryClient.invalidateQueries({ queryKey: ['upcoming-releases'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Upcoming Release</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search TMDB (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search movies or series..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchTMDB(e.target.value);
                }}
              />
              <Button variant="outline" size="icon" disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex gap-3 p-3 hover:bg-muted cursor-pointer"
                    onClick={() => selectTMDBItem(result)}
                  >
                    {result.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title || result.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{result.title || result.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.media_type === 'tv' ? 'Series' : 'Movie'} • {result.release_date || result.first_air_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="series">Series</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Release Date *</Label>
            <Input
              type="date"
              value={formData.release_date}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Poster URL</Label>
            <Input
              value={formData.poster_path}
              onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Backdrop URL</Label>
            <Input
              value={formData.backdrop_path}
              onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
            <Label>Featured</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.title || !formData.release_date || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
