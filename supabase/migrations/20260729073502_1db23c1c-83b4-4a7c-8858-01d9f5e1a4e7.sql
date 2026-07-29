REVOKE EXECUTE ON FUNCTION public.ensure_simulado_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_simulado_access(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_simulado_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_simulado_access(uuid, uuid, text) TO service_role;