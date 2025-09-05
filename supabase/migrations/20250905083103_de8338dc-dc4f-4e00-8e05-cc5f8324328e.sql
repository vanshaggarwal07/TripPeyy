-- Fix the award_quest_coins function to use correct enum value
CREATE OR REPLACE FUNCTION public.award_quest_coins(p_user_id uuid, p_quest_id uuid, p_coins integer, p_bonus_coins integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Record the reward with correct enum value
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
    'coins',  -- Changed from 'quest_completion' to 'coins'
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
$function$;

-- Manually award coins for the completed quests that failed previously
-- Quest 1: 300 + 100 = 400 coins
-- Quest 2: 300 + 100 = 400 coins  
-- Quest 3: 60 + 20 = 80 coins
-- Total: 880 coins

UPDATE public.user_coins 
SET 
  total_coins = 880,
  available_coins = 880,
  lifetime_earned = 880,
  updated_at = now()
WHERE user_id = '185ee0b9-d538-423a-b82d-2edc95538337';

-- Add the reward records manually
INSERT INTO public.user_rewards (user_id, quest_id, reward_type, coins_earned, bonus_coins, description)
VALUES 
  ('185ee0b9-d538-423a-b82d-2edc95538337', (SELECT quest_id FROM user_quests WHERE id = 'b25c5eeb-1e32-446c-8831-7b9b9e836643'), 'coins', 300, 100, 'Quest completion reward'),
  ('185ee0b9-d538-423a-b82d-2edc95538337', (SELECT quest_id FROM user_quests WHERE id = '873fb59c-0ffa-4265-97fe-02fb84d855e4'), 'coins', 60, 20, 'Quest completion reward');