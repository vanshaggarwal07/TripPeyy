import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plane, 
  MapPin, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Plus,
  Settings,
  User,
  LogOut,
  Globe,
  Camera,
  Navigation,
  Trophy,
  Gift,
  Users,
  Mic
} from 'lucide-react';
import { TripForm } from '@/components/TripForm';
import { ExpenseForm } from '@/components/ExpenseForm';
import { MapExplorer } from '@/components/MapExplorer';
import { ExperiencesViewer } from '@/components/ExperiencesViewer';
import { AnalyticsViewer } from '@/components/AnalyticsViewer';
import QuestHub from '@/components/QuestHub';
import RewardStore from '@/components/RewardStore';
import Leaderboard from '@/components/Leaderboard';
import { RecentExpenses } from '@/components/RecentExpenses';
import { CoinBalance } from '@/components/CoinBalance';
import { UserActivityViewer } from '@/components/UserActivityViewer';
import { ProfileModal } from '@/components/ProfileModal';
import { SettingsModal } from '@/components/SettingsModal';
import { VoiceExpenseInput } from '@/components/VoiceExpenseInput';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-travel.jpg';
import culturalImage from '@/assets/cultural-experience.jpg';
import budgetImage from '@/assets/budget-tracking.jpg';

interface Trip {
  id: string;
  title: string;
  destination: string;
  budget_limit: number;
  total_spent: number;
  status: string;
  start_date: string;
  end_date: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'create-trip' | 'expenses' | 'explore-map' | 'experiences' | 'analytics' | 'quests' | 'store' | 'leaderboard' | 'activity'>('overview');
  const [showTripForm, setShowTripForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchTrips();
    fetchRecentExpenses();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Recalculate total spent for each trip to ensure accuracy
      if (data) {
        const updatedTrips = await Promise.all(
          data.map(async (trip) => {
            const { data: expensesSum, error: sumError } = await supabase
              .from('expenses')
              .select('amount')
              .eq('trip_id', trip.id);

            if (!sumError && expensesSum) {
              const actualTotalSpent = expensesSum.reduce((sum, exp) => sum + Number(exp.amount), 0);
              
              // Update trip if total_spent doesn't match
              if (trip.total_spent !== actualTotalSpent) {
                await supabase
                  .from('trips')
                  .update({ total_spent: actualTotalSpent })
                  .eq('id', trip.id);
                
                return { ...trip, total_spent: actualTotalSpent };
              }
            }
            
            return trip;
          })
        );
        
        setTrips(updatedTrips);
      } else {
        setTrips([]);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  // Refresh function to be called when expenses change
  const refreshDashboardData = async () => {
    await fetchTrips();
    await fetchRecentExpenses();
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
    });
    window.location.href = '/';
  };

