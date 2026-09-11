/**
 * Error monitoring — docs/05 Sprint 8.
 *
 * No new dependency. `onRequestError` is Next's own hook and it fires for every
 * server-side error: a failed render, a route handler that throws, a server
 * action that blows up. On Vercel the output goes to the runtime logs, where
 * `vercel logs` and the dashboard's Runtime Errors view already aggregate it.
 *
 * Adding Sentry would give better grouping and alerting, and `CLAUDE.md` §3
 * says a dependency needs a reason recorded in the PR. The reason for *not*
 * adding it yet: a single-admin site with one owner reading his own logs gets
 * most of the value from structured output plus Vercel's aggregation, and an
 * error reporter is another thing that can leak data. When the owner wants
 * alerting on his phone, that is the moment to add one — and this hook is where
 * it goes.
 *
 * ## The rule that matters here
 *
 * `CLAUDE.md` §2.3: a cost price must never leave the server. An error report
 * is a place data escapes by accident — a failed query logs its parameters, and
 * an admin query's parameters can contain `cost_price`. So this redacts before
 * it logs, rather than trusting that the day's error happened to be a safe one.
 */
export async function register() {
  // Nothing to initialise while the hook is the only reporter. Kept because
  // Next expects the export, and because it is where an SDK's init() would go.
}

/** Field names whose values must never reach a log line. */
const REDACT = [
  "cost_price",
  "costPrice",
  "markup_multiplier",
  "markupMultiplier",
  "internal_note",
  "internalNote",
  "password",
  "token",
  "apiKey",
  "api_key",
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "QUOTE_HASH_SALT",
  "RESEND_API_KEY",
];

/**
 * Strips anything sensitive out of a string before it is logged.
 *
 * Deliberately blunt. A query that failed carries its SQL and its parameters,
 * and a Drizzle error message can contain a whole select list. Rather than try
 * to parse that, any line mentioning a private column has its parameters
 * dropped, and any connection string or key is replaced wholesale.
 */
function redact(value: string): string {
  let out = value;

  // Connection strings and bearer-ish tokens, wherever they appear.
  out = out.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]");
  out = out.replace(/\beyJ[A-Za-z0-9._-]{20,}/g, "[redacted-jwt]");

  for (const name of REDACT) {
    if (!out.includes(name)) continue;
    // Drop the parameter list, which is where a value would be.
    out = out.replace(/params:\s*\[[^\]]*\]/g, "params: [redacted]");
    out = out.replace(
      new RegExp(`(["']?${name}["']?\\s*[:=]\\s*)("[^"]*"|'[^']*'|[^,\\s}]+)`, "gi"),
      "$1[redacted]",
    );
  }

  return out;
}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; renderSource?: string },
) {
  const raw = error instanceof Error ? (error.stack ?? error.message) : String(error);

  // One line of JSON, so Vercel's log viewer can group and filter it rather
  // than presenting a wall of stack traces.
  const entry = {
    level: "error",
    at: new Date().toISOString(),
    path: request.path ?? context.routePath ?? "unknown",
    method: request.method ?? "GET",
    route: context.routePath,
    kind: context.routerKind,
    source: context.renderSource,
    // Postgres error codes are the most useful single field for this app: 57014
    // is a statement timeout, 08006 a dropped connection, 42703 a real bug.
    code:
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined,
    message: redact(error instanceof Error ? error.message : String(error)),
    stack: redact(raw).split("\n").slice(0, 12).join("\n"),
  };

  console.error(JSON.stringify(entry));
}
