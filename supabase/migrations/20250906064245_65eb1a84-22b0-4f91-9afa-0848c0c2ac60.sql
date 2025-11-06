-- Fix RLS policies for community features

-- First, let's update the existing policies with proper names
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create the community-friendly profile viewing policy
CREATE POLICY "Profiles are publicly viewable" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Update the handle_new_user function to properly handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'user_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;