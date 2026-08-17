"""500 concurrent /api/reports benchmark (DEPRECATED).

DO NOT USE — see handoff §14 第三轮 (2026-08-14):
- This script uses `httpx.get()` per request → each call rebuilds TCP connection.
- Real concurrency benchmark: `bench_real.py` (uses httpx.Client keep-alive pool).
- Conclusion: current db.py `with connect()` mode is fast enough (10.5ms / 756 rps
  under realistic 10-concurrent load). WAL change was rolled back.
"""
import concurrent.futures as cf
import statistics
import time

import httpx

URL = "http://localhost:8001/api/reports?date=2026-08-13"
N = 500
WORKERS = 50


def hit(_):
    t0 = time.perf_counter()
    r = httpx.get(URL, timeout=10.0)
    dt = (time.perf_counter() - t0) * 1000
    return dt, r.status_code


t_start = time.perf_counter()
with cf.ThreadPoolExecutor(WORKERS) as ex:
    results = list(ex.map(hit, range(N)))
wall = time.perf_counter() - t_start

times = [r[0] for r in results]
codes = [r[1] for r in results]
err = sum(1 for c in codes if c != 200)

print(f"N={N}  workers={WORKERS}  wall={wall:.2f}s  rps={N/wall:.0f}")
print(f"  median = {statistics.median(times):.2f} ms")
print(f"  mean   = {statistics.mean(times):.2f} ms")
print(f"  p95    = {sorted(times)[int(N*0.95)]:.2f} ms")
print(f"  p99    = {sorted(times)[int(N*0.99)]:.2f} ms")
print(f"  min    = {min(times):.2f} ms")
print(f"  max    = {max(times):.2f} ms")
print(f"  errors = {err} / {N}")

# Baseline (pre-WAL): median 122ms, p95 199ms
print(f"\nBaseline (pre-WAL): median 122ms, p95 199ms")
if statistics.median(times) < 30:
    print("[PASS] WAL drastically improved concurrency")
else:
    print("[CHECK] WAL may not be effective, investigate")