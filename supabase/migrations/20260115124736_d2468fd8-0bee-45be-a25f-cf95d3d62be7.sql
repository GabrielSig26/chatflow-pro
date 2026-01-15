-- Create app_settings table for n8n/Meta API configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_webhook_url text,
  meta_access_token text,
  whatsapp_phone_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app_settings
CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add delivery_status column to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';

-- Insert default empty row for settings (only one row needed)
INSERT INTO public.app_settings (id) VALUES (gen_random_uuid());