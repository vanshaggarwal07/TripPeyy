-- Recalculate and update user coin balances based on actual completed quests
DO $$
DECLARE
    user_record RECORD;
    total_coins_earned INTEGER;
BEGIN
    -- For each user, recalculate their coins from completed quests
    FOR user_record IN SELECT DISTINCT user_id FROM user_quests WHERE status = 'completed'
    LOOP
        -- Calculate total coins from completed quests
        SELECT COALESCE(SUM(q.reward_coins + COALESCE(q.bonus_coins, 0)), 0)
        INTO total_coins_earned
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.id
        WHERE uq.user_id = user_record.user_id 
        AND uq.status = 'completed';
        
        -- Update user_coins table with correct values
        INSERT INTO user_coins (user_id, total_coins, available_coins, lifetime_earned, updated_at)
        VALUES (user_record.user_id, total_coins_earned, total_coins_earned, total_coins_earned, now())
        ON CONFLICT (user_id) DO UPDATE SET
            total_coins = total_coins_earned,
            available_coins = total_coins_earned,
            lifetime_earned = total_coins_earned,
            updated_at = now();
            
        RAISE NOTICE 'Updated coins for user %: % coins', user_record.user_id, total_coins_earned;
    END LOOP;
END $$;