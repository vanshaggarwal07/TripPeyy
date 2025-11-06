import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
}

export function ExpenseForm({ open, onOpenChange, onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    location: '',
    currency: 'USD',
    trip_id: '',
    expense_date: new Date(),
  });

  const categories = [
    'Accommodation',
    'Transportation',
    'Food & Dining',
    'Cultural Activities',
    'Shopping',
    'Entertainment',
    'Tours & Guides',
    'Local Experiences',
    'Other'
  ];

  useEffect(() => {
    if (open) {
      fetchTrips();
    }
  }, [open]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category || !formData.trip_id) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert([
        {
          user_id: user!.id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          location: formData.location,
          currency: formData.currency,
          trip_id: formData.trip_id,
          expense_date: formData.expense_date.toISOString().split('T')[0],
        },
      ]);

      if (error) throw error;

      // Update trip total spent
      await updateTripTotalSpent(formData.trip_id);

      toast({
        title: 'Expense Added!',
        description: 'Your expense has been successfully recorded.',
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        description: '',
        amount: '',
        category: '',
        location: '',
        currency: 'USD',
        trip_id: '',
        expense_date: new Date(),
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to add expense. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record a new expense for your trip
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip">Trip *</Label>
            <Select value={formData.trip_id} onValueChange={(value) => setFormData({ ...formData, trip_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a trip" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.title} - {trip.destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Sushi dinner"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Tokyo, Japan"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.expense_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expense_date ? format(formData.expense_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expense_date}
                    onSelect={(date) => setFormData({ ...formData, expense_date: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}