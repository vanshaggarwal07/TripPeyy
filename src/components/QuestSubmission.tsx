import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera, Receipt, Ticket, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  requirements: any;
  verification_rules: any;
  reward_coins: number;
  bonus_coins: number;
}

interface UserQuest {
  id: string;
  quest_id: string;
  status: string;
  user_id: string;
}

interface QuestSubmissionProps {
  quest: Quest;
  userQuest: UserQuest;
  onClose: () => void;
  onSuccess: () => void;
}

const QuestSubmission: React.FC<QuestSubmissionProps> = ({
  quest,
  userQuest,
  onClose,
  onSuccess
}) => {
  const [submissionType, setSubmissionType] = useState<'receipt' | 'photo' | 'ticket' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadedImage, setShowUploadedImage] = useState<string | null>(null);

  const submissionTypes = [
    { value: 'receipt', label: 'Receipt', icon: Receipt, description: 'Upload bill or receipt' },
    { value: 'photo', label: 'Photo', icon: Camera, description: 'Upload location photo' },
    { value: 'ticket', label: 'Ticket', icon: Ticket, description: 'Upload transport ticket' },
    { value: 'video', label: 'Video', icon: Video, description: 'Upload video proof' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image or video file');
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userQuest.id}-${Date.now()}.${fileExt}`;
    const filePath = `quest-submissions/${fileName}`;

    const { data, error } = await supabase.storage
      .from('quest-submissions')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('quest-submissions')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const submitProof = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileUrl = await uploadFile(selectedFile);

      // Create submission record and mark as completed
      const { data: submission, error: submissionError } = await supabase
        .from('quest_submissions')
        .insert({
          user_quest_id: userQuest.id,
          submission_type: submissionType,
          file_url: fileUrl,
          status: 'verified',
          verification_results: { 
            status: 'verified',
            message: 'Quest completed successfully',
            uploaded_image: fileUrl
          }
        })
        .select()
        .single();

      if (submissionError) {
        throw submissionError;
      }

      // Mark user quest as completed
      const { error: updateError } = await supabase
        .from('user_quests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', userQuest.id);

      if (updateError) {
        throw updateError;
      }

      // Award coins using the database function
      const totalCoins = quest.reward_coins + (quest.bonus_coins || 0);
      const { error: coinsError } = await supabase.rpc('award_quest_coins', {
        p_user_id: userQuest.user_id,
        p_quest_id: quest.id,
        p_coins: quest.reward_coins,
        p_bonus_coins: quest.bonus_coins || 0
      });

      if (coinsError) {
        throw coinsError;
      }

      setUploading(false);
      toast.success(`🎉 Quest completed! You earned ${totalCoins} TrippEy Coins!`);
      onSuccess();

    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof. Please try again.');
      setUploading(false);
    }
  };

  const getRequirementsText = () => {
    const req = quest.requirements;
    const hints = [];

    if (req.max_amount) {
      hints.push(`Keep total under ₹${req.max_amount}`);
    }
    if (req.min_items) {
      hints.push(`Include at least ${req.min_items} items`);
    }
    if (req.min_locations) {
      hints.push(`Visit ${req.min_locations} different locations`);
    }
    if (req.transport_types) {
      hints.push(`Use transport: ${req.transport_types.join(', ')}`);
    }

    return hints.length > 0 ? hints.join(' • ') : 'Follow quest requirements';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Quest Proof</DialogTitle>
          <DialogDescription>
            Upload proof for: <strong>{quest.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requirements hint */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> {getRequirementsText()}
            </p>
          </div>

          {/* Submission type selection */}
          <div className="space-y-2">
            <Label>Proof Type</Label>
            <Select value={submissionType} onValueChange={(value: any) => setSubmissionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {submissionTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to upload file'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Max 10MB • Images or Videos
                </p>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={submitProof} 
              disabled={!selectedFile || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Complete Quest'}
            </Button>
          </div>

          {/* Show uploaded image preview */}
          {selectedFile && (
            <div className="mt-4">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ready to submit for quest completion
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestSubmission;