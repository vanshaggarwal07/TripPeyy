-- Remove existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS update_available_coins_trigger ON user_coins;
DROP TRIGGER IF EXISTS after_purchase_trigger ON user_purchases;
DROP FUNCTION IF EXISTS public.update_available_coins();
DROP FUNCTION IF EXISTS public.calculate_available_coins(uuid);
DROP FUNCTION IF EXISTS public.update_coins_after_purchase();

-- Create a view to calculate available coins in real-time
CREATE OR REPLACE VIEW public.user_coin_balance AS
SELECT 
  uc.user_id,
  uc.total_coins,
  COALESCE(uc.total_coins, 0) - COALESCE(up.total_spent, 0) AS available_coins,
  uc.lifetime_earned,
  COALESCE(up.total_spent, 0) AS total_redeemed
FROM 
  user_coins uc
LEFT JOIN (
  SELECT 
    user_id, 
    SUM(coins_spent) as total_spent 
  FROM 
    user_purchases 
  GROUP BY 
    user_id
) up ON uc.user_id = up.user_id;

-- Create a function to refresh the coin balance for a user
CREATE OR REPLACE FUNCTION public.refresh_user_coin_balance(p_user_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  -- This function will be called from the application after any coin-related operations
  -- It ensures the user_coins table stays in sync
  WITH user_balance AS (
    SELECT 
      uc.user_id,
      uc.total_coins - COALESCE(SUM(up.coins_spent), 0) AS available_coins
    FROM 
      user_coins uc
    LEFT JOIN 
      user_purchases up ON uc.user_id = up.user_id
    WHERE 
      uc.user_id = p_user_id
    GROUP BY 
      uc.user_id, uc.total_coins
  )
  UPDATE user_coins uc
  SET 
    available_coins = GREATEST(ub.available_coins, 0),
    updated_at = now()
  FROM user_balance ub
  WHERE uc.user_id = ub.user_id;
$$;

-- Create a trigger to update available_coins after any purchase
CREATE OR REPLACE FUNCTION public.update_after_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_user_coin_balance(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create a trigger to update available_coins when total_coins changes
CREATE OR REPLACE FUNCTION public.update_after_coin_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_user_coin_balance(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create the triggers
CREATE TRIGGER after_purchase_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_after_purchase();

CREATE TRIGGER after_coin_update_trigger
AFTER UPDATE OF total_coins ON user_coins
FOR EACH ROW
WHEN (OLD.total_coins IS DISTINCT FROM NEW.total_coins)
EXECUTE FUNCTION public.update_after_coin_change();

-- Update all user balances now
SELECT public.refresh_user_coin_balance(user_id)
FROM user_coins;
