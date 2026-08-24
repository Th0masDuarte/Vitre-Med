CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  place_id text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  maps_url text,
  rating numeric,
  lat double precision,
  lng double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le os proprios favoritos" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario cria os proprios favoritos" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza os proprios favoritos" ON public.favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario exclui os proprios favoritos" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER favorites_touch_updated_at BEFORE UPDATE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();