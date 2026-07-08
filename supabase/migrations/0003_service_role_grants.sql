-- Backend Vercel Functions use the Supabase service_role key. Tables created
-- manually through SQL Editor can miss explicit table/function grants even
-- though service_role bypasses RLS, so keep these privileges in migrations.
grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on all routines in schema public to service_role;

alter default privileges in schema public
grant all privileges on tables to service_role;

alter default privileges in schema public
grant all privileges on sequences to service_role;

alter default privileges in schema public
grant execute on functions to service_role;
