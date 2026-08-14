# mcd-report-archive — Handoff (给接手的新 session)

## 1. 项目
IT-traffic 图书馆 (内部命名, 用户定的; 仓库目录名仍为 mcd-report-archive):「网盘感」按日历浏览 HTML 日报, 同事拖拽上传, 按部门+日期归档。

## 2. 位置
`C:/Users/a952462/OneDrive - ATOS/桌面/mcd-report-archive/`
**桌面 OneDrive 同步目录** — 留意 .git 坑（暂未用 git）。

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
- 🔄 测试数据: 4 条 (id=1 3PO 8-12 / id=2 CNN 8-13 / id=3-4 8-14)，样例 HTML 在 `data/reports/` 下
- 🎨 UI: 麦当劳品牌风 + 单行 toolbar + 预览占满
- 📛 平台名: **IT-traffic 图书馆** (内部命名, 仓库目录仍 mcd-report-archive)
- ⚡ 性能基线 (Python httpx keep-alive, 2026-08-14 实测):
  - GET /            median 0.92ms
  - GET /api/*       median 1.0-1.8ms
  - GET /report/{id} median 2.95ms
  - curl 看到的 200ms 是 Windows 本地 TCP 建连开销, 不是服务端
- 🌐 当前 uvicorn: 端口 8001

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
```bash
cd "<项目目录>"
pip install -r requirements.txt      # fastapi uvicorn jinja2 python-multipart
python -m app.init_db                 # 建表 (idempotent)
uvicorn app.main:app --port 8001      # 注意端口可能需要换
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
- [ ] 代码 review (Task 13): 见下节
- [ ] 后续功能 (spec 注释): PDF 预览 / Excel / 登录 / 自动推送 / 删除编辑

## 14. 代码 review 记录 (Task 13)
- **handoff 不一致**: ✅ 已修 (Task 12 状态、测试数据条数、待办勾选、requirements.txt)
- **app.js `deptClass` 硬编码 `['3PO', 'CNN', 'OC']`**: ✅ 已改为 `state.departments.includes(d)`, 加部门只改 config + README
- **CSS `transition: all`**: ✅ 4 处全部细化为具体属性 (`background-color`/`border-color`/`box-shadow`/`transform`)
- **CSS hover `box-shadow` blur 8**: paint 微开销; 接受
- **app.js `selectedReportId` 被部门筛选过滤后视觉丢失**: ✅ 已修 — 切筛选时若选中项被过滤, 自动选中第一条可见; 若无可见, 清空预览
- **`/api/departments` 双调用风险**: 当前只在 initUploadUI 调一次, state.departments 复用, 无重复
- **SQLite 每查开连接**: 量级小可接受; 高并发再换连接池

## 15. UI 变更记录
- **v1 骨架**: 三栏 320/1fr/1.6fr, 用户反映右栏偏窄
- **v2 品牌风**: 改为 280/320/1fr, 金拱 SVG + 部门徽章配色; 用户感觉变慢 (实测是 curl 假象, 服务端 1-3ms)
- **v3 真实 logo + 改名**: 头部用真实 mcdonalds.svg, 标题 "IT-traffic 图书馆", 副标题 "Daily Report Archive"
- **v4 单行 toolbar**: 三栏改顶部单行 toolbar (日历/上传/列表), iframe 占满下方
