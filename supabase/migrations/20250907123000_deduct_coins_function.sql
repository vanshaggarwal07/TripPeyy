-- Create a function to get total redeemed coins for a user
CREATE OR REPLACE FUNCTION public.get_total_redeemed_coins(
  user_uuid uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(coins_spent), 0)::integer 
  FROM user_purchases 
  WHERE user_id = user_uuid;
$$;

-- Create a function to get available coins (total_earned - total_redeemed)
CREATE OR REPLACE FUNCTION public.get_available_coins(
  user_uuid uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT total_coins FROM user_coins WHERE user_id = user_uuid) - 
    (SELECT get_total_redeemed_coins(user_uuid)),
    0
  )::integer;
$$;

-- Update the user_coins table to use a trigger for available_coins
CREATE OR REPLACE FUNCTION public.update_available_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.available_coins := public.get_available_coins(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger to update available_coins when total_coins changes
CREATE OR REPLACE TRIGGER update_available_coins_trigger
BEFORE UPDATE OF total_coins ON user_coins
FOR EACH ROW
EXECUTE FUNCTION public.update_available_coins();

-- Function to process a purchase transaction atomically
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
SECURITY DEFINER
AS $$
DECLARE
  v_available_coins integer;
  v_result jsonb;
BEGIN
  -- Get current available coins
  SELECT get_available_coins(p_user_id) INTO v_available_coins;
  
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
  
  -- The trigger will update the available_coins automatically
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Purchase successful',
    'new_balance', get_available_coins(p_user_id)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error processing purchase: ' || SQLERRM
  );
END;
$$;
