# Spec: 麦当劳日报归档平台 (mcd-report-archive)

> Phase 1 (Specify) 产物。按 spec-driven-development 流程, 本文经人审通过后才进 Plan/Tasks/Implement。
> 原则: 小步迭代, 先跑通「能打开 HTML 日报」, 其余注释留待后续。

## Assumptions（已逐条与人确认）

1. Web 应用, 浏览器访问, 非移动原生
2. MVP 只支持 HTML 日报; PDF 后续低成本可加, Excel 二期
3. 暂不做登录鉴权, 上传时选「部门」(localStorage 记住上次选的)
4. 存储用本地文件系统 + SQLite, 不上云/对象存储
5. Plotly 图表先靠公网 CDN 渲染 (当前公司网络可用), 不提前做本地化
6. 现代浏览器 (Chrome/Edge), 不考虑 IE
7. 项目目录: `C:/Users/a952462/OneDrive - ATOS/桌面/mcd-report-archive/`
   - 注意: 桌面是 OneDrive 同步目录, 若项目用 git, `.git` 可能被同步吞掉 (此前踩过坑)。MVP 不强求 git; 要用 git 时留意此风险。
8. 归档维度是「部门」(3PO/CNN/OC 等), 不是个人; 一天多份、多部门各自上传, 用「部门 + 日期」区分

## Objective

做一个轻量「日报网盘」: 同事把每天的 HTML 日报按部门拖进去归档, 按日历浏览, 点开即渲染。

- 用户: 上传日报的同事 + 浏览日报的人 (MVP 不区分)
- 痛点: 日报散在各人本地/聊天记录, 想回看某天哪个部门的日报要翻半天
- 网盘感: 日历=导航, 天=文件夹, 部门=文件

## Tech Stack

- Python 3.10+
- FastAPI (后端路由 + 未来推送 API)
- Uvicorn (ASGI server, --reload 开发)
- Jinja2 (服务端模板渲染, 不写前端框架)
- python-multipart (文件上传)
- sqlite3 (标准库, 元数据, 零外部依赖)
- 前端: 原生 HTML/CSS/JS, 日历手写, 拖拽原生 API, 不引前端框架

## Commands

```bash
# 装依赖
pip install fastapi uvicorn jinja2 python-multipart

# 初始化数据库 (建表)
python -m app.init_db

# 开发启动
uvicorn app.main:app --reload --port 8000

# 访问
# http://localhost:8000
```

## Project Structure

```
mcd-report-archive/                # 桌面/OneDrive 下
  app/
    main.py          # FastAPI app + 路由
    config.py        # 部门列表 DEPARTMENTS = ["3PO","CNN","OC"] 等, 可扩展
    db.py            # SQLite 连接 + 查询封装 (参数化)
    models.py        # 建表 SQL
    storage.py       # 文件存储路径 (年/月/日 分层) + <title> 提取
    templates/
      index.html     # 单页: 日历 + 列表 + 预览 + 上传
    static/
      style.css
      app.js
      # plotly.min.js  # 备用, 本地化时放这 (MVP 不放)
  data/
    reports/         # HTML 文件按 年/月/日 分层
      2026/08/12/...
    archive.db       # SQLite (不进版本库)
  spec.md
  tasks/             # Phase 2 生成 plan.md / todo.md
  README.md
```

## Data Model

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,      -- '2026-08-12'
  department TEXT NOT NULL,       -- 部门: 3PO/CNN/OC... (上传时选)
  title TEXT,                     -- 日报标题 (从 HTML <title> 提取, 空则用文件名)
  filename TEXT NOT NULL,         -- 存储文件名
  filepath TEXT NOT NULL,         -- 'data/reports/2026/08/12/xxx.html'
  created_at TEXT NOT NULL        -- ISO 时间戳
);
CREATE INDEX idx_reports_date_dept ON reports(report_date, department);
```

## Page Structure (单页三栏)

- 左栏: 日历 (月视图, 有日报的日期高亮带份数, 可切月) + 下方上传区 (拖拽框 + 选「部门」+ 日期)
- 中栏: 顶部「部门」筛选下拉 (全部 / 3PO / CNN / OC...); 下方选中日期的日报清单 (按部门+时间)
- 右栏: 选中日报的 iframe 渲染 (`sandbox=allow-scripts`)
- **默认行为**: 打开页面自动选中「最新有日报的一天」并加载其清单

## Backend API (MVP)

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/` | 渲染 index.html |
| GET | `/api/calendar?month=2026-08` | 返回该月每天日报份数 `{date: count}` |
| GET | `/api/reports?date=2026-08-12&department=3PO` | 返回当天日报清单 (department 可选, 不传=全部) |
| GET | `/api/latest` | 返回最新有日报的日期 (供首页默认选中) |
| GET | `/report/glm_5.2_ark_toC` | 返回该日报 HTML (iframe src, Content-Type text/html) |
| POST | `/api/upload` | 接收 file + department + date, 存储 + 入库 |

