# MCD-traffic-library — Handoff (给接手的新 session)

## 1. 项目
IT-traffic 图书馆:「网盘感」按日历浏览 HTML 日报, 同事拖拽上传, 按部门+日期归档。

## 2. 位置
- **实际跑**(source of truth, **别放 OneDrive**): `C:\projects\mcd-report-archive\` — 2026-08-14 从 OneDrive 复制,避开 OneDrive 文件锁导致 .bat 闪退
- **OneDrive 同步**(只读 / GitHub 推送用): `C:/Users/a952462/OneDrive - ATOS/桌面/mcd-report-archive/` — `.git` 仍要留意同步吞风险,本轮未在 OneDrive 跑任何启动命令
- **GitHub 仓库**: `ori-yin/MCD-traffic-library` (2026-08-14 已改)

## 3. 技术栈
- Python 3.13 / FastAPI 0.136.3 / starlette 1.2.1 / jinja2 3.1.6
- SQLite (标准库) / 纯 HTML/CSS/JS 前端 (无框架)
- CSS: 麦当劳品牌风（红 #DA291C + 金 #FFC72C），金拱 SVG header

## 4. 文档 (先读)
- `spec.md` — Phase 1 需求/决策 (Assumptions, Decisions, Success Criteria)
- `tasks/plan.md` — Phase 2 实现方案 (7 步, 12 任务)
- `tasks/todo.md` — Phase 3 任务清单
- `README.md` — 快速上手 + API 参考

## 5. 当前状态 (2026-08-14)
- ✅ Task 1-13 全部完成 (含小 BUG 修复 + UI 重构)
- ✅ 本轮: .bat → start.py + 项目迁非 OneDrive (见 §14)
- 🔄 测试数据: 4 条 (id=1 3PO 8-12 / id=2 CNN 8-13 / id=3-4 8-14)，样例 HTML 在 `data/reports/` 下
- 🎨 UI: 麦当劳品牌风 + 单行 toolbar + 预览占满
- 📛 平台名: **IT-traffic 图书馆** / 仓库名: **MCD-traffic-library** (GitHub)
- ⚡ 性能基线 (Python httpx keep-alive, 2026-08-14 实测):
  - GET /            median 0.92ms
  - GET /api/*       median 1.0-1.8ms
  - GET /report/{id} median 2.95ms
  - curl 看到的 200ms 是 Windows 本地 TCP 建连开销, 不是服务端
- ⚡ **真实并发基线 (2026-08-14 第三轮实测, keep-alive 池)**:
  - 10 并发 x 100 请求: median **10.5ms** / p95 23.5ms / **756 rps** (日常同事浏览足够)
  - 50 并发 x 500 请求: median 111ms / p95 306ms / 345 rps (极端压测, 实际不会到)
  - **结论: 当前 db.py 性能完全够用, 不需要 WAL/连接池改造**
- 🌐 当前 uvicorn: 端口 8001 (`C:\projects\mcd-report-archive\` 下跑)
- 🚀 启动入口: **双击 `start.py`** (Python REPL 保持 + uvicorn 前台跑 + 关窗口 = 停 8001)

## 6. 关键决策 (摘自 spec.md)
- 归档维度 = **部门** (3PO/CNN/OC, config 占位), 不是个人
- 上传时前端选部门 + 日期, localStorage 记上次部门 / 上次筛选
- 同一部门多份: 并存带时间戳, 默认最新在上
- HTML 自包含; MVP 不做 PDF/Excel/login/auto-push (spec 注释为后续)
- Plotly 走公网 CDN (当前网络可用); 内网部署再加本地化

## 7. 已知坑 (不要踩)
- **starlette 1.2.1 `Jinja2Templates` 报 `unhashable dict`** — 已用 jinja2 直渲染 OK，**不要改回 Jinja2Templates**
- **OneDrive 目录 `--reload` 偶尔不生效** — 改代码后浏览器无变化 → TaskStop 后台 uvicorn 重启
- **端口 8000 可能被占** — 旧 PID 杀不掉时换 `--port 8001`
- **jinja2 `auto_reload=False`** — 模板改完必须重启 uvicorn 才生效（CSS/JS 走 StaticFiles 无缓存无需重启）
- `config.py` 路径锚定 `BASE_DIR = Path(__file__).resolve().parent.parent`

## 8. 目录结构
```
app/
  main.py        FastAPI + jinja2 直渲染 (模块级 template + auto_reload=False)
  config.py      BASE_DIR + DEPARTMENTS + 路径 + 上传限制
  models.py      reports 表 schema
  db.py          SQLite 查询封装 (参数化, 每查新连接)
  storage.py     文件路径分层(年/月/日) + <title> 提取 + 文件名生成
  init_db.py     `python -m app.init_db`
  templates/index.html  单页 (header + 左日历+上传 / 中列表+筛选 / 右预览)
  static/
    style.css    品牌风样式 + CSS var --brand-red/yellow/green/blue
    app.js       日历渲染 / 报告列表 / 部门筛选 / 上传 / 元信息条
