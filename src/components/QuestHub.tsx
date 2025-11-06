import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Coins, Star, Users, Upload, CheckCircle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import QuestSubmission from "./QuestSubmission";

interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_coins: number;
  bonus_coins: number;
  requirements: any;
  verification_rules: any;
  difficulty_level: number;
}

interface UserQuest {
  id: string;
  quest_id: string;
  status: string;
  progress: any;
  user_id: string;
  quests: Quest;
}

interface UserCoins {
  total_coins: number;
  available_coins: number;
  lifetime_earned: number;
}

const QuestHub: React.FC = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showSubmission, setShowSubmission] = useState(false);

  const categoryColors = {
    budget: 'bg-green-500',
    exploration: 'bg-blue-500',
    transport: 'bg-purple-500',
    cultural: 'bg-orange-500',
    social_impact: 'bg-emerald-500'
  };

  const categoryIcons = {
    budget: '💸',
    exploration: '🏛️',
    transport: '🚌',
    cultural: '🎭',
    social_impact: '🌱'
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load available quests
      const { data: questsData, error: questsError } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (questsError) throw questsError;

      // Load user's active quests
      const { data: userQuestsData, error: userQuestsError } = await supabase
        .from('user_quests')
        .select(`
          *,
          quests (*)
        `)
        .eq('user_id', user?.id);

      if (userQuestsError) throw userQuestsError;

      // Load user coins
      const { data: coinsData, error: coinsError } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (coinsError && coinsError.code !== 'PGRST116') {
        throw coinsError;
      }

      setQuests(questsData || []);
      setUserQuests(userQuestsData || []);
      setUserCoins(coinsData || { total_coins: 0, available_coins: 0, lifetime_earned: 0 });
    } catch (error) {
      console.error('Error loading quest data:', error);
      toast.error('Failed to load quest data');
    } finally {
      setLoading(false);
    }
  };

  const startQuest = async (quest: Quest) => {
    try {
      const { error } = await supabase
        .from('user_quests')
        .insert({
          user_id: user?.id,
          quest_id: quest.id,
          status: 'active'
        });

      if (error) throw error;

      toast.success(`Started quest: ${quest.title}`);
      loadData();
    } catch (error) {
      console.error('Error starting quest:', error);
      toast.error('Failed to start quest');
    }
  };

  const isQuestStarted = (questId: string) => {
    return userQuests.some(uq => uq.quest_id === questId);
  };

  const getQuestStatus = (questId: string) => {
    const userQuest = userQuests.find(uq => uq.quest_id === questId);
    return userQuest?.status || 'not_started';
  };

  const handleSubmitProof = (quest: Quest) => {
    setSelectedQuest(quest);
    setShowSubmission(true);
  };

  const availableQuests = quests.filter(q => !isQuestStarted(q.id));
  const activeQuests = userQuests.filter(uq => uq.status === 'active');
  const completedQuests = userQuests.filter(uq => uq.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading quests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Coins */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quest Hub</h1>
          <p className="text-muted-foreground">Complete cultural quests and earn TrippEy Coins!</p>
        </div>
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-xl font-bold text-yellow-600">{userCoins?.available_coins || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available ({availableQuests.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeQuests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedQuests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-4">
            {availableQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                status="available"
                onStartQuest={startQuest}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {activeQuests.map((userQuest) => (
              <QuestCard
                key={userQuest.id}
                quest={userQuest.quests}
                status="active"
                onSubmitProof={handleSubmitProof}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {completedQuests.map((userQuest) => (
              <QuestCard
                key={userQuest.id}
                quest={userQuest.quests}
                status="completed"
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quest Submission Modal */}
      {showSubmission && selectedQuest && (
        <QuestSubmission
          quest={selectedQuest}
          userQuest={userQuests.find(uq => uq.quest_id === selectedQuest.id)!}
          onClose={() => setShowSubmission(false)}
          onSuccess={() => {
            setShowSubmission(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

interface QuestCardProps {
  quest: Quest;
  status: 'available' | 'active' | 'completed';
  onStartQuest?: (quest: Quest) => void;
  onSubmitProof?: (quest: Quest) => void;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
}

const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  status,
  onStartQuest,
  onSubmitProof,
  categoryColors,
  categoryIcons
}) => {
  const getDifficultyStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/20 bg-green-500/5';
      default:
        return '';
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{categoryIcons[quest.category]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{quest.title}</CardTitle>
                {getStatusIcon()}
              </div>
              <CardDescription>{quest.description}</CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className={`${categoryColors[quest.category]} text-white`}>
                  {quest.category.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1">
                  {getDifficultyStars(quest.difficulty_level)}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-600 font-semibold">
              <Coins className="h-4 w-4" />
              {quest.reward_coins}
              {quest.bonus_coins > 0 && (
                <span className="text-sm text-green-600">+{quest.bonus_coins}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Quest Requirements */}
          <div className="text-sm text-muted-foreground">
            <strong>Requirements:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {Object.entries(quest.requirements).map(([key, value]) => (
                <li key={key}>
                  {key.replace('_', ' ')}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {status === 'available' && (
              <Button onClick={() => onStartQuest?.(quest)} className="flex-1">
                Start Quest
              </Button>
            )}
            {status === 'active' && (
              <Button onClick={() => onSubmitProof?.(quest)} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Submit Proof
              </Button>
            )}
            {status === 'completed' && (
              <div className="flex-1 flex items-center justify-center text-green-600 font-medium">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestHub;