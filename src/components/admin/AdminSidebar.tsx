import { 
  Home, 
  Film, 
  Radio, 
  Users, 
  Settings, 
  BarChart,
  Tv,
  CreditCard,
  Star,
  Circle,
  Upload,
  Calendar,
  Server,
  FileText,
  Grid3x3,
  Tag,
  Globe,
  FolderOpen,
  Network,
  UserPlus,
  MessageSquare,
  Ticket,
  DollarSign,
  Lightbulb,
  Bell,
  BarChart3,
  Shield
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const mainItems = [
  { icon: Home, label: "Dashboard", path: "/admin" },
  { icon: Star, label: "Featured", path: "/admin/featured" },
];

const contentItems = [
  { icon: Film, label: "Movies", path: "/admin/movies" },
  { icon: Tv, label: "Series", path: "/admin/series" },
  { icon: Circle, label: "Animes", path: "/admin/animes" },
  { icon: Upload, label: "Media Manager", path: "/admin/media" },
  { icon: Radio, label: "Streaming", path: "/admin/streaming" },
  { icon: Calendar, label: "Upcoming", path: "/admin/upcoming" },
  { icon: Server, label: "Servers & DRM", path: "/admin/servers" },
  { icon: FileText, label: "Headers & User Agents", path: "/admin/headers" },
  { icon: Grid3x3, label: "Streaming Categories", path: "/admin/categories" },
  { icon: Tag, label: "Genres", path: "/admin/genres" },
  { icon: Globe, label: "Languages", path: "/admin/languages" },
  { icon: FolderOpen, label: "Collections", path: "/admin/collections" },
  { icon: Network, label: "Networks", path: "/admin/networks" },
];

const userManagementItems = [
  { icon: UserPlus, label: "Casters", path: "/admin/casters" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
  { icon: CreditCard, label: "Subscriptions & Coupon", path: "/admin/subscriptions" },
];

const systemItems = [
  { icon: DollarSign, label: "Ad Manager", path: "/admin/ads" },
  { icon: BarChart, label: "Reports", path: "/admin/reports" },
  { icon: Lightbulb, label: "Suggestions", path: "/admin/suggestions" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Shield, label: "Moderators", path: "/admin/moderators" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        {/* Main Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>User Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userManagementItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
