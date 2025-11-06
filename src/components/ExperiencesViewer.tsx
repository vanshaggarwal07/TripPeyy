import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Star, DollarSign, Plus, Edit2, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface CulturalExperience {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  cost: number;
  rating: number;
  completed: boolean;
  notes: string;
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
}

interface ExperiencesViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperiencesViewer({ open, onOpenChange }: ExperiencesViewerProps) {
  const [experiences, setExperiences] = useState<CulturalExperience[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CulturalExperience>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExperience, setNewExperience] = useState<Partial<CulturalExperience>>({
    category: 'museums',
    rating: 5,
    cost: 0,
    completed: false
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchExperiences();
      fetchTrips();
    }
  }, [open]);

  const fetchExperiences = async () => {
    try {
      const { data, error } = await supabase
        .from('cultural_experiences')
        .select(`
          *,
          trips:trip_id (
            title,
            destination
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExperiences(data || []);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load experiences',
        variant: 'destructive',
      });
    }
  };

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

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cultural_experiences')
        .update(editForm)
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchExperiences();
      toast({
        title: 'Success',
        description: 'Experience updated successfully',
      });
    } catch (error) {
      console.error('Error updating experience:', error);
      toast({
        title: 'Error',
        description: 'Failed to update experience',
        variant: 'destructive',
      });
    }
  };

  const handleAddExperience = async () => {
    if (!newExperience.title || !newExperience.trip_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const experienceToInsert = {
        title: newExperience.title!,
        trip_id: newExperience.trip_id!,
        location: newExperience.location || '',
        category: newExperience.category || 'museums',
        description: newExperience.description || '',
        cost: newExperience.cost || 0,
        rating: newExperience.rating || 5,
        completed: newExperience.completed || false,
        notes: newExperience.notes || ''
      };

      const { error } = await supabase
        .from('cultural_experiences')
        .insert([experienceToInsert]);

      if (error) throw error;

      setShowAddForm(false);
      setNewExperience({
        category: 'museums',
        rating: 5,
        cost: 0,
        completed: false
      });
      fetchExperiences();
      toast({
        title: 'Success',
        description: 'Experience added successfully',
      });
    } catch (error) {
      console.error('Error adding experience:', error);
      toast({
        title: 'Error',
        description: 'Failed to add experience',
        variant: 'destructive',
      });
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-cultural" />
              Cultural Experiences
            </DialogTitle>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Experience
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto space-y-4">
          {showAddForm && (
            <Card className="border-dashed border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Add New Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={newExperience.title || ''}
                      onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                      placeholder="Experience title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trip *</label>
                    <Select
                      value={newExperience.trip_id || ''}
                      onValueChange={(value) => setNewExperience({ ...newExperience, trip_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trip" />
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
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newExperience.category || 'museums'}
                      onValueChange={(value) => setNewExperience({ ...newExperience, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="museums">Museums</SelectItem>
                        <SelectItem value="festivals">Festivals</SelectItem>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="historical">Historical Sites</SelectItem>
                        <SelectItem value="cultural_activities">Cultural Activities</SelectItem>
                        <SelectItem value="local_tours">Local Tours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cost ($)</label>
                    <Input
                      type="number"
                      value={newExperience.cost || 0}
                      onChange={(e) => setNewExperience({ ...newExperience, cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rating</label>
                    <Select
                      value={newExperience.rating?.toString() || '5'}
                      onValueChange={(value) => setNewExperience({ ...newExperience, rating: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            {rating} Star{rating > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={newExperience.location || ''}
                    onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
                    placeholder="Experience location"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newExperience.description || ''}
                    onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                    placeholder="Describe your experience"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddExperience}>
                    <Save className="h-4 w-4 mr-1" />
                    Add Experience
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {experiences.length > 0 ? (
            experiences.map((experience) => (
              <Card key={experience.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {editingId === experience.id ? (
                          <Input
                            value={editForm.title || experience.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="font-semibold"
                          />
                        ) : (
                          <>
                            {experience.title}
                            {experience.completed && (
                              <Badge variant="default" className="ml-2">Completed</Badge>
                            )}
                          </>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {experience.trips?.title} - {experience.trips?.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === experience.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSaveEdit(experience.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingId(experience.id);
                            setEditForm(experience);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{experience.category}</Badge>
                      <div className="flex items-center gap-1">
                        {getRatingStars(experience.rating)}
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${experience.cost}
                      </span>
                    </div>
                    
                    {experience.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {experience.location}
                      </p>
                    )}
                    
                    {editingId === experience.id ? (
                      <Textarea
                        value={editForm.description || experience.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Experience description"
                      />
                    ) : (
                      experience.description && (
                        <p className="text-sm">{experience.description}</p>
                      )
                    )}
                    
                    {editingId === experience.id ? (
                      <Textarea
                        value={editForm.notes || experience.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Personal notes"
                      />
                    ) : (
                      experience.notes && (
                        <div className="mt-2 p-2 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Notes:</p>
                          <p className="text-sm">{experience.notes}</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cultural experiences yet. Add your first experience!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}