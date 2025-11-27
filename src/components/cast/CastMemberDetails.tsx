import React from "react";
import { Users, ExternalLink, Clock, Star, Calendar, MapPin, User, Globe, Award } from "lucide-react";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import { formatDate, getAge, getGenderLabel } from "./utils";

interface CastMemberDetailsProps {
  detailedCast: StoredCastMember | null;
  movieCredits: StoredCastCredit[];
  tvCredits: StoredCastCredit[];
  credits: StoredCastCredit[];
  isMobile: boolean;
}

const CastMemberDetails = ({ detailedCast, movieCredits, tvCredits, credits, isMobile }: CastMemberDetailsProps) => {
  if (!detailedCast) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground text-center">
          <User size={40} className="mx-auto mb-3" />
          <div className="text-lg mb-2">No detailed information available</div>
          <div className="text-sm">Check back later for more details</div>
        </div>
      </div>
    );
  }

  const careerSpan = React.useMemo(() => {
    const allDates = credits
      .map(credit => credit.release_date)
      .filter(Boolean)
      .map(date => new Date(date!).getFullYear())
      .sort();
    
    if (allDates.length === 0) return null;
    
    const firstYear = allDates[0];
    const lastYear = allDates[allDates.length - 1];
    const yearsActive = lastYear - firstYear + 1;
    
    return { firstYear, lastYear, yearsActive };
  }, [credits]);

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2`}>
          <Users size={20} className="text-primary" />
          Personal Information
        </h3>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
          {detailedCast.known_for_department && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <Award size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs block">Known For</span>
                <p className="font-semibold text-sm">{detailedCast.known_for_department}</p>
              </div>
            </div>
          )}
          
          {detailedCast.birthday && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <Calendar size={16} className="text-blue-400 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs block">Birthday</span>
                <p className="font-semibold text-sm">{formatDate(detailedCast.birthday)}</p>
                {getAge(detailedCast.birthday) && (
                  <p className="text-xs text-muted-foreground">({getAge(detailedCast.birthday)})</p>
                )}
              </div>
            </div>
          )}
          
          {detailedCast.place_of_birth && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <MapPin size={16} className="text-green-400 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs block">Place of Birth</span>
                <p className="font-semibold text-xs">{detailedCast.place_of_birth}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
            <User size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground text-xs block">Gender</span>
              <p className="font-semibold text-sm">{getGenderLabel(detailedCast.gender)}</p>
            </div>
          </div>

          {detailedCast.popularity && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <Star size={16} className="text-pink-400 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs block">Popularity Score</span>
                <p className="font-semibold text-sm">{Math.round(detailedCast.popularity)}</p>
              </div>
            </div>
          )}

          {careerSpan && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <Clock size={16} className="text-indigo-400 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground text-xs block">Career Span</span>
                <p className="font-semibold text-sm">
                  {careerSpan.firstYear} - {careerSpan.lastYear}
                </p>
                <p className="text-xs text-muted-foreground">({careerSpan.yearsActive} years active)</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {(detailedCast.homepage || detailedCast.imdb_id) && (
        <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2`}>
            <ExternalLink size={20} className="text-primary" />
            External Links
          </h3>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap gap-3'}`}>
            {detailedCast.homepage && (
              <a 
                href={detailedCast.homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-all duration-300 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                <Globe size={14} />
                Official Website
              </a>
            )}
            {detailedCast.imdb_id && (
              <a 
                href={`https://www.imdb.com/name/${detailedCast.imdb_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-all duration-300 text-secondary-foreground font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                <ExternalLink size={14} />
                IMDb Profile
              </a>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2`}>
          <Clock size={20} className="text-primary" />
          Career Statistics
        </h3>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
          <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
            <p className="text-2xl font-bold text-blue-400 mb-1">{movieCredits.length}</p>
            <p className="text-xs font-medium">Movies</p>
          </div>
          <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
            <p className="text-2xl font-bold text-purple-400 mb-1">{tvCredits.length}</p>
            <p className="text-xs font-medium">TV Shows</p>
          </div>
          <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
            <p className="text-2xl font-bold text-yellow-400 mb-1">{credits.length}</p>
            <p className="text-xs font-medium">Total Credits</p>
          </div>
          {detailedCast.popularity && (
            <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
              <p className="text-2xl font-bold text-green-400 mb-1">{Math.round(detailedCast.popularity)}</p>
              <p className="text-xs font-medium">Popularity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CastMemberDetails;
