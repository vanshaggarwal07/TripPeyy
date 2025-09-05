-- Create quest system tables

-- Quest categories and types
CREATE TYPE quest_category AS ENUM ('budget', 'exploration', 'transport', 'cultural', 'social_impact');
CREATE TYPE quest_status AS ENUM ('active', 'completed', 'expired', 'locked');
CREATE TYPE submission_status AS ENUM ('pending', 'verified', 'rejected', 'under_review');
CREATE TYPE reward_type AS ENUM ('coins', 'discount', 'experience', 'gift_card');

-- Quests table
CREATE TABLE public.quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category quest_category NOT NULL,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  bonus_coins INTEGER DEFAULT 0,
  requirements JSONB NOT NULL, -- Store quest requirements (amount limits, locations, etc.)
  verification_rules JSONB NOT NULL, -- Store AI verification rules
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  max_participants INTEGER DEFAULT NULL, -- For limited quests
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_chain_quest BOOLEAN DEFAULT false,
  chain_parent_id UUID REFERENCES public.quests(id),
  chain_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User quest assignments
CREATE TABLE public.user_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status quest_status DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  progress JSONB DEFAULT '{}', -- Track progress for multi-step quests
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- Quest submissions (proof uploads)
CREATE TABLE public.quest_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_quest_id UUID NOT NULL REFERENCES public.user_quests(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL, -- 'receipt', 'photo', 'ticket', 'video'
  file_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store extracted data (OCR results, GPS, etc.)
  verification_results JSONB DEFAULT '{}', -- AI verification results
  status submission_status DEFAULT 'pending',
  reviewer_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User rewards and coins
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id),
  reward_type reward_type NOT NULL,
  coins_earned INTEGER DEFAULT 0,
  bonus_coins INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User coins balance
CREATE TABLE public.user_coins (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_coins INTEGER NOT NULL DEFAULT 0,
  available_coins INTEGER NOT NULL DEFAULT 0, -- Available for spending
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reward store items
CREATE TABLE public.store_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'gift_card', 'travel_discount', 'experience'
  cost_coins INTEGER NOT NULL,
  image_url TEXT DEFAULT NULL,
  provider TEXT DEFAULT NULL, -- 'amazon', 'zomato', 'hotel_partner', etc.
  metadata JSONB DEFAULT '{}', -- Store item-specific data
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT NULL, -- NULL for unlimited
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User purchases from store
CREATE TABLE public.user_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES public.store_items(id),
  coins_spent INTEGER NOT NULL,
  purchase_details JSONB DEFAULT '{}', -- Store redemption codes, etc.
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leaderboard tracking
CREATE TABLE public.user_leaderboard (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_quests_completed INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  rank_position INTEGER DEFAULT NULL,
  last_quest_completed TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group challenges
CREATE TABLE public.group_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  max_participants INTEGER NOT NULL DEFAULT 10,
  quest_requirements JSONB NOT NULL,
  reward_distribution JSONB NOT NULL, -- How rewards are split
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group challenge participants
CREATE TABLE public.group_challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress JSONB DEFAULT '{}',
  final_score INTEGER DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenge_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Quests are viewable by everyone
CREATE POLICY "Quests are viewable by everyone" ON public.quests FOR SELECT USING (true);

-- Users can view their own quest assignments
CREATE POLICY "Users can view their own quests" ON public.user_quests FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_quests.user_id));
CREATE POLICY "Users can create their own quest assignments" ON public.user_quests FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_quests.user_id));
CREATE POLICY "Users can update their own quests" ON public.user_quests FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_quests.user_id));

-- Users can manage their own submissions
CREATE POLICY "Users can view their own submissions" ON public.quest_submissions FOR SELECT USING (auth.uid() = (SELECT p.user_id FROM public.profiles p JOIN public.user_quests uq ON p.user_id = uq.user_id WHERE uq.id = quest_submissions.user_quest_id));
CREATE POLICY "Users can create their own submissions" ON public.quest_submissions FOR INSERT WITH CHECK (auth.uid() = (SELECT p.user_id FROM public.profiles p JOIN public.user_quests uq ON p.user_id = uq.user_id WHERE uq.id = quest_submissions.user_quest_id));
CREATE POLICY "Users can update their own submissions" ON public.quest_submissions FOR UPDATE USING (auth.uid() = (SELECT p.user_id FROM public.profiles p JOIN public.user_quests uq ON p.user_id = uq.user_id WHERE uq.id = quest_submissions.user_quest_id));

