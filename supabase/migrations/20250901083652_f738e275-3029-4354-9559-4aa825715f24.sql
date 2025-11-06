-- Create storage bucket for quest submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-submissions',
  'quest-submissions',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- Create RLS policies for quest submissions storage
CREATE POLICY "Users can upload quest submissions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view quest submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'quest-submissions');

CREATE POLICY "Users can update their quest submissions"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their quest submissions"
ON storage.objects FOR DELETE
USING (bucket_id = 'quest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RPC function to award quest coins
CREATE OR REPLACE FUNCTION public.award_quest_coins(
  p_user_id UUID,
  p_quest_id UUID,
  p_coins INTEGER,
  p_bonus_coins INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Insert sample quests
INSERT INTO public.quests (
  title,
  description,
  category,
  reward_coins,
  bonus_coins,
  requirements,
  verification_rules,
  difficulty_level
) VALUES
(
  'Local Market Explorer',
  'Visit a local market and try traditional food',
  'cultural',
  50,
  25,
  '{"max_amount": 500, "min_items": 2}',
  '{"check_receipt": true, "check_location": false}',
  1
),
(
  'Public Transport Champion',
  'Use public transportation for your journey',
  'transport',
  30,
  10,
  '{"transport_types": ["bus", "train", "metro"]}',
  '{"check_ticket": true, "check_gps": false}',
  1
),
(
  'Street Food Adventure',
  'Try 3 different street food items in one day',
  'food',
  75,
  35,
  '{"min_items": 3, "max_amount": 300}',
  '{"check_receipt": true, "check_photos": true}',
  2
),
(
  'Cultural Heritage Visit',
  'Visit a museum, temple, or historical site',
  'cultural',
  60,
  20,
  '{"min_locations": 1}',
  '{"check_photos": true, "check_location": true}',
  1
),
(
  'Budget Traveler',
  'Complete a day with expenses under ₹200',
  'budget',
  100,
  50,
  '{"max_amount": 200, "min_activities": 2}',
  '{"check_receipt": true, "strict_budget": true}',
  3
);

-- Insert sample store items
INSERT INTO public.store_items (
  title,
  description,
  category,
  cost_coins,
  image_url,
  provider,
  metadata
) VALUES
(
  '₹100 Food Voucher',
  'Redeemable at partner restaurants',
  'voucher',
  200,
  null,
  'TripEy Store',
  '{"value": 100, "currency": "INR", "expiry_days": 30}'
),
(
  'Local SIM Card',
  '7-day local data SIM card',
  'travel_essential',
  150,
  null,
  'TripEy Store', 
  '{"data": "5GB", "validity_days": 7}'
),
(
  'City Walking Tour',
  '2-hour guided walking tour',
  'experience',
  300,
  null,
  'Local Partners',
  '{"duration_hours": 2, "group_size": "max_10"}'
),
(
  'Travel Insurance',
  '24-hour travel insurance coverage',
  'insurance',
  100,
  null,
  'Insurance Partner',
  '{"coverage_hours": 24, "max_claim": 5000}'
);

-- Auto-assign active quests to users when they first access the system
CREATE OR REPLACE FUNCTION public.auto_assign_starter_quests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to auto-assign quests when profile is created
CREATE TRIGGER auto_assign_quests_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_starter_quests();