CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hospital_name text NOT NULL,
  address text,
  phone text,
  maps_url text,
  patient text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  notes text NOT NULL DEFAULT '',
  reminder_email_sent_at timestamptz,
  reminder_sms_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le os proprios agendamentos" ON public.appointments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario cria os proprios agendamentos" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza os proprios agendamentos" ON public.appointments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario exclui os proprios agendamentos" ON public.appointments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX appointments_user_scheduled_idx ON public.appointments (user_id, scheduled_at);
CREATE INDEX appointments_reminder_idx ON public.appointments (scheduled_at) WHERE reminder_email_sent_at IS NULL;

CREATE TRIGGER appointments_touch_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();