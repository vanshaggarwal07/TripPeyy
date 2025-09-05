import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Map from './Map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, DollarSign } from 'lucide-react';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  budget_limit: number;
  total_spent: number;
}

interface MapExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapExplorer({ open, onOpenChange }: MapExplorerProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTrips();
    }
  }, [open]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Explore Your Travel Map
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <div className="lg:col-span-2 h-full">
            <Map className="h-full rounded-lg" />
          </div>
          
          <div className="space-y-4 overflow-y-auto">
            <h3 className="font-semibold text-lg">Your Destinations</h3>
            {trips.length > 0 ? (
              trips.map((trip) => (
                <Card 
                  key={trip.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTrip?.id === trip.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTrip(trip)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-start justify-between">
                      <span>{trip.title}</span>
                      <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                        {trip.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trip.destination}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${trip.total_spent.toLocaleString()} / ${trip.budget_limit.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No trips found. Create your first trip to see it on the map!</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}