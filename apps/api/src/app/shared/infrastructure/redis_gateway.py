import json
from datetime import UTC, datetime

import redis


class RedisGateway:
    """Adapter for rate limits, hot counters and short-lived JSON caches."""

    def __init__(self, url: str):
        self.client = redis.from_url(url)

    def check(self, key: str, limit: int, seconds: int) -> bool:
        namespaced = "portfolio:ratelimit:" + key
        count = self.client.incr(namespaced)
        if count == 1:
            self.client.expire(namespaced, seconds)
        return count <= limit

    def increment(self, namespace: str, dimensions: tuple[str, ...]) -> None:
        key = "portfolio:" + namespace + ":" + ":".join(part or "unknown" for part in dimensions)
        day_key = key + f":{datetime.now(UTC):%Y-%m-%d}"
        pipe = self.client.pipeline()
        pipe.incr(key + ":total")
        pipe.incr(day_key)
        pipe.expire(day_key, 60 * 60 * 24 * 400)
        pipe.execute()

    def get(self, key: str) -> dict | None:
        value = self.client.get("portfolio:" + key)
        return json.loads(value) if value else None

    def set(self, key: str, value: dict, ttl_seconds: int) -> None:
        self.client.setex("portfolio:" + key, ttl_seconds, json.dumps(value))

    def delete(self, *keys: str) -> None:
        if keys:
            self.client.delete(*["portfolio:" + key for key in keys])
