-- Fix search path warnings for security
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW; 
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_quest_submission(submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  submission_record RECORD;
  verification_result JSONB;
BEGIN
  -- Get the submission details
  SELECT * INTO submission_record
  FROM public.quest_submissions
  WHERE id = submission_id;
  
  -- Call the edge function (this will be called automatically, but you can also call it manually)
  SELECT content::jsonb INTO verification_result
  FROM net.http_post(
    'https://mnhgrondudzfmshmvmca.supabase.co/functions/v1/quest-verification',
    jsonb_build_object(
      'submissionId', submission_id,
      'fileUrl', submission_record.file_url,
      'submissionType', submission_record.submission_type,
      'questRequirements', (SELECT requirements FROM public.quests WHERE id = submission_record.quest_id),
      'verificationRules', (SELECT verification_rules FROM public.quests WHERE id = submission_record.quest_id)
    )::text,
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT current_setting('request.jwt.claims', true)::json->>'jti')
    )::jsonb
  );
  
  -- Update the submission with the verification result
  UPDATE public.quest_submissions
  SET 
    status = verification_result->>'status',
    verification_results = verification_result,
    updated_at = NOW()
  WHERE id = submission_id;
  
  RETURN verification_result;
END;
$function$;