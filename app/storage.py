"""文件存储: 路径分层 + <title> 提取 + 文件名生成"""
import re
from datetime import datetime
from pathlib import Path

from app import config

_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def extract_title(html: str) -> str | None:
    """从 HTML 提取 <title>, 空则 None"""
    m = _TITLE_RE.search(html)
    return m.group(1).strip() if m else None


def generate_filename(department: str) -> str:
    """{部门}_{时间戳}.html, 避免重名"""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{department}_{ts}.html"


def save_upload(content: bytes, filename: str, date: str) -> Path:
    """写入 data/reports/年/月/日/, 返回绝对路径"""
    y, mo, d = date.split("-")
    dir_path = config.REPORTS_DIR / y / mo / d
    dir_path.mkdir(parents=True, exist_ok=True)
    full = dir_path / filename
    full.write_bytes(content)
    return full


def relative_to_base(path: Path) -> str:
    """相对 BASE_DIR 的 POSIX 路径, 存 DB 用"""
    return path.relative_to(config.BASE_DIR).as_posix()
