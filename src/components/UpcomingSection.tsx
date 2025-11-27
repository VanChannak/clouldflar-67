import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MovieCard from './MovieCard';
import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return <div className="text-xs">Available now!</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-4 gap-1 text-center">
        <div className="bg-background/90 rounded px-1 py-0.5">
          <div className="text-xs font-bold">{timeLeft.days}</div>
          <div className="text-[8px] text-muted-foreground">days</div>
        </div>
        <div className="bg-background/90 rounded px-1 py-0.5">
          <div className="text-xs font-bold">{timeLeft.hours}</div>
          <div className="text-[8px] text-muted-foreground">hrs</div>
        </div>
        <div className="bg-background/90 rounded px-1 py-0.5">
          <div className="text-xs font-bold">{timeLeft.minutes}</div>
          <div className="text-[8px] text-muted-foreground">min</div>
        </div>
        <div className="bg-background/90 rounded px-1 py-0.5">
          <div className="text-xs font-bold">{timeLeft.seconds}</div>
          <div className="text-[8px] text-muted-foreground">sec</div>
        </div>
      </div>
    </div>
  );
}

export function UpcomingSection() {
  const { data: items } = useQuery({
    queryKey: ['upcoming-releases-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('status', 'upcoming')
        .gte('release_date', new Date().toISOString())
        .order('release_date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  if (!items?.length) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Coming Soon</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <MovieCard
                id={item.content_id || item.id}
                title={item.title}
                description={item.description || ''}
                imageUrl={item.poster_path}
                contentType={item.content_type as 'movie' | 'series'}
              />
              <div className="absolute top-2 right-2 left-2 bg-primary/95 backdrop-blur-sm text-primary-foreground p-2 rounded">
                <CountdownTimer targetDate={item.release_date} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
