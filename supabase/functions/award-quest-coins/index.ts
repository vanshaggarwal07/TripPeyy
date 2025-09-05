import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, questId, coins, bonusCoins = 0 } = await req.json();

    console.log('Awarding coins:', { userId, questId, coins, bonusCoins });

    // Start transaction
    const totalCoins = coins + bonusCoins;

    // Insert reward record
    const { error: rewardError } = await supabase
      .from('user_rewards')
      .insert({
        user_id: userId,
        quest_id: questId,
        reward_type: 'coins',
        coins_earned: coins,
        bonus_coins: bonusCoins,
        description: `Quest completed: ${totalCoins} TrippEy Coins earned!`
      });

    if (rewardError) {
      throw rewardError;
    }

    // Update user coins balance
    const { data: currentCoins } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (currentCoins) {
      // Update existing record
      const { error: coinsError } = await supabase
        .from('user_coins')
        .update({
          total_coins: currentCoins.total_coins + totalCoins,
          available_coins: currentCoins.available_coins + totalCoins,
          lifetime_earned: currentCoins.lifetime_earned + totalCoins,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (coinsError) {
        throw coinsError;
      }
    } else {
      // Create new record
      const { error: coinsError } = await supabase
        .from('user_coins')
        .insert({
          user_id: userId,
          total_coins: totalCoins,
          available_coins: totalCoins,
          lifetime_earned: totalCoins
        });

      if (coinsError) {
        throw coinsError;
      }
    }

    // Update leaderboard
    const { data: leaderboard } = await supabase
      .from('user_leaderboard')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (leaderboard) {
      const { error: leaderboardError } = await supabase
        .from('user_leaderboard')
        .update({
          total_quests_completed: leaderboard.total_quests_completed + 1,
          total_coins_earned: leaderboard.total_coins_earned + totalCoins,
          current_streak: leaderboard.current_streak + 1,
          longest_streak: Math.max(leaderboard.longest_streak, leaderboard.current_streak + 1),
          last_quest_completed: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (leaderboardError) {
        throw leaderboardError;
      }
    } else {
      const { error: leaderboardError } = await supabase
        .from('user_leaderboard')
        .insert({
          user_id: userId,
          total_quests_completed: 1,
          total_coins_earned: totalCoins,
          current_streak: 1,
          longest_streak: 1,
          last_quest_completed: new Date().toISOString()
        });

      if (leaderboardError) {
        throw leaderboardError;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      totalCoinsAwarded: totalCoins 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Award coins error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});