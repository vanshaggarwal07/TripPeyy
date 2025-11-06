import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Plane, MapPin, History, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import RedemptionHistory from './RedemptionHistory';

type StoreItemCategory = 'gift_card' | 'travel_discount' | 'experience';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  category: StoreItemCategory;
  cost_coins: number;
  image_url?: string;
  provider?: string;
  metadata: any;
  is_active: boolean;
  stock_quantity?: number;
  created_at?: string;
  updated_at?: string;
}

interface UserCoins {
  available_coins: number;
  lifetime_earned: number;
  total_redeemed: number;
  total_coins?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

const RewardStore: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showRedemptions, setShowRedemptions] = useState(false);

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
    if (!user) return;
    
    try {
      setLoading(true);

      // Load store items
      const { data: itemsData, error: itemsError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true)
        .order('cost_coins', { ascending: true });

      if (itemsError) throw itemsError;

      // Ensure items have the correct category type
      const typedItems = (itemsData || []).map(item => ({
        ...item,
        category: item.category as StoreItemCategory
      }));

      // Load user coins with all required fields
      const { data: coinsData, error: coinsError } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Calculate total redeemed coins from purchases
      const { data: redeemedData } = await supabase
        .from('user_purchases')
        .select('coins_spent')
        .eq('user_id', user.id);
      
      const totalRedeemed = (redeemedData || []).reduce((sum, item) => sum + (item.coins_spent || 0), 0);
      
      let userCoins: UserCoins;
      
      if (coinsError || !coinsData) {
        // Create new user coins record if it doesn't exist
        userCoins = { 
          available_coins: 0, 
          lifetime_earned: 0, 
          total_redeemed: totalRedeemed,
          total_coins: 0,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Save the new user coins record
        const { data: insertedCoins, error: insertError } = await supabase
          .from('user_coins')
          .insert([{
            user_id: user.id,
            available_coins: 0,
            lifetime_earned: 0,
            total_redeemed: totalRedeemed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating user coins:', insertError);
        } else if (insertedCoins) {
          userCoins = insertedCoins as UserCoins;
        }
      } else {
        // Use existing coins data with fallbacks
        userCoins = {
          ...coinsData,
          available_coins: coinsData.available_coins ?? 0,
          lifetime_earned: coinsData.lifetime_earned ?? 0,
          // Handle case where total_redeemed might not exist in the database
          total_redeemed: 'total_redeemed' in coinsData 
            ? (coinsData as any).total_redeemed 
            : totalRedeemed,
          total_coins: coinsData.total_coins ?? 0,
          user_id: coinsData.user_id || user.id
        };
        
        // Update available coins if needed
        const calculatedAvailable = Math.max(0, userCoins.lifetime_earned - userCoins.total_redeemed);
        if (userCoins.available_coins !== calculatedAvailable) {
          userCoins.available_coins = calculatedAvailable;
          
          // Save the updated coins
          const { error: updateError } = await supabase
            .from('user_coins')
            .update({
              available_coins: userCoins.available_coins,
              total_redeemed: userCoins.total_redeemed,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
            
          if (updateError) {
            console.error('Error updating user coins:', updateError);
          }
        }
      }
      
      setItems(typedItems);
      setUserCoins(userCoins);
    } catch (error) {
      console.error('Error loading store data:', error);
      toast.error('Failed to load store items');
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (!user || !userCoins) {
      toast.error('You must be logged in to make a purchase');
      return;
    }

    setPurchasing(item.id);

    try {
      // Check if user has enough coins
      if (userCoins.available_coins < item.cost_coins) {
        toast.error('Not enough coins to make this purchase');
        return;
      }

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          store_item_id: item.id,
          coins_spent: item.cost_coins,
          status: 'completed',
          purchase_details: {
            item_title: item.title,
            provider: item.provider || '',
            metadata: item.metadata || {},
            redemption_code: generateRedemptionCode()
          }
        });

      if (purchaseError) throw purchaseError;

      // Update user's coin balance
      const updatedCoins = {
        ...userCoins,
        available_coins: userCoins.available_coins - item.cost_coins,
        total_redeemed: (userCoins.total_redeemed || 0) + item.cost_coins
      };

      const { error: coinsError } = await supabase
        .from('user_coins')
        .update({
          available_coins: updatedCoins.available_coins,
          total_redeemed: updatedCoins.total_redeemed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (coinsError) throw coinsError;

      // Update local state
      setUserCoins(updatedCoins);
      
      // Show success message
      toast.success(`Successfully purchased ${item.title}!`);
      
      // Refresh data to ensure consistency
      loadData();
      
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const generateRedemptionCode = (): string => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const canAfford = (cost: number): boolean => {
    return userCoins ? userCoins.available_coins >= cost : false;
  };

  const getItemsByCategory = (category: StoreItemCategory): StoreItem[] => {
    return items.filter(item => item.category === category);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted/50 rounded-t-lg" />
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted/50 rounded" />
                <div className="h-4 w-1/2 bg-muted/50 rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted/50 rounded mb-4" />
                <div className="h-4 w-3/4 bg-muted/50 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (showRedemptions) {
    return <RedemptionHistory onBack={() => setShowRedemptions(false)} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Reward Store</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto justify-center gap-2"
            onClick={() => setShowRedemptions(true)}
          >
            <History className="h-4 w-4" />
            View Redemptions
          </Button>
          <div className="flex items-center bg-primary/10 px-4 py-2 rounded-full justify-between">
            <div className="flex items-center">
              <Coins className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="font-medium">{userCoins?.available_coins || 0} Points</span>
            </div>
          </div>
        </div>
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