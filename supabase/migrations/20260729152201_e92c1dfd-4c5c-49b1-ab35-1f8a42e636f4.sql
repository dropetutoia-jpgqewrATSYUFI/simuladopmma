CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  v_name := NULLIF(NEW.raw_user_meta_data ->> 'full_name', '');
  v_phone := NULLIF(NEW.raw_user_meta_data ->> 'whatsapp', '');

  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (NEW.id, v_name, NEW.email, v_phone)
  ON CONFLICT DO NOTHING;

  IF v_phone IS NOT NULL OR NEW.email IS NOT NULL THEN
    INSERT INTO public.pmma_leads (first_name, whatsapp_e164, email, consent, consent_at, source)
    SELECT COALESCE(v_name, split_part(COALESCE(NEW.email, 'aluno'), '@', 1)),
           COALESCE(v_phone, ''),
           NEW.email,
           true,
           now(),
           'cadastro'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.pmma_leads l
      WHERE (NEW.email IS NOT NULL AND lower(l.email) = lower(NEW.email))
         OR (v_phone IS NOT NULL AND l.whatsapp_e164 = v_phone)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();