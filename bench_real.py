"""Realistic concurrency benchmark using httpx.Client (keep-alive pool)."""
import concurrent.futures as cf
import statistics
import time

import httpx

URL = "http://localhost:8001/api/reports?date=2026-08-13"
N = 500
WORKERS = 50


def hit(client: httpx.Client, _):
    t0 = time.perf_counter()
    r = client.get(URL, timeout=10.0)
    dt = (time.perf_counter() - t0) * 1000
    return dt, r.status_code


# Shared client pool — threads reuse persistent connections
limits = httpx.Limits(max_connections=WORKERS, max_keepalive_connections=WORKERS)
client = httpx.Client(limits=limits, timeout=10.0)

t_start = time.perf_counter()
with cf.ThreadPoolExecutor(WORKERS) as ex:
    results = list(ex.map(lambda i: hit(client, i), range(N)))
wall = time.perf_counter() - t_start

times = sorted([r[0] for r in results])
codes = [r[1] for r in results]
err = sum(1 for c in codes if c != 200)

print(f"N={N}  workers={WORKERS}  wall={wall:.2f}s  rps={N/wall:.0f}")
print(f"  median = {statistics.median(times):.2f} ms")
print(f"  mean   = {statistics.mean(times):.2f} ms")
print(f"  p95    = {times[int(N*0.95)]:.2f} ms")
print(f"  p99    = {times[int(N*0.99)]:.2f} ms")
print(f"  min    = {min(times):.2f} ms")
print(f"  max    = {max(times):.2f} ms")
print(f"  errors = {err} / {N}")
client.close()