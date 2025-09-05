import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserCoins {
  total_coins: number;
  available_coins: number;
  lifetime_earned: number;
}

export function CoinBalance() {
  const [coins, setCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCoins();
      
      // Set up real-time subscription for coin updates
      const subscription = supabase
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

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchCoins = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCoins(data || { total_coins: 0, available_coins: 0, lifetime_earned: 0 });
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
            <p className="text-2xl font-bold text-yellow-900">
              {coins?.available_coins?.toLocaleString() || 0}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-yellow-700 mb-1">
              <Award className="h-3 w-3" />
              <span>Total: {coins?.lifetime_earned?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-yellow-700">
              <TrendingUp className="h-3 w-3" />
              <span>Available</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}