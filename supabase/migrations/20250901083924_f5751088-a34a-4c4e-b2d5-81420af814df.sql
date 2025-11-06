-- Fix function security - set search_path for all functions
CREATE OR REPLACE FUNCTION public.award_quest_coins(
  p_user_id UUID,
  p_quest_id UUID,
  p_coins INTEGER,
  p_bonus_coins INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_reward INTEGER := p_coins + p_bonus_coins;
BEGIN
  -- Update or insert user coins
  INSERT INTO public.user_coins (user_id, total_coins, available_coins, lifetime_earned)
  VALUES (p_user_id, total_reward, total_reward, total_reward)
  ON CONFLICT (user_id) DO UPDATE SET
    total_coins = user_coins.total_coins + total_reward,
    available_coins = user_coins.available_coins + total_reward,
    lifetime_earned = user_coins.lifetime_earned + total_reward,
    updated_at = now();

  -- Record the reward
  INSERT INTO public.user_rewards (
    user_id,
    quest_id,
    reward_type,
    coins_earned,
    bonus_coins,
    description
  ) VALUES (
    p_user_id,
    p_quest_id,
    'quest_completion',
    p_coins,
    p_bonus_coins,
    'Quest completion reward'
  );

  -- Update leaderboard
  INSERT INTO public.user_leaderboard (
    user_id,
    total_coins_earned,
    total_quests_completed,
    last_quest_completed,
    current_streak
  ) VALUES (
    p_user_id,
    total_reward,
    1,
    now(),
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_coins_earned = user_leaderboard.total_coins_earned + total_reward,
    total_quests_completed = user_leaderboard.total_quests_completed + 1,
    last_quest_completed = now(),
    current_streak = CASE 
      WHEN user_leaderboard.last_quest_completed > now() - INTERVAL '24 hours' 
      THEN user_leaderboard.current_streak + 1 
      ELSE 1 
    END,
    longest_streak = GREATEST(
      user_leaderboard.longest_streak,
      CASE 
        WHEN user_leaderboard.last_quest_completed > now() - INTERVAL '24 hours' 
        THEN user_leaderboard.current_streak + 1 
        ELSE 1 
      END
    ),
    updated_at = now();
END;
$$;

-- Fix auto_assign_starter_quests function
CREATE OR REPLACE FUNCTION public.auto_assign_starter_quests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign the first 3 quests to new users
  INSERT INTO public.user_quests (user_id, quest_id, status, expires_at)
  SELECT 
    NEW.user_id,
    q.id,
    'active',
    now() + INTERVAL '7 days'
  FROM public.quests q
  WHERE q.difficulty_level = 1
  LIMIT 3;

  -- Initialize user coins
  INSERT INTO public.user_coins (user_id, total_coins, available_coins, lifetime_earned)
  VALUES (NEW.user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;