data/
  archive.db     SQLite
  reports/       HTML 按 年/月/日 分层 (含 1 个样例)
spec.md / tasks/plan.md / tasks/todo.md
README.md / handoff.md / requirements.txt
```

## 9. API 总览 (MVP 已实现)
- `GET /` 首页
- `GET /api/calendar?month=YYYY-MM` → `{date: count}`
- `GET /api/reports?date=YYYY-MM-DD[&department=]` → 清单
- `GET /api/latest` → `{"latest": "YYYY-MM-DD"}`
- `GET /api/departments` → `{"departments": ["3PO","CNN","OC"]}`
- `GET /report/{id}` → 日报 HTML (iframe src)
- `POST /api/upload` (multipart: file, department, date)

## 10. 启动 & 开发
**一键启动(推荐)**:
```cmd
:: 双击 C:\projects\mcd-report-archive\start.py
:: 窗口保持 + banner + uvicorn 前台; 关窗口 = 停 8001
```

**手动启动(开发)**:
```bash
cd "C:\projects\mcd-report-archive"   # 别在 OneDrive 跑!
python -m venv --system-site-packages venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m app.init_db
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
# 浏览器: http://localhost:8001
```

## 11. 进程清理
- 改代码 → 浏览器 hard refresh；模板改了无变化 → 重启 uvicorn
- TaskStop 后台 uvicorn task 或 `taskkill /F /PID <pid>`

## 12. 工作风格 (来自用户)
- **小步迭代, 一部分一部分来**; 每步做完等用户验再做下一步
- **不提前预判/过度设计** — 风险/后续功能写到 spec 注释, 不在 MVP 提前实现
- **按 spec-driven-development 流程**: spec → plan → todo → implement, 每步用户审
- **征求我意见再决定** — 框架选型/部门名单/UI 方向等关键决策先讨论

## 13. 待办 / 后续
- [x] 性能回看 — 实测服务端 1-3ms, 之前感觉慢是 curl 假象或 OneDrive 同步; CSS 阴影/渐变对客户端 paint 有微影响但量级很小, 不优化
- [x] README 完善 (Task 12)
- [x] 全流程验证 spec 6 条 Success Criteria
- [x] 代码 review (Task 13): §14 第一轮
- [x] .bat → start.py (本轮, 见 §14)
- [x] 项目迁非 OneDrive 目录 (本轮, 见 §14)
- [x] 删除 stop.py (本轮, 关窗口 = 停服务, stop.py 不需要)
- [x] P0 SQLite WAL 改动 (本轮已撤回 — 真实基线 median 10.5ms / 756 rps 完全够用, 见 §14 三轮结论)
- [x] P0.5 连接池改造 (随 P0 撤回, 不需要)

### 迭代路线图 (2026-08-14 本轮讨论, 待用户拍板优先级)

#### 🥇 第一批 — 高 ROI 小改动(半天搞定,推荐先做)
- [ ] **删除/编辑 API** ⭐ 最实用 — 上传错了现在没法处理, 同事一定用得到
- [ ] **删除 `setup_and_run.bat`** — README 还指向它会误导新用户, `start.py` 才是入口
- [ ] **API `department` 长度校验** — handoff §14 第二轮提的非阻塞项, 5 行改动
- [ ] **`.gitignore` 加 `venv/`** — 防御误提交

#### 🥈 第二批 — 内网部署相关
- [ ] **Docker 打包** — 用户说"晚点", 部署到 `cn-kevinguo-ideon` 虚拟机时再做
- [ ] **Plotly CDN 改本地 `static/plotly.min.js`** — 内网部署配套
- [ ] **8001 防火墙放行文档化** — 同事 LAN 访问需要

#### 🥉 第三批 — 功能扩展(spec 注释)
- [ ] **PDF/Excel 预览/导出** — 运营归档用
- [ ] **登录鉴权** — 内网部署需要 (若上 IT VPN 可暂缓)
- [ ] **`POST /api/push`** — 外部脚本自动推日报
- [ ] **全文搜索** — 报告多了之后用得上

#### 第四批 — 锦上添花(暂不列)
标签系统 / 作者记录 / 统计报表...

## 14. 代码 review 记录 (Task 13)

### 第一轮 (2026-08-14 之前)
- **handoff 不一致**: ✅ 已修 (Task 12 状态、测试数据条数、待办勾选、requirements.txt)
- **app.js `deptClass` 硬编码 `['3PO', 'CNN', 'OC']`**: ✅ 已改为 `state.departments.includes(d)`, 加部门只改 config + README
- **CSS `transition: all`**: ✅ 4 处全部细化为具体属性 (`background-color`/`border-color`/`box-shadow`/`transform`)
- **CSS hover `box-shadow` blur 8**: paint 微开销; 接受
- **app.js `selectedReportId` 被部门筛选过滤后视觉丢失**: ✅ 已修 — 切筛选时若选中项被过滤, 自动选中第一条可见; 若无可见, 清空预览
- **`/api/departments` 双调用风险**: 当前只在 initUploadUI 调一次, state.departments 复用, 无重复
- **SQLite 每查开连接**: 量级小可接受; 高并发再换连接池

### 第二轮 (2026-08-14 本轮)
- **🚨 `.bat` 双击闪退根因**: Win11 资源管理器用 `cmd /c xxx.bat` 启动 .bat, 即便脚本内有 `pause` / `cmd /k` / `start cmd /k` 都会被系统级策略绕过窗口自动关闭。6 轮改 .bat 全部治标(`cd /d "%~dp0"` 在 OneDrive 文件锁下间歇性失败 → Python 找不到 `app` 模块 → ModuleNotFoundError → 异常退出 → 闪退)。我能在 bash 起 8001 是因为 bash cwd 已是项目根, Python 找到模块; 用户双击 .bat 时 cmd cwd 是用户主目录, `cd /d` 失败, Python 找不到模块。**真正根治: 弃用 .bat, 改用 `start.py`** (Python 启动方式天然不闪退)
- **✅ 改用 `start.py`** (前台模式): 双击 → venv 建/检查 + 依赖装 + init_db + uvicorn 前台跑 + 窗口保持 + 关窗口 = 停 8001。Python REPL 保持窗口不关是核心原理
- **✅ 项目迁 `C:\projects\mcd-report-archive\`** (避开 .bat 同步锁)。OneDrive 项目根保留作为 GitHub 推送源, 但**实际跑在新目录**
- **✅ 删除 `stop.py`**: 前台模式下关窗口 = 停 8001, 不需要外部 stop 工具
- **✅ `start.py` 输出全英文**: 避免 OneDrive 中文路径 + Windows console 编码坑
- **⚠️ P0 SQLite WAL 改动待做**: 实测 500 并发 median 122ms / p95 199ms, 比串行 keep-alive 1-3ms 退化 100 倍。SQLite 默认 rollback journal + `synchronous=FULL` 导致写锁排队。改 `db.connect()` 加 3 行 `PRAGMA journal_mode=WAL` + `PRAGMA synchronous=NORMAL` + `PRAGMA busy_timeout=5000` 预期退化 10-20 倍。SQLite 官方推荐配置, 风险极低
- **`api_reports` `department` 没长度限制**: 可加 `max_length=20`, 非阻塞
- **`report_html` 是 sync handler**: 高并发走 threadpool (默认 40), 500 并发会排队; 改 async 不会显著改善, 建议不动
- **`_TITLE_RE` regex 鲁棒性 OK**: `re.DOTALL` 已支持跨行 `<title>`, MVP 够用
- **上传 `file.read()` 内存**: starlette `UploadFile` 内部 spooled tempfile, >1MB 自动落盘 `%TEMP%`, 不会吃满内存
- **app.js listeners**: `innerHTML=''` 重建 DOM, 旧元素 + 监听器被 GC 一起回收, **无内存泄漏**
- **CSS `box-shadow` / `transform` / `linear-gradient`**: paint 重 / GPU 合成, 量级可接受

### 第三轮 (2026-08-14 本轮, 已撤回)

#### 🚨 P0 SQLite WAL 调研结论: **不需要改, 撤回**

**第一版调研 (误判)**:
原 122ms baseline 是 keep-alive httpx 复用连接测的;但 `bench_wal.py` 每次 `httpx.get()` 都新建 TCP 连接 + 关 → 测出来 11600ms (其实是 httpx 开销,不是 SQLite)。第一次以为 SQLite 慢,要加 WAL。

**真实基线 (用 httpx.Client keep-alive 池, `bench_real.py`)**:
| 场景 | median | p95 | rps |
|---|---|---|---|
| 10 并发 x 100 请求 (日常同事浏览) | **10.5ms** | 23.5ms | **756** |
| 50 并发 x 500 请求 (极端压测) | 111ms | 306ms | 345 |

**中间状态 (WAL PRAGMA 加了又撤)**:
- db.py 加 3 行 PRAGMA → 测 11982ms (跟 11600ms 几乎一样, WAL 无效)
- 根因: WAL 没解决"每查新连接"问题,反而每次新连接 + WAL handle 创建开销 > WAL 收益
- 真实根因: httpx bench 脚本的连接建连开销, 不是 SQLite

**用户决策**: 回滚 (撤 PRAGMA, 保持 db.py 原状)。
**最终结论**: 当前 db.py `with connect()` 模式 + 默认 SQLite journal_mode 对真实场景 (10 个同事同时浏览) 完全够用 (10.5ms / 756 rps)。**P0 WAL 改造不必要, P0.5 连接池改造也不需要**。**教训: 性能基准要用 keep-alive 连接池测, 否则测的是 bench 工具开销而不是服务端**。

**撤回到 git status 干净状态**: db.py 已 cp 到 C:\projects\ + OneDrive 两边一致, 没有 PRAGMA 改动。

## 15. UI 变更记录
- **v1 骨架**: 三栏 320/1fr/1.6fr, 用户反映右栏偏窄
- **v2 品牌风**: 改为 280/320/1fr, 金拱 SVG + 部门徽章配色; 用户感觉变慢 (实测是 curl 假象, 服务端 1-3ms)
- **v3 真实 logo + 改名**: 头部用真实 mcdonalds.svg, 标题 "IT-traffic 图书馆", 副标题 "Daily Report Archive"
- **v4 单行 toolbar**: 三栏改顶部单行 toolbar (日历/上传/列表), iframe 占满下方
- **v5 改名 + setup_and_run.bat**: 平台名 MCD-traffic-library; 加 setup_and_run.bat 一键启动

## 16. 改名记录 (2026-08-14)
- **平台展示名**: IT-traffic 图书馆 (不变)
- **GitHub 仓库**: `ori-yin/mcd-report-archive` → `ori-yin/MCD-traffic-library` (Patched via API, 文件保留)
- **本地目录**:
  - OneDrive: `mcd-report-archive` 暂未改, OneDrive 文件锁 "Device or resource busy" 一直未释放 → 本轮**不再**迁, 弃用 .bat
  - **新跑目录**: `C:\projects\mcd-report-archive\` (2026-08-14 新建, 避开 OneDrive 锁)
- **内部文档**: handoff.md / README.md / spec.md 已更新项目名引用

### 第二轮改名 (2026-08-14 本轮)
- **新增**: `start.py` 替代 .bat 作为启动入口(全英文输出, 前台模式)
- **删除**: `stop.py` (关窗口 = 停服务, 不需要 stop 工具)
- **保留**: `setup_and_run.bat` 作为历史文物 (GitHub 看代码的人期待有 .bat, 但实际启动用 start.py)
