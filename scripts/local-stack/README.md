# Docker-free local stack (optional)

Runs enough of Supabase on your machine to use the app end to end without Docker:

| Piece | Source | Port |
|---|---|---|
| Postgres | Homebrew `postgresql@16` (database `trustlance_dev`) | 5432 |
| Auth (GoTrue) | built from github.com/supabase/auth with Go | 9999 |
| REST (PostgREST) | Homebrew `postgrest` | 54329 |
| Gateway | `gateway.mjs` (routes `/auth/v1` and `/rest/v1`, like Supabase) | 54321 |

Not included: Storage (file uploads fail with a clear error), Realtime (pages update on refresh/focus), email (sign-ups are auto-confirmed).

```bash
brew install postgrest go
git clone --depth 1 https://github.com/supabase/auth ~/.trustlance-localstack/auth
(cd ~/.trustlance-localstack/auth && go build -o ../gotrue .)

node scripts/local-stack/setup.mjs     # (re)creates trustlance_dev with every migration
node scripts/local-stack/start.mjs     # starts auth, rest and the gateway; prints the env to use
```

The keys printed are the well-known Supabase *local development* demo keys. Never use them anywhere else.
