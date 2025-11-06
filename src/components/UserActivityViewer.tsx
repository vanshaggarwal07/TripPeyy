import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Trophy, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserActivity {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  active_quests: number;
  completed_quests: number;
  current_quest_title?: string;
  last_activity?: string;
}

export function UserActivityViewer() {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserActivities();
  }, []);

  const fetchUserActivities = async () => {
    try {
      setLoading(true);
      
      // Get all users with their profile info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');

      if (profilesError) throw profilesError;

      // Get quest activities for all users
      const userActivities: UserActivity[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get active quests count
          const { count: activeCount } = await supabase
            .from('user_quests')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .eq('status', 'active');

          // Get completed quests count
          const { count: completedCount } = await supabase
            .from('user_quests')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .eq('status', 'completed');

          // Get current active quest with title
          const { data: currentQuest } = await supabase
            .from('user_quests')
            .select(`
              *,
              quests (
                title
              )
            `)
            .eq('user_id', profile.user_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

          // Get last activity time
          const { data: lastActivity } = await supabase
            .from('user_quests')
            .select('updated_at')
            .eq('user_id', profile.user_id)
            .order('updated_at', { ascending: false })
            .limit(1);

          return {
            user_id: profile.user_id,
            full_name: profile.full_name || 'Anonymous User',
            avatar_url: profile.avatar_url,
            active_quests: activeCount || 0,
            completed_quests: completedCount || 0,
            current_quest_title: currentQuest?.[0]?.quests?.title,
            last_activity: lastActivity?.[0]?.updated_at
          };
        })
      );

      setUsers(userActivities);
    } catch (error) {
      console.error('Error fetching user activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'No activity';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold">Community Activity</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold">Community Activity</h3>
          <Badge variant="secondary" className="ml-2">
            {users.length} Active Users
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.user_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{user.full_name}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatLastActivity(user.last_activity)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Active Quests</span>
                </div>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                  {user.active_quests}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700">
                  {user.completed_quests}
                </Badge>
              </div>

              {user.current_quest_title && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Current Quest:</p>
                  <p className="text-sm font-medium truncate" title={user.current_quest_title}>
                    {user.current_quest_title}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Users Found</h3>
            <p className="text-muted-foreground">
              No users have joined the platform yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}