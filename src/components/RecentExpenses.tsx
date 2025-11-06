import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, MapPin, Receipt, Trash2, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExpenseForm } from '@/components/ExpenseForm';
import { VoiceExpenseInput } from '@/components/VoiceExpenseInput';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  location: string;
  currency: string;
  expense_date: string;
  trip_id: string;
  trips: {
    title: string;
    destination: string;
  };
}

interface RecentExpensesProps {
  onExpenseChange?: () => void;
}

export function RecentExpenses({ onExpenseChange }: RecentExpensesProps = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          trips (
            title,
            destination
          )
        `)
        .order('expense_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const expenseToDelete = expenses.find(exp => exp.id === expenseId);
      if (!expenseToDelete) return;

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      
      // Update trip total spent after deletion using trip_id
      await updateTripTotalSpent(expenseToDelete.trip_id);
      
      setExpenses(expenses.filter(exp => exp.id !== expenseId));
      
      // Refresh dashboard data if callback provided
      if (onExpenseChange) {
        onExpenseChange();
      }
      
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const updateTripTotalSpent = async (tripId: string) => {
    try {
      const { data: expensesSum, error: sumError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('trip_id', tripId);

      if (!sumError && expensesSum) {
        const totalSpent = expensesSum.reduce((sum, exp) => sum + exp.amount, 0);
        await supabase
          .from('trips')
          .update({ total_spent: totalSpent })
          .eq('id', tripId);
      }
    } catch (error) {
      console.error('Error updating trip total spent:', error);
    }
  };

  const handleExpenseSuccess = () => {
    fetchExpenses();
    if (onExpenseChange) {
      onExpenseChange();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Accommodation': 'bg-blue-100 text-blue-800',
      'Transportation': 'bg-green-100 text-green-800',
      'Food & Dining': 'bg-orange-100 text-orange-800',
      'Cultural Activities': 'bg-purple-100 text-purple-800',
      'Shopping': 'bg-pink-100 text-pink-800',
      'Entertainment': 'bg-yellow-100 text-yellow-800',
      'Tours & Guides': 'bg-indigo-100 text-indigo-800',
      'Local Experiences': 'bg-teal-100 text-teal-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.Other;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowVoiceInput(true)} size="sm" variant="outline" className="gap-2">
                <Mic className="h-4 w-4" />
                Voice Input
              </Button>
              <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No expenses recorded</p>
              <p className="text-sm mb-4">Start tracking your travel expenses</p>
              <Button onClick={() => setShowForm(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{expense.description}</h4>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {expense.trips.title} - {expense.trips.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                          </span>
                          {expense.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {expense.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(expense.category)} variant="secondary">
                        {expense.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(expense.amount, expense.currency)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExpense(expense.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleExpenseSuccess}
      />

      <VoiceExpenseInput
        open={showVoiceInput}
        onOpenChange={setShowVoiceInput}
        onSuccess={handleExpenseSuccess}
      />
    </>
  );
}