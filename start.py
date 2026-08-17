"""IT-Traffic Library - launcher (foreground mode: close window = stop 8001).
Double-click does NOT flash-close (Python REPL stays; uvicorn holds foreground).
"""
import socket
import subprocess
import sys
from pathlib import Path

PROJ = Path(__file__).resolve().parent
PORT = 8001
REQ = PROJ / "requirements.txt"


def info(msg: str) -> None:
    print(f"  {msg}")


def ok(msg: str) -> None:
    print(f"[OK] {msg}")


def warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def err(msg: str) -> None:
    print(f"[ERR] {msg}")


def step_python() -> None:
    """Check Python version."""
    v = sys.version_info
    if v < (3, 11):
        err(f"Python >= 3.11 required, got {v.major}.{v.minor}")
        sys.exit(1)
    ok(f"Python {v.major}.{v.minor}.{v.micro}")


def step_venv() -> Path:
    """Create venv if missing, return venv python.exe."""
    venv_dir = PROJ / "venv"
    py = venv_dir / "Scripts" / "python.exe"
    if not py.exists():
        info("Creating venv (first run)...")
        r = subprocess.run(
            [sys.executable, "-m", "venv", "--system-site-packages", str(venv_dir)]
        )
        if r.returncode != 0:
            err("Failed to create venv")
            sys.exit(1)
        ok("venv created")
    else:
        ok("venv ready")
    return py


def step_deps(py: Path) -> None:
    """Check / install dependencies."""
    needs = []
    for pkg in ["fastapi", "uvicorn", "jinja2", "multipart"]:
        r = subprocess.run(
            [str(py), "-c", f"import {pkg}"],
            capture_output=True,
        )
        if r.returncode != 0:
            needs.append(pkg)
    if not needs:
        ok("dependencies OK")
        return
    warn(f"missing: {needs}, installing...")
    mirrors = [
        ("https://mirrors.aliyun.com/pypi/simple/", "mirrors.aliyun.com"),
        ("https://pypi.tuna.tsinghua.edu.cn/simple/", "pypi.tuna.tsinghua.edu.cn"),
    ]
    for mirror_url, host in mirrors:
        r = subprocess.run(
            [str(py), "-m", "pip", "install", "-r", str(REQ),
             "-i", mirror_url, "--trusted-host", host],
        )
        if r.returncode == 0:
            ok("dependencies installed")
            return
        warn(f"{host} mirror failed, trying next")
    err("failed to install dependencies, check network")
    sys.exit(1)


def step_init_db(py: Path) -> None:
    """Create tables (idempotent)."""
    r = subprocess.run([str(py), "-m", "app.init_db"], cwd=str(PROJ))
    if r.returncode != 0:
        err("init_db failed")
        sys.exit(1)
    ok("init_db OK")


def step_check_port() -> None:
    """Ensure port is free."""
    s = socket.socket()
    s.settimeout(0.5)
    if s.connect_ex(("127.0.0.1", PORT)) == 0:
        s.close()
        err(f"port {PORT} busy, close existing uvicorn window first")
        sys.exit(1)
    s.close()
    ok(f"port {PORT} free")


def main() -> None:
    print("=" * 50)
    print("  IT-Traffic Library - Launcher")
    print("=" * 50)
    step_python()
    py = step_venv()
    step_deps(py)
    step_init_db(py)
    step_check_port()

    print("=" * 50)
    info("uvicorn running in foreground (close this window = stop 8001)")
    info(f"local:   http://localhost:{PORT}")
    info(f"network: http://YOUR_LAN_IP:{PORT}  (run 'ipconfig' to find it)")
    print("=" * 50)
    print()

    # Foreground uvicorn (close window / Ctrl+C both kill it)
    r = subprocess.run(
        [str(py), "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", str(PORT)],
        cwd=str(PROJ),
    )
    print(f"\nuvicorn exited (code={r.returncode})")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped (Ctrl+C)")
    except Exception as e:
        err(f"launcher failed: {e}")
        sys.exit(1)