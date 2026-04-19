-- Schedule the event-listener Edge Function to run every minute.
--
-- Runs once per deploy via `supabase db push`. If you need to re-schedule
-- (e.g. to point at a different Edge Function URL), first unschedule:
--     select cron.unschedule('event-listener');
-- then re-run this migration.
--
-- How this works:
--   1. pg_cron triggers the named job every minute (5-field crontab).
--   2. The job uses pg_net's http_post to call the Edge Function URL.
--   3. The function reads the cursor, walks blocks, writes events, advances.
--   4. On failure, the next minute's invocation will pick up where we left off.
--
-- REQUIRED BEFORE RUNNING:
--   - In Supabase dashboard → Database → Extensions, enable:
--       • pg_cron
--       • pg_net
--   - In Supabase dashboard → Edge Functions → Secrets, set:
--       • SUPABASE_DB_URL     (direct postgres URL, port 5432)
--       • SUPABASE_URL        (your project URL, https://<id>.supabase.co)
--       • SUPABASE_SERVICE_ROLE_KEY
--       • ORI_RPC_URL         (public rollup URL, https-only)
--   - In supabase/config.toml, set the project id, then:
--       `supabase link --project-ref <your-id>`
--       `supabase functions deploy event-listener`

-- Idempotency: if this migration runs twice, skip rescheduling.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'event-listener') then
    perform cron.unschedule('event-listener');
  end if;
end$$;

-- Schedule: every minute. Uses the current_setting() pattern to pull the
-- Edge Function URL and anon/service-role key from Vault, which you'll have
-- set up via the Supabase dashboard (Settings → Vault). If you prefer a
-- simpler setup, hard-code the URL and key in the $$ body below instead.
select cron.schedule(
  'event-listener',
  '* * * * *',
  $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets
                where name = 'ori_event_listener_url'),
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                        where name = 'ori_service_role_key'),
          'Content-Type', 'application/json'
        ),
        timeout_milliseconds := 30000
      );
  $$
);

-- After running, verify with:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
