import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCastMemberWithCredits } from "@/services/castService";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import { useIsMobile } from "@/hooks/use-mobile";
import CastMemberProfile from "./CastMemberProfile";
import CastMemberDialogTabs from "./CastMemberDialogTabs";

interface CastMember {
  id: number;
  name: string;
  role: string;
  image: string;
  profile_path?: string | null;
}

interface CastMemberDialogProps {
  castMember: CastMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const CastMemberDialog = ({ castMember, isOpen, onClose }: CastMemberDialogProps) => {
  const [detailedCast, setDetailedCast] = useState<StoredCastMember | null>(null);
  const [credits, setCredits] = useState<StoredCastCredit[]>([]);
  const [movieCredits, setMovieCredits] = useState<StoredCastCredit[]>([]);
  const [tvCredits, setTvCredits] = useState<StoredCastCredit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();

  useEffect(() => {
    if (castMember && isOpen) {
      loadCastMemberData();
    }
  }, [castMember, isOpen]);

  const loadCastMemberData = async () => {
    if (!castMember) return;
    
    setIsLoading(true);
    try {
      const { castMember: detailsResult, credits: creditsResult } = await getCastMemberWithCredits(castMember.id);

      setDetailedCast(detailsResult);
      setCredits(creditsResult);
      
      const movies = creditsResult.filter(credit => credit.media_type === 'movie');
      const tvShows = creditsResult.filter(credit => credit.media_type === 'tv');
      
      setMovieCredits(movies);
      setTvCredits(tvShows);
    } catch (error) {
      console.error('Error loading cast member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShare = () => {
    if (navigator.share && castMember) {
      navigator.share({
        title: `${castMember.name} - Cast Member`,
        text: `Check out ${castMember.name} who plays ${castMember.role}`,
        url: window.location.href,
      });
    } else if (castMember) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (!castMember) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${
        isMobile 
          ? 'max-w-full w-full h-full m-0 p-0 inset-0 translate-x-0 translate-y-0 rounded-none' 
          : 'max-w-4xl h-[90vh]'
      } bg-background border-border overflow-hidden flex flex-col`}>
        <DialogHeader className="sr-only">
          <DialogTitle>Cast Member Details</DialogTitle>
        </DialogHeader>
        
        <div className="flex-shrink-0 bg-gradient-to-b from-card/80 to-background border-b border-border">
          <CastMemberProfile
            castMember={castMember}
            detailedCast={detailedCast}
            movieCredits={movieCredits}
            tvCredits={tvCredits}
            isFollowing={isFollowing}
            isMobile={isMobile}
            onFollow={handleFollow}
            onShare={handleShare}
          />
        </div>
        
        <div className="flex-1 min-h-0">
          <CastMemberDialogTabs
            detailedCast={detailedCast}
            credits={credits}
            movieCredits={movieCredits}
            tvCredits={tvCredits}
            isLoading={isLoading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isMobile={isMobile}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CastMemberDialog;
