import { Logo } from '@/components/common/logo';

/**
 * Shown instead of a stack trace when the app has no Supabase credentials.
 *
 * A missing environment file is a setup step, not a fault, so it should read as instructions. The
 * console checks for this before its first database call because that call is otherwise the thing
 * that fails, several frames deep, with a message about a client library.
 */
export function ConsoleNotConfigured({ missing }: { missing: string[] }) {
  return (
    <div data-console className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="px-5 py-5 md:px-8">
        <Logo />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-8 md:px-8">
        <div className="w-full max-w-xl space-y-6">
          <div className="space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Platform console
            </p>
            <h1 className="font-display text-[clamp(1.9rem,6vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
              Not configured yet
            </h1>
            <p className="text-sm leading-relaxed text-ink-secondary">
              The console reads everything from the database, and this deployment has no Supabase
              credentials. Nothing is broken — these values have simply not been set.
            </p>
          </div>

          <div className="console-card p-5 md:p-6">
            <p className="t-label-caps">Missing from .env.local</p>
            <ul className="mt-2 space-y-1">
              {missing.map((key) => (
                <li key={key} className="font-mono text-sm">{key}</li>
              ))}
            </ul>

            <hr className="rule my-5" />

            <ol className="max-w-reading list-decimal space-y-2 pl-4 text-sm text-ink-secondary">
              <li>
                Copy the values from your Supabase project under{' '}
                <span className="font-medium text-ink">Project settings → API</span> into{' '}
                <span className="font-mono text-xs">.env.local</span>, then restart the dev server.
              </li>
              <li>
                Apply the migrations, so the functions the console calls exist:{' '}
                <span className="font-mono text-xs">npx supabase db push</span>.
              </li>
              <li>
                Make yourself an admin:{' '}
                <span className="font-mono text-xs">
                  insert into platform_admins (user_id) values (&#39;…&#39;);
                </span>
              </li>
            </ol>
          </div>

          <p className="text-2xs text-ink-muted">
            Until then every signed-in page needs the same values — this is not specific to the console.
          </p>
        </div>
      </main>
    </div>
  );
}
