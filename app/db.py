"""SQLite 连接 + 查询封装 (参数化)"""
import sqlite3
from datetime import datetime

from app import config


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """建表 (一次性, 已存在则跳过)"""
    from app.models import CREATE_REPORTS_SQL
    with connect() as conn:
        conn.executescript(CREATE_REPORTS_SQL)
        conn.commit()


def insert_report(
    report_date: str,
    department: str,
    title: str | None,
    filename: str,
    filepath: str,
) -> int:
    """插入日报, 返回 id"""
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO reports
               (report_date, department, title, filename, filepath, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (report_date, department, title, filename, filepath,
             datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
        return cur.lastrowid


def query_reports(date: str, department: str | None = None) -> list[dict]:
    """某天日报清单 (按部门筛, 按时间倒序)"""
    if department:
        sql = "SELECT * FROM reports WHERE report_date=? AND department=? ORDER BY created_at DESC"
        params = (date, department)
    else:
        sql = "SELECT * FROM reports WHERE report_date=? ORDER BY created_at DESC"
        params = (date,)
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def query_calendar(month: str) -> dict[str, int]:
    """某月每天日报份数 {date: count}"""
    with connect() as conn:
        rows = conn.execute(
            "SELECT report_date, COUNT(*) FROM reports WHERE report_date LIKE ? GROUP BY report_date",
            (f"{month}%",),
        ).fetchall()
    return {r[0]: r[1] for r in rows}


def query_latest() -> str | None:
    """最新有日报的日期"""
    with connect() as conn:
        row = conn.execute(
            "SELECT report_date FROM reports ORDER BY report_date DESC LIMIT 1"
        ).fetchone()
    return row[0] if row else None


def get_report_by_id(report_id: int) -> dict | None:
    """按 id 取日报元数据"""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM reports WHERE id=?", (report_id,)
        ).fetchone()
    return dict(row) if row else None
