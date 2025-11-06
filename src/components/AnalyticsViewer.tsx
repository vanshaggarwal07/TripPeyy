import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, PieChart, BarChart3, Calendar, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  location: string;
  trip_id: string;
  trips?: {
    title: string;
    destination: string;
  };
}

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

interface AnalyticsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyticsViewer({ open, onOpenChange }: AnalyticsViewerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [expensesRes, tripsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            trips:trip_id (
              title,
              destination
            )
          `)
          .order('expense_date', { ascending: false }),
        supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (tripsRes.error) throw tripsRes.error;

      setExpenses(expensesRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    }
  };

  const filteredExpenses = selectedTripId === 'all' 
    ? expenses 
    : expenses.filter(e => e.trip_id === selectedTripId);

  const filteredTrips = selectedTripId === 'all' 
    ? trips 
    : trips.filter(t => t.id === selectedTripId);

  // Calculate analytics
  const totalBudget = filteredTrips.reduce((sum, trip) => sum + (trip.budget_limit || 0), 0);
  const totalSpent = filteredTrips.reduce((sum, trip) => sum + (trip.total_spent || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Category breakdown
  const categorySpending = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Monthly spending
  const monthlySpending = filteredExpenses.reduce((acc, expense) => {
    const month = new Date(expense.expense_date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    acc[month] = (acc[month] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedMonths = Object.entries(monthlySpending)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-6);

  // Trip performance
  const tripPerformance = filteredTrips.map(trip => ({
    ...trip,
    utilizationPercent: trip.budget_limit > 0 ? (trip.total_spent / trip.budget_limit) * 100 : 0,
    remainingBudget: trip.budget_limit - trip.total_spent
  }));

  const averageDailySpend = filteredExpenses.length > 0 
    ? totalSpent / Math.max(1, filteredExpenses.length)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Budget Analytics & Insights
            </DialogTitle>
            <div className="w-48">
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Budget</p>
                    <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary to-accent text-secondary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Spent</p>
                    <p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cultural to-accent text-cultural-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Budget Used</p>
                    <p className="text-2xl font-bold">{budgetUtilization.toFixed(0)}%</p>
                  </div>
                  <PieChart className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success to-accent text-success-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Avg Daily</p>
                    <p className="text-2xl font-bold">${averageDailySpend.toFixed(0)}</p>
                  </div>
                  <Calendar className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedCategories.map(([category, amount]) => {
                    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <span className="font-medium">${amount.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                  {sortedCategories.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No spending data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedMonths.map(([month, amount]) => {
                    const maxAmount = Math.max(...sortedMonths.map(([, amt]) => amt));
                    const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                    return (
                      <div key={month} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{month}</span>
                          <span className="font-medium">${amount.toLocaleString()}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                  {sortedMonths.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No monthly data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trip Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Trip Budget Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tripPerformance.map((trip) => (
                  <div key={trip.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{trip.title}</h4>
                        <p className="text-sm text-muted-foreground">{trip.destination}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Budget Utilization</span>
                        <span className="font-medium">
                          ${trip.total_spent.toLocaleString()} / ${trip.budget_limit.toLocaleString()} 
                          ({trip.utilizationPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(trip.utilizationPercent, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Remaining: ${trip.remainingBudget.toLocaleString()}</span>
                        <span>
                          {trip.start_date && trip.end_date && 
                            `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {tripPerformance.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No trips available for analysis</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredExpenses.slice(0, 10).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.description}</span>
                        <Badge variant="outline" className="text-xs">
                          {expense.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(expense.expense_date).toLocaleDateString()}
                        {expense.location && (
                          <>
                            <MapPin className="h-3 w-3 ml-2" />
                            {expense.location}
                          </>
                        )}
                      </div>
                      {expense.trips && (
                        <p className="text-xs text-muted-foreground">
                          {expense.trips.title} - {expense.trips.destination}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${expense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {filteredExpenses.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No expenses found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}