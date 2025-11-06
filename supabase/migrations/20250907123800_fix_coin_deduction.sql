-- First, drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_available_coins_trigger ON user_coins;

-- Create or replace the update_available_coins function
CREATE OR REPLACE FUNCTION public.update_available_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate available coins as total_coins minus sum of all redeemed coins
  NEW.available_coins := (
    SELECT COALESCE(NEW.total_coins, 0) - COALESCE(SUM(coins_spent), 0)
    FROM user_purchases
    WHERE user_id = NEW.user_id
  );
  
  -- Ensure available_coins doesn't go below 0
  IF NEW.available_coins < 0 THEN
    NEW.available_coins := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_available_coins_trigger
BEFORE INSERT OR UPDATE OF total_coins ON user_coins
FOR EACH ROW
EXECUTE FUNCTION public.update_available_coins();

-- Create a function to fix existing user balances
CREATE OR REPLACE FUNCTION public.fix_user_balances()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update all user balances
  UPDATE user_coins uc
  SET 
    available_coins = (
      SELECT COALESCE(uc2.total_coins, 0) - COALESCE(SUM(up.coins_spent), 0)
      FROM user_coins uc2
      LEFT JOIN user_purchases up ON up.user_id = uc2.user_id
      WHERE uc2.user_id = uc.user_id
      GROUP BY uc2.user_id, uc2.total_coins
    )
  WHERE available_coins IS DISTINCT FROM (
    SELECT COALESCE(uc2.total_coins, 0) - COALESCE(SUM(up.coins_spent), 0)
    FROM user_coins uc2
    LEFT JOIN user_purchases up ON up.user_id = uc2.user_id
    WHERE uc2.user_id = uc.user_id
    GROUP BY uc2.user_id, uc2.total_coins
  );
  
  -- Ensure no negative balances
  UPDATE user_coins
  SET available_coins = 0
  WHERE available_coins < 0;
  
  RETURN;
END;
$$;

-- Run the fix function
SELECT public.fix_user_balances();

-- Create a function to handle purchases and update balances
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_user_id uuid,
  p_item_id uuid,
  p_item_title text,
  p_provider text,
  p_metadata jsonb,
  p_cost_coins integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_available_coins integer;
  v_total_coins integer;
BEGIN
  -- Get current total coins
  SELECT COALESCE(total_coins, 0) INTO v_total_coins
  FROM user_coins
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock the row for update
  
  -- Calculate available coins
  SELECT COALESCE(v_total_coins, 0) - COALESCE(SUM(coins_spent), 0) INTO v_available_coins
  FROM user_purchases
  WHERE user_id = p_user_id;
  
  v_available_coins := COALESCE(v_available_coins, v_total_coins);
  
  -- Check if user has enough coins
  IF v_available_coins < p_cost_coins THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient coins',
      'available_coins', v_available_coins,
      'required_coins', p_cost_coins
    );
  END IF;
  
  -- Create purchase record
  INSERT INTO user_purchases (
    user_id,
    store_item_id,
    coins_spent,
    purchase_details
  ) VALUES (
    p_user_id,
    p_item_id,
    p_cost_coins,
    jsonb_build_object(
      'item_title', p_item_title,
      'provider', p_provider,
      'metadata', p_metadata
    )
  );
  
  -- Get updated available coins
  SELECT COALESCE(total_coins, 0) - COALESCE(SUM(coins_spent), 0) INTO v_available_coins
  FROM user_coins
  LEFT JOIN user_purchases ON user_purchases.user_id = user_coins.user_id
  WHERE user_coins.user_id = p_user_id
  GROUP BY user_coins.user_id, user_coins.total_coins;
  
  -- Update user_coins with the new available_coins
  UPDATE user_coins
  SET 
    available_coins = v_available_coins,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Purchase successful',
    'new_balance', v_available_coins
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error processing purchase: ' || SQLERRM
  );
END;
$$;
