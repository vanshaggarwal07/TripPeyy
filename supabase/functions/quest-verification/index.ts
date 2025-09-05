import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface VerificationRequest {
  submissionId: string;
  fileUrl: string;
  submissionType: string;
  questRequirements: any;
  verificationRules: any;
}

// Extract text from image using OpenAI
async function extractTextFromImage(imageUrl: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Format as JSON with extracted text in a "text" field.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 1000
    }),
  });

  const data = await response.json();
  console.log('OpenAI response:', data);
  
  if (data.choices && data.choices[0]?.message?.content) {
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      return parsed.text || data.choices[0].message.content;
    } catch {
      return data.choices[0].message.content;
    }
  }
  
  return '';
}

// Verify location from image
async function verifyLocation(imageUrl: string, expectedLocation?: string): Promise<{ isValid: boolean; location?: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: expectedLocation 
                ? `Analyze this image and determine if it shows ${expectedLocation}. Return JSON with "isValid" (boolean) and "detectedLocation" (string).`
                : 'Analyze this image and identify the location shown. Return JSON with "location" (string describing the place).'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 300
    }),
  });

  const data = await response.json();
  console.log('Location verification response:', data);
  
  if (data.choices && data.choices[0]?.message?.content) {
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      return {
        isValid: parsed.isValid ?? true,
        location: parsed.detectedLocation || parsed.location
      };
    } catch {
      return { isValid: true, location: 'Unable to determine location' };
    }
  }
  
  return { isValid: true, location: 'Unable to verify location' };
}

// Verify receipt submission
async function verifyReceipt(extractedText: string, requirements: any): Promise<{ isValid: boolean; details: any }> {
  const totalRegex = /(?:total|amount|sum)[^\d]*(\d+(?:\.\d{2})?)/i;
  const match = extractedText.match(totalRegex);
  
  const detectedAmount = match ? parseFloat(match[1]) : 0;
  const itemCount = (extractedText.match(/\n/g) || []).length;
  
  let isValid = true;
  const details = {
    detectedAmount,
    itemCount,
    requirementsMet: {}
  };
  
  if (requirements.max_amount && detectedAmount > requirements.max_amount) {
    isValid = false;
    details.requirementsMet.maxAmount = false;
  } else {
    details.requirementsMet.maxAmount = true;
  }
  
  if (requirements.min_items && itemCount < requirements.min_items) {
    isValid = false;
    details.requirementsMet.minItems = false;
  } else {
    details.requirementsMet.minItems = true;
  }
  
  return { isValid, details };
}

// Verify transport ticket
async function verifyTransportTicket(extractedText: string, requirements: any): Promise<{ isValid: boolean; details: any }> {
  const transportKeywords = ['bus', 'train', 'metro', 'taxi', 'flight', 'ticket', 'transport'];
  const hasTransportKeyword = transportKeywords.some(keyword => 
    extractedText.toLowerCase().includes(keyword)
  );
  
  const details = {
    hasTransportKeyword,
    transportType: 'unknown',
    extractedText: extractedText.substring(0, 200)
  };
  
  if (requirements.transport_types) {
    const requiredTypes = requirements.transport_types.map((t: string) => t.toLowerCase());
    const matchingType = requiredTypes.find((type: string) => 
      extractedText.toLowerCase().includes(type)
    );
    
    if (matchingType) {
      details.transportType = matchingType;
      return { isValid: true, details };
    } else {
      return { isValid: false, details };
    }
  }
  
  return { isValid: hasTransportKeyword, details };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: VerificationRequest = await req.json();
    console.log('Received verification request:', requestData);

    const { submissionId, fileUrl, submissionType, questRequirements, verificationRules } = requestData;

    let verificationResults: any = {
      status: 'under_review',
      confidence: 0,
      details: {}
    };

    // Extract text from image first
    const extractedText = await extractTextFromImage(fileUrl);
    console.log('Extracted text:', extractedText);

    // Perform verification based on submission type
    switch (submissionType) {
      case 'receipt':
        const receiptVerification = await verifyReceipt(extractedText, questRequirements);
        verificationResults = {
          status: receiptVerification.isValid ? 'verified' : 'rejected',
          confidence: receiptVerification.isValid ? 0.9 : 0.1,
          details: receiptVerification.details,
          extractedText
        };
        break;

      case 'photo':
        const locationVerification = await verifyLocation(fileUrl, questRequirements.expected_location);
        verificationResults = {
          status: locationVerification.isValid ? 'verified' : 'under_review',
          confidence: locationVerification.isValid ? 0.8 : 0.5,
          details: {
            location: locationVerification.location,
            isLocationValid: locationVerification.isValid
          },
          extractedText
        };
        break;

      case 'ticket':
        const ticketVerification = await verifyTransportTicket(extractedText, questRequirements);
        verificationResults = {
          status: ticketVerification.isValid ? 'verified' : 'rejected',
          confidence: ticketVerification.isValid ? 0.85 : 0.2,
          details: ticketVerification.details,
          extractedText
        };
        break;

      case 'video':
        // For now, videos go to manual review
        verificationResults = {
          status: 'under_review',
          confidence: 0.5,
          details: { requiresManualReview: true },
          extractedText: 'Video submission requires manual review'
        };
        break;

      default:
        verificationResults = {
          status: 'rejected',
          confidence: 0,
          details: { error: 'Unsupported submission type' }
        };
    }

    console.log('Verification results:', verificationResults);

    // Update the submission in the database
    const { error: updateError } = await supabase
      .from('quest_submissions')
      .update({
        status: verificationResults.status,
        verification_results: verificationResults,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw updateError;
    }

    // If verified, award coins and complete the quest
    if (verificationResults.status === 'verified') {
      // Get the user quest and quest details
      const { data: submission, error: submissionError } = await supabase
        .from('quest_submissions')
        .select(`
          user_quest_id,
          user_quests!inner (
            user_id,
            quest_id,
            quests!inner (
              reward_coins,
              bonus_coins
            )
          )
        `)
        .eq('id', submissionId)
        .single();

      if (submissionError) {
        console.error('Error fetching submission details:', submissionError);
        throw submissionError;
      }

      const userQuest = submission.user_quests;
      const quest = userQuest.quests;
      
      // Mark quest as completed
      const { error: questUpdateError } = await supabase
        .from('user_quests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.user_quest_id);

      if (questUpdateError) {
        console.error('Error updating user quest:', questUpdateError);
        throw questUpdateError;
      }

      // Award coins using the RPC function
      const { error: coinError } = await supabase.rpc('award_quest_coins', {
        p_user_id: userQuest.user_id,
        p_quest_id: userQuest.quest_id,
        p_coins: quest.reward_coins || 10,
        p_bonus_coins: quest.bonus_coins || 0
      });

      if (coinError) {
        console.error('Error awarding coins:', coinError);
        throw coinError;
      }

      console.log(`Awarded ${quest.reward_coins || 10} coins to user ${userQuest.user_id}`);
    }

    return new Response(
      JSON.stringify({ success: true, verificationResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in quest verification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Verification failed', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});