"""SQLite schema"""

CREATE_REPORTS_SQL = """
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  department TEXT NOT NULL,
  title TEXT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_date_dept ON reports(report_date, department);
"""
