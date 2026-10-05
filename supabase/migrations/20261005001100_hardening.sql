-- Hardening from `supabase db lint` and the Supabase security advisor.

-- require_user raises an exception, so it must not be declared STABLE.
alter function app.require_user() volatile;

-- Pin search_path on every helper that did not set it (all bodies use schema-qualified names).
alter function app.fail(text, text) set search_path = '';
alter function app.require_user() set search_path = '';
alter function app.touch_updated_at() set search_path = '';
alter function app.forbid_mutation() set search_path = '';
alter function app.check_username() set search_path = '';
alter function app.is_reserved_username(text) set search_path = '';
alter function app.text_array_to_string(text[]) set search_path = '';
alter function app.contract_ref(uuid) set search_path = '';
alter function app.fmt_amount(numeric) set search_path = '';
alter function app.path_uuid(text) set search_path = '';
alter function app.throttle_messages() set search_path = '';
