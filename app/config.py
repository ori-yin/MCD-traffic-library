"""日报归档平台配置"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 部门列表 (占位, 后续按需在此添加)
DEPARTMENTS = ["3PO", "CNN", "OC", "社媒", "其他"]

# 存储路径 (锚定项目根, 不依赖 CWD)
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
DB_PATH = DATA_DIR / "archive.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)

# 上传限制
MAX_UPLOAD_MB = 10
ALLOWED_EXT = ".html"