  const totalBudget = trips.reduce((sum, trip) => sum + (trip.budget_limit || 0), 0);
  const totalSpent = trips.reduce((sum, trip) => sum + (trip.total_spent || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Plane className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-lg font-medium">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Globe className="h-8 w-8 text-primary" />
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  TripPey
                </h1>
                <p className="text-sm text-muted-foreground">Cultural Travel Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowProfileModal(true)}>
                <User className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome back, {user.user_metadata?.full_name || 'Traveler'}!</h2>
            <p className="text-muted-foreground">Ready for your next cultural adventure?</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveView('overview')}>
              <Plus className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button variant="outline" onClick={() => setActiveView('quests')} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <Trophy className="mr-2 h-4 w-4 text-purple-500" />
              Quests
            </Button>
            <Button variant="outline" onClick={() => setActiveView('store')} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
              <Gift className="mr-2 h-4 w-4 text-yellow-500" />
              Store
            </Button>
            <Button variant="outline" onClick={() => setActiveView('leaderboard')}>
              <Users className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button variant="outline" onClick={() => setActiveView('activity')}>
              <Users className="mr-2 h-4 w-4" />
              Community
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {activeView === 'overview' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium opacity-90">Active Trips</CardTitle>
                    <Plane className="h-4 w-4 opacity-90" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trips.filter(t => t.status === 'active').length}</div>
                  <p className="text-xs opacity-90">
                    +{trips.filter(t => t.status === 'planning').length} planning
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary to-accent text-secondary-foreground border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
                  <p className="text-xs opacity-90">
                    ${totalSpent.toLocaleString()} spent
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cultural to-accent text-cultural-foreground border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{budgetUtilization.toFixed(0)}%</div>
                  <Progress value={budgetUtilization} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success to-accent text-success-foreground border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Destinations</CardTitle>
                    <Navigation className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Set(trips.map(t => t.destination)).size}</div>
                  <p className="text-xs opacity-90">
                    countries visited
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Action Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowTripForm(true)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Create Trip</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Plan</div>
                  <p className="text-xs text-muted-foreground">Start your journey</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('explore-map')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Explore Map</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Discover</div>
                  <p className="text-xs text-muted-foreground">Find new places</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('expenses')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">View Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Track</div>
                  <p className="text-xs text-muted-foreground">Monitor spending</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('analytics')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">View Analytics</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Analyze</div>
                  <p className="text-xs text-muted-foreground">Review patterns</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20" onClick={() => setActiveView('quests')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quest Hub</CardTitle>
                  <Trophy className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">Quests</div>
                  <p className="text-xs text-muted-foreground">Earn rewards</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Coin Balance */}
              <CoinBalance />
              
              {/* Recent Trips Summary */}
              <Card className="shadow-[var(--shadow-elevation)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Recent Trips
                  </CardTitle>
                  <CardDescription>Latest travel activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {trips.length > 0 ? (
                    <div className="space-y-3">
                      {trips.slice(0, 2).map((trip) => (
                        <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{trip.title}</h4>
                            <p className="text-xs text-muted-foreground">{trip.destination}</p>
                            <Badge variant={trip.status === 'active' ? 'default' : 'secondary'} className="mt-1 text-xs">
                              {trip.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">${trip.total_spent.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">spent</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No trips yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Expenses Summary */}
              <Card className="shadow-[var(--shadow-elevation)]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-secondary" />
                      Recent Expenses
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowVoiceInput(true)}>
                      <Mic className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>Latest spending activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {expenses.length > 0 ? (
                    <div className="space-y-3">
                      {expenses.slice(0, 2).map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                          <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">{expense.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">${expense.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No expenses yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowExpenseForm(true)}>
                        Add Expense
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="bg-gradient-to-br from-card to-muted border-0 shadow-[var(--shadow-warm)] hover:shadow-[var(--shadow-travel)] transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Discover Places</h3>
                      <p className="text-sm text-muted-foreground">Find cultural hotspots</p>
                    </div>
                  </div>
                  <img src={heroImage} alt="Travel destinations" className="w-full h-32 rounded-lg object-cover mb-3" />
                  <Button variant="ghost" className="w-full" onClick={() => setActiveView('explore-map')}>
                    Explore Map
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-muted border-0 shadow-[var(--shadow-warm)] hover:shadow-[var(--shadow-cultural)] transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-full bg-cultural/10 group-hover:bg-cultural/20 transition-colors">
                      <Camera className="h-6 w-6 text-cultural" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Cultural Experiences</h3>
                      <p className="text-sm text-muted-foreground">Immerse in local culture</p>
                    </div>
                  </div>
                  <img src={culturalImage} alt="Cultural experiences" className="w-full h-32 rounded-lg object-cover mb-3" />
                  <Button variant="ghost" className="w-full" onClick={() => setActiveView('experiences')}>
                    View Experiences
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-muted border-0 shadow-[var(--shadow-warm)] hover:shadow-[var(--shadow-travel)] transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                      <DollarSign className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Budget Analytics</h3>
                      <p className="text-sm text-muted-foreground">Smart expense insights</p>
                    </div>
                  </div>
                  <img src={budgetImage} alt="Budget tracking" className="w-full h-32 rounded-lg object-cover mb-3" />
                  <Button variant="ghost" className="w-full" onClick={() => setActiveView('analytics')}>
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Individual Views */}
        {activeView === 'explore-map' && (
          <MapExplorer 
            open={true}
            onOpenChange={() => setActiveView('overview')}
          />
        )}
        {activeView === 'experiences' && (
          <ExperiencesViewer 
            open={true}
            onOpenChange={() => setActiveView('overview')}
          />
        )}
        {activeView === 'expenses' && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Travel Expenses</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setShowVoiceInput(true)}>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button onClick={() => setShowExpenseForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentExpenses onExpenseChange={refreshDashboardData} />
              <AnalyticsViewer open={false} onOpenChange={() => {}} />
            </div>
          </div>
        )}
        {activeView === 'analytics' && (
          <AnalyticsViewer 
            open={true}
            onOpenChange={() => setActiveView('overview')}
          />
        )}
        {activeView === 'quests' && <QuestHub />}
        {activeView === 'store' && <RewardStore />}
        {activeView === 'leaderboard' && <Leaderboard />}
        {activeView === 'activity' && <UserActivityViewer />}

        {/* Forms */}
        <TripForm 
          open={showTripForm} 
          onOpenChange={setShowTripForm}
          onSuccess={() => {
            fetchTrips();
            setShowTripForm(false);
          }}
        />
        
        <ExpenseForm 
          open={showExpenseForm} 
          onOpenChange={setShowExpenseForm}
          onSuccess={() => {
            refreshDashboardData();
            setShowExpenseForm(false);
          }}
        />

        <ProfileModal 
          open={showProfileModal} 
          onOpenChange={setShowProfileModal}
        />

        <SettingsModal 
          open={showSettingsModal} 
          onOpenChange={setShowSettingsModal}
        />

        <VoiceExpenseInput 
          open={showVoiceInput} 
          onOpenChange={setShowVoiceInput}
          onSuccess={() => {
            refreshDashboardData();
            setShowVoiceInput(false);
          }}
        />
      </div>
    </div>
  );
}