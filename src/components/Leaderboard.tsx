import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, Coins, Target, Flame, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  total_quests_completed: number;
  total_coins_earned: number;
  current_streak: number;
  longest_streak: number;
  rank_position: number;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface GroupChallenge {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  max_participants: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  quest_requirements: any;
  reward_distribution: any;
  participant_count: number;
  profiles: {
    full_name: string;
  };
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [groupChallenges, setGroupChallenges] = useState<GroupChallenge[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('user_leaderboard')
        .select(`
          *,
          profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .order('total_coins_earned', { ascending: false })
        .limit(50);

      if (leaderboardError) throw leaderboardError;

      // Update rank positions
      const rankedData = (leaderboardData || []).map((entry, index) => ({
        ...entry,
        rank_position: index + 1
      }));

      setLeaderboard(rankedData);

      // Find current user's rank
      if (user) {
        const userEntry = rankedData.find(entry => entry.user_id === user.id);
        setUserRank(userEntry || null);
      }

      // Load group challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('group_challenges')
        .select(`
          *,
          profiles!inner (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      // Get participant counts for each challenge
      const challengesWithCounts = await Promise.all(
        (challengesData || []).map(async (challenge) => {
          const { count } = await supabase
            .from('group_challenge_participants')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', challenge.id);

          return {
            ...challenge,
            participant_count: count || 0
          };
        })
      );

      setGroupChallenges(challengesWithCounts);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="h-6 w-6 flex items-center justify-center text-sm font-bold">#{position}</div>;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 2:
        return 'border-gray-400/20 bg-gray-400/5';
      case 3:
        return 'border-amber-600/20 bg-amber-600/5';
      default:
        return '';
    }
  };

  const joinGroupChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id
        });

      if (error) throw error;

      loadData(); // Refresh data
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">See how you stack up against other travelers!</p>
      </div>

      {/* User's current position */}
      {userRank && (
        <Card className={`${getRankColor(userRank.rank_position)} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {getRankIcon(userRank.rank_position)}
              <div className="flex-1">
                <h3 className="font-semibold">Your Rank</h3>
                <p className="text-sm text-muted-foreground">
                  {userRank.total_quests_completed} quests • {userRank.total_coins_earned} coins
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {userRank.current_streak}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-blue-500" />
                  {userRank.longest_streak}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="quests">Most Quests</TabsTrigger>
          <TabsTrigger value="challenges">Group Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4">
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <Card key={entry.user_id} className={`transition-all hover:shadow-md ${getRankColor(entry.rank_position)}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getRankIcon(entry.rank_position)}
                    <div className="flex-1">
                      <h3 className="font-semibold">{entry.profiles.full_name || 'Anonymous Traveler'}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{entry.total_quests_completed} quests</span>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {entry.total_coins_earned}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span>{entry.current_streak}</span>
                      </div>
                      <Badge variant="secondary">
                        Streak: {entry.longest_streak}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quests" className="space-y-4">
          <div className="space-y-2">
            {[...leaderboard]
              .sort((a, b) => b.total_quests_completed - a.total_quests_completed)
              .map((entry, index) => (
                <Card key={entry.user_id} className={`transition-all hover:shadow-md ${index < 3 ? getRankColor(index + 1) : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {getRankIcon(index + 1)}
                      <div className="flex-1">
                        <h3 className="font-semibold">{entry.profiles.full_name || 'Anonymous Traveler'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {entry.total_quests_completed} quests completed
                        </p>
                      </div>
                      <Badge variant="outline">
                        <Trophy className="h-3 w-3 mr-1" />
                        {entry.total_quests_completed}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          <div className="space-y-4">
            {groupChallenges.map((challenge) => (
              <Card key={challenge.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created by {challenge.profiles.full_name}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {challenge.participant_count}/{challenge.max_participants}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Duration:</strong> {new Date(challenge.starts_at).toLocaleDateString()} - {new Date(challenge.ends_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <strong>Rewards:</strong> {Object.entries(challenge.reward_distribution).map(([key, value]) => (
                          <span key={key} className="ml-1">{key}: {String(value)}</span>
                        ))}
                      </div>
                      {challenge.participant_count < challenge.max_participants && (
                        <button
                          onClick={() => joinGroupChallenge(challenge.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                        >
                          Join Challenge
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;