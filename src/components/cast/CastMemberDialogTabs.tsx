import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import CastMemberOverview from "./CastMemberOverview";
import CastMemberFilmography from "./CastMemberFilmography";
import CastMemberDetails from "./CastMemberDetails";

interface CastMemberDialogTabsProps {
  detailedCast: StoredCastMember | null;
  credits: StoredCastCredit[];
  movieCredits: StoredCastCredit[];
  tvCredits: StoredCastCredit[];
  isLoading: boolean;
  activeTab: string;
  onTabChange: (value: string) => void;
  isMobile: boolean;
}

const CastMemberDialogTabs = ({
  detailedCast,
  credits,
  movieCredits,
  tvCredits,
  isLoading,
  activeTab,
  onTabChange,
  isMobile
}: CastMemberDialogTabsProps) => {
  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="flex-shrink-0 w-full border-b border-border bg-transparent px-0.5">
          <TabsTrigger value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="filmography">
            Filmography
          </TabsTrigger>
          <TabsTrigger value="details">
            Details
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="overview" className="h-full overflow-auto p-2 m-0">
            <CastMemberOverview
              detailedCast={detailedCast}
              credits={credits}
              isLoading={isLoading}
              isMobile={isMobile}
            />
          </TabsContent>
          
          <TabsContent value="filmography" className="h-full overflow-hidden p-2 m-0">
            <CastMemberFilmography
              movieCredits={movieCredits}
              tvCredits={tvCredits}
              isMobile={isMobile}
            />
          </TabsContent>
          
          <TabsContent value="details" className="h-full overflow-auto p-2 m-0">
            <CastMemberDetails
              detailedCast={detailedCast}
              movieCredits={movieCredits}
              tvCredits={tvCredits}
              credits={credits}
              isMobile={isMobile}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CastMemberDialogTabs;
