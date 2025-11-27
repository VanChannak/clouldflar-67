import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Film, Tv, Star, Heart, Share2, Calendar } from "lucide-react";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import { getImageUrl, getAge } from "./utils";

interface CastMember {
  id: number;
  name: string;
  role: string;
  image: string;
  profile_path?: string | null;
}

interface CastMemberProfileProps {
  castMember: CastMember;
  detailedCast: StoredCastMember | null;
  movieCredits: StoredCastCredit[];
  tvCredits: StoredCastCredit[];
  isFollowing: boolean;
  isMobile: boolean;
  onFollow: () => void;
  onShare: () => void;
}

const CastMemberProfile = ({
  castMember,
  detailedCast,
  movieCredits,
  tvCredits,
  isFollowing,
  isMobile,
  onFollow,
  onShare
}: CastMemberProfileProps) => {
  return (
    <div className="p-2">
      <div className={`flex ${isMobile ? 'flex-col items-center gap-2' : 'items-start gap-3'}`}>
        {/* Profile Image */}
        <div className={`
          ${isMobile ? 'w-28 h-36' : 'w-36 h-44'} 
          rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 
          shadow-xl flex-shrink-0 border-2 border-border relative group
        `}>
          {getImageUrl(detailedCast?.profile_path || castMember.profile_path) ? (
            <img 
              src={getImageUrl(detailedCast?.profile_path || castMember.profile_path)} 
              alt={castMember.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className={`${isMobile ? 'h-14 w-14' : 'h-18 w-18'}`}>
                <AvatarFallback className="bg-muted">
                  <User size={isMobile ? 18 : 22} />
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className={`flex-1 ${isMobile ? 'text-center w-full' : ''}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 text-foreground`}>
              {castMember.name}
            </h1>
            <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-primary mb-3 font-medium`}>
              as {castMember.role}
            </p>
            
            {/* Stats */}
            <div className={`flex ${isMobile ? 'flex-wrap justify-center gap-2' : 'gap-3'} mb-2`}>
              {detailedCast?.known_for_department && (
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-blue-400" />
                  <span className="text-xs text-foreground">{detailedCast.known_for_department}</span>
                </div>
              )}
              
              {detailedCast?.birthday && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-green-400" />
                  <span className="text-xs text-foreground">{getAge(detailedCast.birthday)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5">
                <Film size={14} className="text-purple-400" />
                <span className="text-xs text-foreground">{movieCredits.length}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Tv size={14} className="text-orange-400" />
                <span className="text-xs text-foreground">{tvCredits.length}</span>
              </div>
              
              {detailedCast?.popularity && (
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-yellow-400" />
                  <span className="text-xs text-foreground">{Math.round(detailedCast.popularity)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'justify-center' : 'justify-start'} gap-2`}>
            <Button 
              onClick={onFollow} 
              className={`flex items-center gap-2 font-semibold transition-all duration-300 hover:scale-105 ${
                isFollowing ? 'bg-secondary hover:bg-secondary/80' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <Heart size={16} className={isFollowing ? "fill-current" : ""} />
              {isFollowing ? "Following" : "Follow"}
            </Button>
            <Button 
              onClick={onShare} 
              variant="outline" 
              className="transition-all duration-300 hover:scale-105"
            >
              <Share2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CastMemberProfile;
