import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Plane, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from 'date-fns';

type PurchaseDetails = {
  item_title: string;
  provider?: string;
  metadata?: any;
  [key: string]: any; // Allow additional properties
};

interface Redemption {
  id: string;
  created_at: string;
  coins_spent: number;
  purchase_details: PurchaseDetails | string | null;
  status: string;
  store_item_id: string;
  user_id: string;
}

const RedemptionHistory: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRedemptions();
    }
  }, [user]);

  const fetchRedemptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Safely parse the purchase_details if it's a string
      const formattedData = (data || []).map(redemption => ({
        ...redemption,
        purchase_details: typeof redemption.purchase_details === 'string' 
          ? JSON.parse(redemption.purchase_details) 
          : redemption.purchase_details || { item_title: 'Unknown Item' }
      }));
      
      setRedemptions(formattedData);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast.error('Failed to load redemption history');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('gift')) return <Gift className="h-5 w-5" />;
    if (lowerTitle.includes('travel') || lowerTitle.includes('flight')) return <Plane className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Button>
        <h2 className="text-2xl font-bold">Your Redemption History</h2>
        <div></div> {/* Empty div for flex spacing */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redemptions</CardTitle>
          <CardDescription>Your recent point redemptions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No redemptions found. Start redeeming points in the store!
            </div>
          ) : (
            <div className="space-y-4">
              {redemptions.map((redemption) => (
                <div key={redemption.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      {getCategoryIcon(
                        typeof redemption.purchase_details === 'object' && redemption.purchase_details !== null
                          ? redemption.purchase_details.item_title || 'Unknown Item'
                          : 'Unknown Item'
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {typeof redemption.purchase_details === 'object' && redemption.purchase_details !== null
                          ? redemption.purchase_details.item_title || 'Unknown Item'
                          : 'Unknown Item'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(redemption.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">-{redemption.coins_spent}</p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedemptionHistory;
