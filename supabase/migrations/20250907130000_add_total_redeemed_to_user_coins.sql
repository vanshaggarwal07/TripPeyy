-- Add total_redeemed column to user_coins table
ALTER TABLE public.user_coins
ADD COLUMN IF NOT EXISTS total_redeemed INTEGER NOT NULL DEFAULT 0;

-- Create or replace the process_purchase function
CREATE OR REPLACE FUNCTION public.process_purchase(
  user_id_param UUID,
  item_id_param UUID,
  item_cost INTEGER,
  item_title TEXT,
  item_provider TEXT DEFAULT '',
  item_metadata JSONB DEFAULT '{}'::jsonb
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  redemption_code TEXT;
  purchase_details JSONB;
  user_coins_record RECORD;
  item_record RECORD;
BEGIN
  -- Get user's current coins
  SELECT * INTO user_coins_record 
  FROM user_coins 
  WHERE user_id = user_id_param
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get item details
  SELECT * INTO item_record 
  FROM store_items 
  WHERE id = item_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not available';
  END IF;
  
  -- Check if user has enough coins
  IF user_coins_record.available_coins < item_cost THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  -- Generate redemption code
  redemption_code := substr(md5(random()::text), 1, 8);
  
  -- Create purchase record
  INSERT INTO user_purchases (
    user_id, 
    store_item_id, 
    coins_spent, 
    status, 
    purchase_details
  ) VALUES (
    user_id_param,
    item_id_param,
    item_cost,
    'completed',
    jsonb_build_object(
      'item_title', item_title,
      'provider', item_provider,
      'metadata', item_metadata,
      'redemption_code', redemption_code
    )
  )
  RETURNING jsonb_build_object(
    'purchase_id', id,
    'redemption_code', redemption_code
  ) INTO purchase_details;
  
  -- Update user's coin balance
  UPDATE user_coins
  SET 
    available_coins = available_coins - item_cost,
    total_redeemed = total_redeemed + item_cost,
    updated_at = NOW()
  WHERE user_id = user_id_param
  RETURNING * INTO user_coins_record;
  
  -- Return purchase details
  RETURN purchase_details;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
$$;

-- Update the refresh_user_coin_balance function to include total_redeemed
CREATE OR REPLACE FUNCTION public.refresh_user_coin_balance(user_id_param UUID)
RETURNS void AS $$
BEGIN
  WITH redeemed AS (
    SELECT COALESCE(SUM(coins_spent), 0) as total
    FROM user_purchases
    WHERE user_id = user_id_param
  )
  UPDATE user_coins
  SET 
    available_coins = lifetime_earned - (SELECT total FROM redeemed),
    total_redeemed = (SELECT total FROM redeemed),
    updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
