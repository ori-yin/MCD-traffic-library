"""FastAPI 应用入口"""
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app import config, storage
from app.db import (
    get_report_by_id,
    insert_report,
    query_calendar,
    query_latest,
    query_reports,
)

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="IT-traffic 图书馆")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# 直接用 jinja2 Environment, 绕开 starlette Jinja2Templates 的兼容问题
# (traceback 验证: starlette 1.2.1 + jinja2 3.1.6 报 unhashable dict;
#  jinja2 直接渲染 OK。模块级 template + auto_reload=False 省掉每次请求
#  的 cache lookup + mtime stat。模板改动靠 uvicorn --reload 重启 worker
#  重新 import 生效。)
_jinja = Environment(
    loader=FileSystemLoader(BASE_DIR / "templates"),
    autoescape=select_autoescape(),
    auto_reload=False,
)
_index_template = _jinja.get_template("index.html")


@app.get("/", response_class=HTMLResponse)
def index():
    """首页: 日历 + 列表 + 预览 + 上传 (单页)"""
    return _index_template.render()


@app.get("/api/calendar")
def api_calendar(month: str = Query(..., pattern=r"^\d{4}-\d{2}$")):
    """返回某月每天日报份数 {date: count}"""
    return query_calendar(month)


@app.get("/api/reports")
def api_reports(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    department: str | None = None,
):
    """当天日报清单, department 可选"""
    return query_reports(date, department)


@app.get("/api/latest")
def api_latest():
    """最新有日报的日期 (供首页默认选中)"""
    return {"latest": query_latest()}


@app.get("/api/departments")
def api_departments():
    """部门列表 (前端下拉用)"""
    return {"departments": config.DEPARTMENTS}


@app.get("/report/{report_id}")
def report_html(report_id: int):
    """返回日报 HTML (iframe src)"""
    row = get_report_by_id(report_id)
    if not row:
        raise HTTPException(404, "report not found")
    full = config.BASE_DIR / row["filepath"]
    if not full.is_file():
        raise HTTPException(404, "file missing on disk")
    return FileResponse(full, media_type="text/html")


@app.post("/api/upload")
async def api_upload(
    file: UploadFile = File(...),
    department: str = Form(...),
    date: str = Form(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    """接收 HTML 上传, 落地 + 入库"""
    name = file.filename or ""
    if not name.lower().endswith(config.ALLOWED_EXT):
        raise HTTPException(400, f"only {config.ALLOWED_EXT} allowed")
    if department not in config.DEPARTMENTS:
        raise HTTPException(400, f"department must be one of {config.DEPARTMENTS}")

    content = await file.read()
    if len(content) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, "file too large")

    title = storage.extract_title(content.decode("utf-8", errors="ignore"))
    filename = storage.generate_filename(department)
    full = storage.save_upload(content, filename, date)
    rel = storage.relative_to_base(full)
    rid = insert_report(date, department, title, filename, rel)
    return {"id": rid, "title": title, "filename": filename, "filepath": rel}
