import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimit as memoryRateLimit } from "@/lib/rateLimit";

const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstash ? Redis.fromEnv() : null;

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        Number(process.env.REDEEM_RL_MAX_HITS || 30),
        `${Number(process.env.REDEEM_RL_WINDOW_SECONDS || 60)} s`
      ),
      analytics: true,
      prefix: "pachacard:redeem",
    })
  : null;

export function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function limitRedeemRequest(req: Request, scope = "redeem") {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";
  const key = `${scope}:${ip}:${ua.slice(0, 80)}`;

  if (!limiter) {
    return { success: memoryRateLimit(key), limit: 0, remaining: 0, reset: 0 };
  }

  return limiter.limit(key);
}
