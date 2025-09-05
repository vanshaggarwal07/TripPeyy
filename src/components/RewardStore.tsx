import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Plane, Hotel, MapPin, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  cost_coins: number;
  image_url?: string;
  provider?: string;
  metadata: any;
  is_active: boolean;
  stock_quantity?: number;
}

interface UserCoins {
  available_coins: number;
}

const RewardStore: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const categoryIcons = {
    gift_card: Gift,
    travel_discount: Plane,
    experience: MapPin
  };

  const categoryColors = {
    gift_card: 'bg-purple-500',
    travel_discount: 'bg-blue-500',
    experience: 'bg-green-500'
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load store items
      const { data: itemsData, error: itemsError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true)
        .order('cost_coins', { ascending: true });

      if (itemsError) throw itemsError;

      // Load user coins
      const { data: coinsData, error: coinsError } = await supabase
        .from('user_coins')
        .select('available_coins')
        .eq('user_id', user?.id)
        .single();

      if (coinsError && coinsError.code !== 'PGRST116') {
        throw coinsError;
      }

      setItems(itemsData || []);
      setUserCoins(coinsData || { available_coins: 0 });
    } catch (error) {
      console.error('Error loading store data:', error);
      toast.error('Failed to load store items');
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (!userCoins || userCoins.available_coins < item.cost_coins) {
      toast.error('Insufficient coins for this purchase');
      return;
    }

    try {
      setPurchasing(item.id);

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user?.id,
          store_item_id: item.id,
          coins_spent: item.cost_coins,
          purchase_details: {
            item_title: item.title,
            provider: item.provider,
            metadata: item.metadata
          }
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Deduct coins from user balance
      const { error: coinsError } = await supabase
        .from('user_coins')
        .update({
          available_coins: userCoins.available_coins - item.cost_coins,
          total_coins: userCoins.available_coins - item.cost_coins
        })
        .eq('user_id', user?.id);

      if (coinsError) throw coinsError;

      toast.success(`Successfully purchased ${item.title}!`);
      
      // Show redemption details
      if (item.category === 'gift_card') {
        toast.info(`Redemption code: ${generateRedemptionCode()}`);
      } else if (item.category === 'travel_discount') {
        toast.info('Discount code will be sent to your email');
      }

      loadData(); // Refresh data
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast.error('Failed to complete purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const generateRedemptionCode = () => {
    return 'TRIP' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const canAfford = (cost: number) => {
    return userCoins && userCoins.available_coins >= cost;
  };

  const getItemsByCategory = (category: string) => {
    return items.filter(item => item.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with balance */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reward Store</h1>
          <p className="text-muted-foreground">Redeem your TrippEy Coins for amazing rewards!</p>
        </div>
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available Coins</p>
                <p className="text-xl font-bold text-yellow-600">{userCoins?.available_coins || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store sections */}
      <div className="space-y-8">
        {/* Gift Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getItemsByCategory('gift_card').map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                canAfford={canAfford(item.cost_coins)}
                onPurchase={purchaseItem}
                purchasing={purchasing === item.id}
                categoryColors={categoryColors}
              />
            ))}
          </div>
        </div>

        {/* Travel Discounts */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Travel Discounts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getItemsByCategory('travel_discount').map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                canAfford={canAfford(item.cost_coins)}
                onPurchase={purchaseItem}
                purchasing={purchasing === item.id}
                categoryColors={categoryColors}
              />
            ))}
          </div>
        </div>

        {/* Experiences */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Experiences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getItemsByCategory('experience').map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                canAfford={canAfford(item.cost_coins)}
                onPurchase={purchaseItem}
                purchasing={purchasing === item.id}
                categoryColors={categoryColors}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StoreItemCardProps {
  item: StoreItem;
  canAfford: boolean;
  onPurchase: (item: StoreItem) => void;
  purchasing: boolean;
  categoryColors: Record<string, string>;
}

const StoreItemCard: React.FC<StoreItemCardProps> = ({
  item,
  canAfford,
  onPurchase,
  purchasing,
  categoryColors
}) => {
  return (
    <Card className={`transition-all hover:shadow-md ${!canAfford ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.title}</CardTitle>
            <CardDescription className="mt-1">{item.description}</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={`${categoryColors[item.category]} text-white`}>
                {item.category.replace('_', ' ')}
              </Badge>
              {item.provider && (
                <Badge variant="outline">
                  {item.provider}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Item details */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div className="text-sm text-muted-foreground">
              {Object.entries(item.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key.replace('_', ' ')}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price and purchase */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-yellow-600 font-semibold">
              <Coins className="h-4 w-4" />
              {item.cost_coins}
            </div>
            <Button
              onClick={() => onPurchase(item)}
              disabled={!canAfford || purchasing}
              size="sm"
            >
              {purchasing ? (
                'Processing...'
              ) : canAfford ? (
                <>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Redeem
                </>
              ) : (
                'Need More Coins'
              )}
            </Button>
          </div>

          {item.stock_quantity && item.stock_quantity <= 5 && (
            <p className="text-xs text-orange-600">
              Only {item.stock_quantity} left in stock!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RewardStore;