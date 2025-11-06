-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_available_coins_trigger ON user_coins;

-- Create a function to calculate available coins
CREATE OR REPLACE FUNCTION public.calculate_available_coins(p_user_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT GREATEST(
    COALESCE(
      (SELECT total_coins FROM user_coins WHERE user_id = p_user_id), 0
    ) - COALESCE(
      (SELECT SUM(coins_spent) FROM user_purchases WHERE user_id = p_user_id), 0
    ),
    0
  );
$$;

-- Update the update_available_coins function
CREATE OR REPLACE FUNCTION public.update_available_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.available_coins := public.calculate_available_coins(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_available_coins_trigger
BEFORE INSERT OR UPDATE OF total_coins ON user_coins
FOR EACH ROW
EXECUTE FUNCTION public.update_available_coins();

-- Create a trigger for purchases
CREATE OR REPLACE FUNCTION public.update_coins_after_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the user's available coins after a purchase
  UPDATE user_coins
  SET 
    available_coins = public.calculate_available_coins(NEW.user_id),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for purchases
CREATE OR REPLACE TRIGGER after_purchase_trigger
AFTER INSERT ON user_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_coins_after_purchase();

-- Fix existing data
UPDATE user_coins uc
SET available_coins = public.calculate_available_coins(uc.user_id)
WHERE available_coins IS DISTINCT FROM public.calculate_available_coins(uc.user_id);
