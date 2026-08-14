"""建表脚本: python -m app.init_db"""
from app.db import init_db


if __name__ == "__main__":
    init_db()
    print("init_db OK")