-- Users can view their own rewards
CREATE POLICY "Users can view their own rewards" ON public.user_rewards FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_rewards.user_id));

-- Users can view their own coins
CREATE POLICY "Users can view their own coins" ON public.user_coins FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_coins.user_id));
CREATE POLICY "Users can create their own coin records" ON public.user_coins FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_coins.user_id));
CREATE POLICY "Users can update their own coins" ON public.user_coins FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_coins.user_id));

-- Store items are viewable by everyone
CREATE POLICY "Store items are viewable by everyone" ON public.store_items FOR SELECT USING (true);

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases" ON public.user_purchases FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_purchases.user_id));
CREATE POLICY "Users can create their own purchases" ON public.user_purchases FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_purchases.user_id));

-- Leaderboard is viewable by everyone
CREATE POLICY "Leaderboard is viewable by everyone" ON public.user_leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can update their own leaderboard" ON public.user_leaderboard FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_leaderboard.user_id));
CREATE POLICY "Users can modify their own leaderboard" ON public.user_leaderboard FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = user_leaderboard.user_id));

-- Group challenges are viewable by everyone
CREATE POLICY "Group challenges are viewable by everyone" ON public.group_challenges FOR SELECT USING (true);
CREATE POLICY "Users can create group challenges" ON public.group_challenges FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = group_challenges.creator_id));

-- Group challenge participants
CREATE POLICY "Users can view challenge participants" ON public.group_challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.group_challenge_participants FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = group_challenge_participants.user_id));
CREATE POLICY "Users can update their own participation" ON public.group_challenge_participants FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE user_id = group_challenge_participants.user_id));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_quests_updated_at BEFORE UPDATE ON public.user_quests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quest_submissions_updated_at BEFORE UPDATE ON public.quest_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_coins_updated_at BEFORE UPDATE ON public.user_coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_items_updated_at BEFORE UPDATE ON public.store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_leaderboard_updated_at BEFORE UPDATE ON public.user_leaderboard FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample quests
INSERT INTO public.quests (title, description, category, reward_coins, bonus_coins, requirements, verification_rules) VALUES
('Try 3 Local Dishes Under ₹300', 'Discover authentic local cuisine while staying within budget', 'budget', 200, 50, '{"max_amount": 300, "min_items": 3, "currency": "INR"}', '{"check_receipt": true, "verify_amount": true, "max_total": 300}'),
('Visit 5 Hidden Monuments in 1 Day', 'Explore off-the-beaten-path historical sites', 'exploration', 250, 75, '{"min_locations": 5, "time_limit": "24h", "location_type": "monument"}', '{"check_gps": true, "min_locations": 5, "verify_photos": true}'),
('Use Only Public Transport for a Day', 'Navigate the city using buses, trains, and metro', 'transport', 150, 25, '{"transport_types": ["bus", "train", "metro"], "duration": "1 day"}', '{"verify_tickets": true, "check_transport_type": true}'),
('Attend a Local Festival', 'Immerse yourself in local culture and traditions', 'cultural', 300, 100, '{"event_type": "festival", "duration": "2h"}', '{"verify_location": true, "check_video": true, "min_duration": 120}'),
('Use Reusable Bottles During Trip', 'Help reduce plastic waste during your travels', 'social_impact', 100, 20, '{"duration": "full_trip", "proof_type": "photo"}', '{"verify_photos": true, "check_sustainability": true}');

-- Insert sample store items
INSERT INTO public.store_items (title, description, category, cost_coins, provider, metadata) VALUES
('₹500 Amazon Gift Card', 'Redeem for Amazon shopping', 'gift_card', 500, 'amazon', '{"value": 500, "currency": "INR"}'),
('₹1000 Zomato Gift Card', 'Use for food delivery and dining', 'gift_card', 1000, 'zomato', '{"value": 1000, "currency": "INR"}'),
('25% Hotel Booking Discount', 'Get discount on your next hotel stay', 'travel_discount', 300, 'hotel_partner', '{"discount_percent": 25, "max_discount": 2000}'),
('Museum Entry Pass', 'Free entry to partner museums', 'experience', 150, 'museum_partner', '{"validity_days": 30, "max_entries": 5}'),
('₹2000 Flight Discount', 'Save on your next flight booking', 'travel_discount', 2000, 'flight_partner', '{"discount_amount": 2000, "min_booking": 10000}');