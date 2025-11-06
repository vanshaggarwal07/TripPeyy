import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp, Award, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface UserCoins {
  total_coins: number;
  available_coins: number;
  lifetime_earned: number;
}

export function CoinBalance() {
  const [coins, setCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [recentRedemptions, setRecentRedemptions] = useState<any[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCoins();
      fetchRecentRedemptions();
      
      // Set up real-time subscriptions
      const coinsSubscription = supabase
        .channel('coins_updates')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_coins',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            fetchCoins();
          }
        )
        .subscribe();

      const purchasesSubscription = supabase
        .channel('purchases_updates')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_purchases',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchRecentRedemptions();
          }
        )
        .subscribe();

      return () => {
        coinsSubscription.unsubscribe();
        purchasesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchRecentRedemptions = async () => {
    if (!user) return;
    
    try {
      setLoadingRedemptions(true);
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          id,
          created_at,
          coins_spent,
          purchase_details->item_title as item_name,
          purchase_details->provider as provider
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentRedemptions(data || []);
    } catch (error) {
      console.error('Error fetching recent redemptions:', error);
      toast.error('Failed to load redemption history');
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const fetchCoins = async () => {
    if (!user) return;
    
    try {
      // Get user's coin data with available coins calculated by the database
      const { data, error } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCoins(data || { 
        total_coins: 0, 
        available_coins: 0, 
        lifetime_earned: 0 
      });
    } catch (error) {
      console.error('Error fetching coins:', error);
      toast.error('Failed to load coin balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-yellow-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-yellow-200 rounded w-24 mb-2"></div>
                <div className="h-6 bg-yellow-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Coins className="h-6 w-6 text-white" />
              </div>
              {coins && coins.available_coins > 0 && (
                <div className="absolute -top-2 -right-2 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">!</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">TripEy Coins</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-yellow-600">
                  {coins?.available_coins.toLocaleString() || 0}
                </span>
                <span className="text-sm text-yellow-500">available</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>Lifetime: {coins?.lifetime_earned.toLocaleString() || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {coins?.total_coins.toLocaleString() || 0} total earned
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Redemptions */}
      <Card className="border-yellow-100">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4 text-yellow-500" />
            Recent Redemptions
          </h3>
          
          {loadingRedemptions ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-3/4 bg-yellow-100 rounded animate-pulse"></div>
                    <div className="h-2 w-1/2 bg-yellow-50 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentRedemptions.length > 0 ? (
            <div className="space-y-3">
              {recentRedemptions.map((redemption) => (
                <div key={redemption.id} className="flex items-start gap-3 py-1">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Gift className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{redemption.item_name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(redemption.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-xs font-medium text-yellow-600">
                        -{redemption.coins_spent} coins
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No recent redemptions</p>
              <p className="text-xs text-muted-foreground mt-1">Redeem rewards to see them here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}