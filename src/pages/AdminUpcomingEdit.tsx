import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TMDB_API_KEY = "5cfa727c2f549c594772a50e10e3f272";

const AdminUpcomingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    poster_path: "",
    backdrop_path: "",
    description: "",
    release_date: "",
    content_type: "series" as "movie" | "series",
    status: "upcoming" as "upcoming" | "released" | "cancelled",
    is_featured: false,
    tmdb_id: null as number | null,
    content_id: null as string | null,
  });

  const { data: upcomingItem, isLoading } = useQuery({
    queryKey: ['upcoming-release', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (upcomingItem) {
      setFormData({
        title: upcomingItem.title || "",
        poster_path: upcomingItem.poster_path || "",
        backdrop_path: upcomingItem.backdrop_path || "",
        description: upcomingItem.description || "",
        release_date: upcomingItem.release_date || "",
        content_type: (upcomingItem.content_type as "movie" | "series") || "series",
        status: (upcomingItem.status as "upcoming" | "released" | "cancelled") || "upcoming",
        is_featured: upcomingItem.is_featured || false,
        tmdb_id: upcomingItem.tmdb_id || null,
        content_id: upcomingItem.content_id || null,
      });
    }
  }, [upcomingItem]);

  const handleImportFromTMDB = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      const result = data.results?.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

      if (!result) {
        toast.error("No results found");
        return;
      }

      const mediaType = result.media_type || (result.name ? 'tv' : 'movie');
      const contentType = mediaType === 'tv' ? 'series' : 'movie';
      const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
      
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${result.id}?api_key=${TMDB_API_KEY}`
      );
      const details = await detailsResponse.json();

      setFormData({
        ...formData,
        title: result.name || result.title || "",
        poster_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
        backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : "",
        description: result.overview,
        release_date: result.first_air_date || result.release_date || "",
        content_type: contentType,
        tmdb_id: result.id,
      });

      toast.success("Content info loaded from TMDB");
      setSearchQuery("");
    } catch (error) {
      toast.error("Failed to fetch from TMDB");
    } finally {
      setIsSearching(false);
    }
  };

  const importAdditionalData = async (contentId: string, tmdbId: number, contentType: "movie" | "series") => {
    try {
      if (contentType === 'series') {
        // Fetch cast, trailer, and seasons for series
        const [creditsRes, videosRes, seriesRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
        ]);

        const [creditsData, videosData, seriesData] = await Promise.all([
          creditsRes.json(),
          videosRes.json(),
          seriesRes.json()
        ]);

        // Import cast
        if (creditsData.cast?.length > 0) {
          for (const castMember of creditsData.cast.slice(0, 15)) {
            const { data: existing } = await supabase
              .from('cast_members')
              .select('id')
              .eq('tmdb_id', castMember.id)
              .maybeSingle();

            let castId = existing?.id;
            if (!existing) {
              const { data: newCast } = await supabase.from('cast_members').insert({
                tmdb_id: castMember.id,
                name: castMember.name,
                profile_path: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null,
                known_for_department: castMember.known_for_department,
                popularity: castMember.popularity,
                gender: castMember.gender,
              }).select().single();
              castId = newCast?.id;
            }

            if (castId) {
              await supabase.from('cast_credits').insert({
                cast_member_id: castId,
                tmdb_content_id: tmdbId,
                title: formData.title,
                character_name: castMember.character,
                media_type: 'tv',
                release_date: formData.release_date,
                poster_path: formData.poster_path,
              });
            }
          }
        }

        // Import trailer
        if (videosData.results?.length > 0) {
          const trailer = videosData.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results[0];
          if (trailer?.site === 'YouTube') {
            await supabase.from('trailers').delete().eq('content_id', contentId);
            await supabase.from('trailers').insert({
              content_id: contentId,
              youtube_id: trailer.key,
            });
          }
        }

        // Import seasons and episodes
        if (seriesData.number_of_seasons) {
          for (let i = 1; i <= seriesData.number_of_seasons; i++) {
            const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${i}?api_key=${TMDB_API_KEY}`);
            const seasonData = await seasonRes.json();

            if (seasonData.success !== false) {
              const { data: existingSeason } = await supabase
                .from('seasons')
                .select('id')
                .eq('show_id', contentId)
                .eq('season_number', seasonData.season_number)
                .maybeSingle();

              let seasonId = existingSeason?.id;
              if (!existingSeason) {
                const { data: newSeason } = await supabase.from('seasons').insert({
                  show_id: contentId,
                  season_number: seasonData.season_number,
                  title: seasonData.name,
                  overview: seasonData.overview,
                  poster_path: seasonData.poster_path ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}` : null,
                  tmdb_id: seasonData.id,
                }).select().single();
                seasonId = newSeason?.id;
              }

              // Import episodes
              if (seasonData.episodes && seasonId) {
                for (const ep of seasonData.episodes) {
                  const { data: existingEp } = await supabase
                    .from('episodes')
                    .select('id')
                    .eq('show_id', contentId)
                    .eq('season_id', seasonId)
                    .eq('episode_number', ep.episode_number)
                    .maybeSingle();

                  if (!existingEp) {
                    await supabase.from('episodes').insert({
                      show_id: contentId,
                      season_id: seasonId,
                      episode_number: ep.episode_number,
                      title: ep.name,
                      overview: ep.overview,
                      still_path: ep.still_path ? `https://image.tmdb.org/t/p/original${ep.still_path}` : null,
                      air_date: ep.air_date,
                      vote_average: ep.vote_average,
                      duration: ep.runtime,
                      tmdb_id: ep.id,
                    });
                  }
                }
              }
            }
          }
        }
      } else {
        // Import cast and trailer for movies
        const [creditsRes, videosRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`)
        ]);

        const [creditsData, videosData] = await Promise.all([
          creditsRes.json(),
          videosRes.json()
        ]);

        // Import cast
        if (creditsData.cast?.length > 0) {
          for (const castMember of creditsData.cast.slice(0, 15)) {
            const { data: existing } = await supabase
              .from('cast_members')
              .select('id')
              .eq('tmdb_id', castMember.id)
              .maybeSingle();

            let castId = existing?.id;
            if (!existing) {
              const { data: newCast } = await supabase.from('cast_members').insert({
                tmdb_id: castMember.id,
                name: castMember.name,
                profile_path: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null,
                known_for_department: castMember.known_for_department,
                popularity: castMember.popularity,
                gender: castMember.gender,
              }).select().single();
              castId = newCast?.id;
            }

            if (castId) {
              await supabase.from('cast_credits').insert({
                cast_member_id: castId,
                tmdb_content_id: tmdbId,
                title: formData.title,
                character_name: castMember.character,
                media_type: 'movie',
                release_date: formData.release_date,
                poster_path: formData.poster_path,
              });
            }
          }
        }

        // Import trailer
        if (videosData.results?.length > 0) {
          const trailer = videosData.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results[0];
          if (trailer?.site === 'YouTube') {
            await supabase.from('trailers').delete().eq('content_id', contentId);
            await supabase.from('trailers').insert({
              content_id: contentId,
              youtube_id: trailer.key,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error importing additional data:', error);
      throw error;
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("upcoming_releases")
        .update({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          description: formData.description,
          release_date: formData.release_date,
          content_type: formData.content_type,
          status: formData.status,
          is_featured: formData.is_featured,
          tmdb_id: formData.tmdb_id,
        })
        .eq("id", id);

      if (error) throw error;

      // Import additional data if TMDB ID and content ID are available
      if (formData.tmdb_id && formData.content_id) {
        try {
          await importAdditionalData(formData.content_id, formData.tmdb_id, formData.content_type);
          toast.success("Additional data imported from TMDB");
        } catch (importError) {
          console.error('Import error:', importError);
          toast.warning("Updated but some data could not be imported");
        }
      }
    },
    onSuccess: () => {
      toast.success("Upcoming release updated successfully");
      queryClient.invalidateQueries({ queryKey: ["upcoming-releases"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-release", id] });
      navigate("/admin/upcoming");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }
    if (!formData.release_date) {
      toast.error("Please select a release date");
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" onContextMenu={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/upcoming")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Upcoming Release</h1>
            <p className="text-muted-foreground">Update release details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Import from TMDB (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search TMDB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportFromTMDB()}
                />
                <Button
                  variant="outline"
                  onClick={handleImportFromTMDB}
                  disabled={isSearching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: "movie" | "series") =>
                    setFormData({ ...formData, content_type: value })
                  }
                >
                  <SelectTrigger id="content_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date *</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "upcoming" | "released" | "cancelled") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poster_path">Poster URL</Label>
                <Input
                  id="poster_path"
                  value={formData.poster_path}
                  onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backdrop_path">Backdrop URL</Label>
                <Input
                  id="backdrop_path"
                  value={formData.backdrop_path}
                  onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
              <Label htmlFor="is_featured">Featured Release</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/admin/upcoming")}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Updating..." : "Update Release"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUpcomingEdit;
