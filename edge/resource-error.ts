import { json } from "./auth";
export function resourceError(error: unknown): Response | undefined {
  const message = error instanceof Error ? error.message : String(error);
  if (
    !/exceeded D1.*free tier daily|D1.*daily (row read|row write|query) limit/i.test(
      message,
    )
  )
    return;
  const now = new Date();
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const response = json(
    {
      error: `Today's free-plan database limit has been reached. Access resumes on ${reset.toISOString().slice(0, 10)} at 08:00 Malaysia time.`,
      code: "DAILY_DATABASE_LIMIT",
      retryAt: reset.toISOString(),
    },
    503,
  );
  response.headers.set(
    "Retry-After",
    String(Math.ceil((reset.getTime() - now.getTime()) / 1000)),
  );
  return response;
}
