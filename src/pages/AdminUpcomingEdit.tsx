import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
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

const AdminUpcomingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    poster_path: "",
    backdrop_path: "",
    description: "",
    release_date: "",
    content_type: "series" as "movie" | "series",
    status: "upcoming" as "upcoming" | "released" | "cancelled",
    is_featured: false,
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
      });
    }
  }, [upcomingItem]);

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
        })
        .eq("id", id);

      if (error) throw error;
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
      <div className="space-y-6">
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
