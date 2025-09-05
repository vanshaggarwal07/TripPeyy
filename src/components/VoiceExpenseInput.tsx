import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Check, X, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Trip {
  id: string;
  title: string;
  destination: string;
}

interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
  rawText: string;
}

interface VoiceExpenseInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function VoiceExpenseInput({ open, onOpenChange, onSuccess }: VoiceExpenseInputProps) {
  const [step, setStep] = useState<'trip-selection' | 'voice-input' | 'confirmation'>('trip-selection');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();

  const categoryMap = {
    'food': 'Food & Dining',
    'dinner': 'Food & Dining',
    'lunch': 'Food & Dining',
    'breakfast': 'Food & Dining',
    'restaurant': 'Food & Dining',
    'eating': 'Food & Dining',
    'meal': 'Food & Dining',
    'transport': 'Transportation',
    'taxi': 'Transportation',
    'bus': 'Transportation',
    'train': 'Transportation',
    'flight': 'Transportation',
    'uber': 'Transportation',
    'travel': 'Transportation',
    'hotel': 'Accommodation',
    'accommodation': 'Accommodation',
    'stay': 'Accommodation',
    'room': 'Accommodation',
    'shopping': 'Shopping',
    'buy': 'Shopping',
    'purchase': 'Shopping',
    'tickets': 'Entertainment',
    'entertainment': 'Entertainment',
    'tour': 'Tours & Guides',
    'guide': 'Tours & Guides',
    'activity': 'Cultural Activities',
    'experience': 'Local Experiences'
  };

  useEffect(() => {
    if (open && user) {
      fetchTrips();
      setStep('trip-selection');
      setSelectedTrip(null);
      setTranscript('');
      setParsedExpense(null);
    }
  }, [open, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Checking speech recognition support...');
      console.log('webkitSpeechRecognition:', 'webkitSpeechRecognition' in window);
      console.log('SpeechRecognition:', 'SpeechRecognition' in window);
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = (event: any) => {
            console.log('Speech recognition result:', event);
            const result = event.results[0][0].transcript;
            console.log('Transcript:', result);
            setTranscript(result);
            parseExpenseFromText(result);
          };

          recognitionRef.current.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
          };

          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            
            let errorMessage = 'Speech recognition failed. Please try again.';
            switch (event.error) {
              case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                break;
              case 'no-speech':
                errorMessage = 'No speech detected. Please speak clearly and try again.';
                break;
              case 'audio-capture':
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
                break;
              case 'network':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
              case 'service-not-allowed':
                errorMessage = 'Speech recognition service not available.';
                break;
            }
            toast.error(errorMessage);
          };

          recognitionRef.current.onstart = () => {
            console.log('Speech recognition started');
          };

          console.log('Speech recognition initialized successfully');
        } catch (error) {
          console.error('Error initializing speech recognition:', error);
          toast.error('Failed to initialize speech recognition');
        }
      } else {
        console.log('Speech recognition not supported');
        toast.error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    }
  };

  const parseExpenseFromText = (text: string) => {
    setIsProcessing(true);
    
    // Extract amount using regex
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    // Extract category
    const lowerText = text.toLowerCase();
    let category = 'Other';
    
    for (const [keyword, cat] of Object.entries(categoryMap)) {
      if (lowerText.includes(keyword)) {
        category = cat;
        break;
      }
    }

    // Generate description
    let description = text;
    if (amountMatch) {
      description = text.replace(amountMatch[0], '').trim();
      description = description.replace(/^(add|for|spent on|paid for)\s*/i, '').trim();
    }
    
    if (!description) {
      description = category === 'Other' ? 'Voice expense' : category;
    }

    const parsed: ParsedExpense = {
      amount,
      category,
      description: description.charAt(0).toUpperCase() + description.slice(1),
      rawText: text
    };

    setParsedExpense(parsed);
    setStep('confirmation');
    setIsProcessing(false);
  };

  const startListening = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available in this browser');
      return;
    }

    if (isListening) return;

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
      console.log('Starting speech recognition...');
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      toast.error('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const createExpense = async () => {
    if (!selectedTrip || !parsedExpense || !user) return;

    try {
      setIsProcessing(true);
      
      // Create the expense record
      const { error: expenseError } = await supabase.from('expenses').insert([
        {
          user_id: user!.id,
          description: parsedExpense.description,
          amount: parsedExpense.amount,
          category: parsedExpense.category,
          location: '',
          currency: 'USD',
          trip_id: selectedTrip.id,
          expense_date: new Date().toISOString().split('T')[0],
        },
      ]);

      if (expenseError) throw expenseError;

      // Update trip total spent
      await updateTripTotalSpent(selectedTrip.id);

      toast.success(`Added ₹${parsedExpense.amount} under ${parsedExpense.category} in ${selectedTrip.title}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setIsProcessing(false);
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

  if (!user) return null;

  const renderTripSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Volume2 className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Which trip do you want to add an expense to?</h3>
        <p className="text-sm text-muted-foreground">Select a trip to continue with voice input</p>
      </div>
      
      {trips.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trips found. Please create a trip first.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {trips.map((trip) => (
            <Card
              key={trip.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setSelectedTrip(trip);
                setStep('voice-input');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{trip.title}</h4>
                    <p className="text-sm text-muted-foreground">{trip.destination}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderVoiceInput = () => {
    const isSpeechSupported = typeof window !== 'undefined' && 
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    return (
      <div className="space-y-6 text-center">
        <div className="mb-6">
          <Badge variant="outline" className="mb-4">
            {selectedTrip?.title} - {selectedTrip?.destination}
          </Badge>
          <h3 className="text-lg font-semibold mb-2">Voice Command Input</h3>
          <p className="text-sm text-muted-foreground">
            Say something like "Add 100 for dinner" or "200 for taxi"
          </p>
        </div>

        {!isSpeechSupported ? (
          <div className="text-center py-8">
            <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              Speech recognition is not supported in this browser.
              <br />
              Please use Chrome, Edge, or Safari for voice input.
            </p>
            <Button variant="outline" onClick={() => setStep('trip-selection')}>
              Back to Trip Selection
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-4">
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className="h-16 w-16 rounded-full"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
              >
                {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              
              <div className="text-sm">
                {isListening ? (
                  <div className="flex items-center gap-2 text-primary">
                    <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
                    Listening...
                  </div>
                ) : transcript ? (
                  <div className="text-muted-foreground">
                    Heard: "{transcript}"
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Tap the microphone to start
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="text-sm text-muted-foreground">
                  Processing your request...
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setStep('trip-selection')}>
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-semibold mb-2">Confirm Expense</h3>
      </div>

      {parsedExpense && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-bold text-lg">₹{parsedExpense.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Badge variant="secondary">{parsedExpense.category}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Description:</span>
              <span className="text-sm">{parsedExpense.description}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Trip:</span>
              <span className="text-sm">{selectedTrip?.title}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Voice input: "{parsedExpense.rawText}"
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => setStep('voice-input')}
        >
          <X className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button 
          className="flex-1"
          onClick={createExpense}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-2" />
          {isProcessing ? 'Adding...' : 'Confirm'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Expense Input
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'trip-selection' && renderTripSelection()}
          {step === 'voice-input' && renderVoiceInput()}
          {step === 'confirmation' && renderConfirmation()}
        </div>
      </DialogContent>
    </Dialog>
  );
}