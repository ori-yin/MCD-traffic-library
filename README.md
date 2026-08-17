# MCD-traffic-library

IT-traffic 图书馆 — 按日历浏览、拖拽上传、按部门归档 HTML 日报。

## 快速上手

双击 `setup_and_run.bat`（自动建 venv + 装依赖 + 建表 + 启动）。

或手动：
```bash
# 1. 装依赖
pip install -r requirements.txt

# 2. 初始化数据库（建表，幂等）
python -m app.init_db

# 3. 启动服务
uvicorn app.main:app --port 8001
# 浏览器访问 http://localhost:8001
```

> 端口可能被占，可换 `--port 8002` 等。

## 使用流程

1. 打开首页 → 自动定位最新有日报的一天
2. 左侧日历点某天 → 中栏列出当天日报（按部门徽章区分）
3. 中栏顶部"部门"下拉筛选
4. 中栏点某条 → 右栏 iframe 渲染该日报
5. 左下角"上传日报"区：
   - 选部门（localStorage 记住上次选的）
   - 选日期
   - 拖拽 HTML 进虚线框 / 或点"点选文件"
6. 上传成功后日历 + 列表自动刷新

## API 参考

| 方法 | 路径 | 参数 | 返回 |
|---|---|---|---|
| GET | `/` | - | HTML 单页 |
| GET | `/api/calendar` | `month=YYYY-MM` | `{date: count}` |
| GET | `/api/reports` | `date=YYYY-MM-DD`, `department?` | `[{id, report_date, department, title, filename, filepath, created_at}]` |
| GET | `/api/latest` | - | `{latest: "YYYY-MM-DD"}` |
| GET | `/api/departments` | - | `{departments: [...]}` |
| GET | `/report/{id}` | - | 日报 HTML |
| POST | `/api/upload` | `file` (multipart), `department`, `date` | `{id, title, filename, filepath}` |

### 上传校验
- 仅 `.html` 后缀（400 拒绝）
- 部门必须在 `config.DEPARTMENTS` 名单内（400 拒绝）
- 文件 ≤ `MAX_UPLOAD_MB`（默认 10MB，413 拒绝）
- 标题从 HTML `<title>` 提取，无则为空
- 文件落地路径：`data/reports/{年}/{月}/{日}/{部门}_{时间戳}.html`

## 项目结构

```
mcd-report-archive/                # 本地目录 (OneDrive 锁暂未改; GitHub 仓库已改名为 MCD-traffic-library)
├── app/
│   ├── main.py        FastAPI 入口 + 路由
│   ├── config.py      配置（部门列表、路径、限制）
│   ├── models.py      建表 SQL
│   ├── db.py          SQLite 封装
│   ├── storage.py     文件存储 + 标题提取
│   ├── init_db.py     建表脚本
│   ├── templates/
│   │   └── index.html 单页模板
│   └── static/
│       ├── style.css  麦当劳品牌风样式
│       └── app.js     前端逻辑
├── data/
│   ├── archive.db     SQLite
│   └── reports/       HTML 按 年/月/日 分层
├── spec.md            需求 / 决策
├── tasks/             plan.md + todo.md
└── README.md
```

## 部门名单

`app/config.py` 维护：
```python
DEPARTMENTS = ["3PO", "CNN", "OC", "社媒", "其他"]
```
加部门改这一行即可，前端下拉 / 后端校验会自动跟随。

## 已知坑

- **starlette 1.2.1 `Jinja2Templates` 报 `unhashable dict`** — 已用 `jinja2.Environment` 直渲染绕过，**别改回 `Jinja2Templates`**
- **OneDrive 同步目录下 `--reload` 偶尔不灵** — 模板改了浏览器无变化，重启 uvicorn
- **jinja2 `auto_reload=False`** — 模板改完必须重启 uvicorn 才生效；CSS/JS 走 StaticFiles 无缓存，浏览器刷新即可
- **端口 8000 可能被旧进程占住** — 杀不掉时换 `--port 8001`

## 后续 (spec 注释，未实现)

- PDF 预览 / Excel 转换
- 登录鉴权
- 外部脚本 `POST /api/push` 推送日报
- 删除 / 编辑（误传处理）
- 内网部署时 Plotly CDN 改本地 `static/plotly.min.js`