## Decisions (3 决策点定论)

1. **归属(部门)**: 上传时选「部门 + 日期」, 部门走固定下拉 (config.py 维护), 不从文件名解析; localStorage 记上次选的部门
2. **HTML 自包含**: CSS 内联, 唯一外部依赖 plotly CDN; 先裸 iframe 渲染
3. **同一部门多份**: 并存带时间戳, 清单按时间倒序, 默认最新在上

## Risks & 后续扩展 (注释, 不现在做)

- [风险] Plotly 走公网 CDN `cdn.plot.ly`, 内网部署若不通 -> 图表空白. 备选: `static/` 放 `plotly.min.js`, 入库时把 CDN 引用改写为 `/static/plotly.min.js`
- [后续] PDF 预览: iframe 直接支持, 存储同 HTML, 低成本可加
- [后续] Excel: 需后端转 HTML 表格, 二期
- [后续] 登录鉴权: 上传改登录态, 防冒充
- [后续] 自动推送: 加 `POST /api/push` 接收外部脚本推日报
- [后续] 删除/编辑: 误传处理, MVP 只增不删

## Code Style

```python
from fastapi import FastAPI, UploadFile, Form
from app.db import query_reports

app = FastAPI(title="日报归档平台")

@app.get("/api/reports")
def list_reports(date: str, department: str | None = None):
    """返回某天日报清单, 可按部门筛"""
    return query_reports(date, department)  # 内部参数化查询
```

- snake_case; 路由 `/api/xxx` 前缀; 函数名动词开头
- SQL 一律参数化, 不拼字符串
- 注释简洁, 不写废话注释

## Testing Strategy

- pytest, `tests/` 目录
- MVP 规模小, 先手动验证为主, 核心接口补单测:
  - `tests/test_upload.py`: 上传后入库 + 文件落地 + title 提取
  - `tests/test_calendar.py`: 日历接口 + 部门筛选返回正确
- 后续补: 渲染、并发上传

## Boundaries

- **Always**: SQL 参数化防注入; 上传校验 `.html` 后缀 + 大小上限; 改前 grep 定位再改
- **Ask first**: 改数据模型/表结构; 加新依赖; 改目录结构; 加新部门
- **Never**: 不删历史日报 (MVP 只增); 不提交 `archive.db`; 不在 OneDrive 目录里跑 git (除非确认 .git 风险)

## Success Criteria (MVP)

- [ ] uvicorn 启动, 浏览器打开 `localhost:8000`, 自动定位到最新有日报的一天
- [ ] 日历当月有日报的日期高亮带份数, 可切月
- [ ] 点某天, 中栏列出当天各部门日报; 部门下拉可筛选
- [ ] 点某份, 右栏 iframe 渲染, Plotly 图表正常显示
- [ ] 拖拽 HTML 到上传区, 选部门 + 日期, 上传成功, 列表刷新可见
- [ ] 上传的日报能正常渲染, 标题从 `<title>` 正确提取

## Open Questions (已定, 留档)

1. ~~同一部门多份~~ -> 已定: 并存带时间戳, 默认最新在上
2. ~~部门名单~~ -> 已定: 固定下拉 (3PO/CNN/OC), 走 config.py, 加部门改配置
3. ~~日报标题~~ -> 已定: 从 HTML `<title>` 提取, 空则用文件名
4. ~~项目目录~~ -> 已定: 桌面 `mcd-report-archive/` (OneDrive, 留意 git 坑)

> 4 项已全部敲定, 可进入 Phase 2 (Plan/Tasks)。
