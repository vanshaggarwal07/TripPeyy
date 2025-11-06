import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingCart, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoreItem {
  id: string;
  title: string;
  description: string;
  cost_coins: number;
  category: string;
  image_url: string;
  provider: string;
  metadata: any;
}

interface PurchaseConfirmationProps {
  item: StoreItem | null;
  userCoins: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  item,
  userCoins,
  onClose,
  onSuccess
}) => {
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();

  if (!item) return null;

  const canAfford = userCoins >= item.cost_coins;

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;

    setPurchasing(true);
    try {
      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user!.id,
          store_item_id: item.id,
          coins_spent: item.cost_coins,
          purchase_details: {
            item_title: item.title,
            category: item.category,
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
          available_coins: userCoins - item.cost_coins,
          total_coins: userCoins - item.cost_coins,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (coinsError) throw coinsError;

      toast.success(`🎉 Successfully purchased ${item.title}!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Confirm Purchase
          </DialogTitle>
          <DialogDescription>
            Review your purchase details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Details */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">{item.provider}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Cost & Balance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Item Cost</span>
              </div>
              <span className="font-bold text-yellow-900">{item.cost_coins.toLocaleString()} coins</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Your Balance</span>
              </div>
              <span className="font-bold text-blue-900">{userCoins.toLocaleString()} coins</span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              canAfford ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {canAfford ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-medium ${canAfford ? 'text-green-800' : 'text-red-800'}`}>
                  After Purchase
                </span>
              </div>
              <span className={`font-bold ${canAfford ? 'text-green-900' : 'text-red-900'}`}>
                {canAfford 
                  ? `${(userCoins - item.cost_coins).toLocaleString()} coins`
                  : 'Insufficient coins'
                }
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">
                  You need {(item.cost_coins - userCoins).toLocaleString()} more coins
                </p>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Complete more quests to earn additional coins!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handlePurchase}
              disabled={!canAfford || purchasing}
              className="flex-1"
            >
              {purchasing ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};