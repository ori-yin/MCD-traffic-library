# Plan: 麦当劳日报归档平台 (Phase 2)

> 基于 spec.md。本文定义技术实现方案、组件依赖、实现顺序、风险对策。
> 人审通过后进 Phase 3 (Tasks) 出 todo.md。

## 1. 组件清单 + 依赖关系

| 组件 | 职责 | 依赖 |
|---|---|---|
| app/config.py | 部门列表 `DEPARTMENTS=["3PO","CNN","OC"]` (占位) | - |
| app/models.py | 建表 SQL (reports 表) | - |
| app/db.py | SQLite 连接 + 参数化查询封装 | models.py |
| app/storage.py | 文件路径分层(年/月/日) + `<title>` 提取 + 文件名生成 | - |
| app/main.py | FastAPI app, 路由, 挂静态/模板 | db.py, storage.py, config.py |
| app/templates/index.html | 单页(日历+列表+预览+上传) | main.py 路由 |
| app/static/style.css | 样式 | - |
| app/static/app.js | 前端交互(日历/筛选/拖拽) | index.html |
| app/init_db.py | 建表脚本 `python -m app.init_db` | models.py |
| data/reports/ | HTML 文件存储 | - |
| data/archive.db | SQLite | - |

无循环依赖。db/storage/config 是叶子, main 依赖它们, 模板/静态依赖 main。

## 2. 实现顺序 (串行为主, 每步可跑可验)

| 步 | 内容 | 涉及组件 | 验证 |
|---|---|---|---|
| 1 | 骨架跑起来 | config.py, main.py, 空白 index.html | uvicorn 起, 浏览器打开见空壳 |
| 2 | 数据层 | models.py, db.py, init_db.py | 建表成功, 查询函数可调 |
| 3 | 日历接口 + 左侧日历 | db 加查询, main `/api/calendar`, app.js 日历 | 切月、有日报日期高亮 |
| 4 | 当天清单 | main `/api/reports` + `/api/latest`, app.js 列表 | 点某天列出各部门日报 |
| 5 | 渲染 | main `/report/glm_5.2_ark_toC`, index.html iframe | 点某份出 HTML + Plotly |
| 6 | 拖拽上传 | main `/api/upload`, storage.py, app.js 拖拽 | 传完刷新可见, title 提取 |
| 7 | 筛选 + 默认最新 | app.js 部门下拉 + 首页默认最新一天 | 部门筛选生效, 打开定位最新 |

前端三件套 (index/style/app.js) 接口定后可与后端并行细化, MVP 串行也快。

## 3. 风险 + 对策

| 风险 | 对策 |
|---|---|
| Plotly CDN 内网不通 | 先裸 iframe 渲染试; 不通则 `static/` 放 `plotly.min.js` + 入库改写引用 (备选, 不现在做) |
| OneDrive 同步吞 `.git` | MVP 不用 git; 要用时注意或移出 OneDrive |
| 上传文件名冲突/特殊字符 | storage.py 用 `{部门}_{时间戳}.html` 重命名, 避免冲突 |
| SQLite 并发写 | 单人小规模无碍; 后续多人高频再换 |
| 中文路径 | UTF-8, 路径用引号 |

## 4. 并行 vs 串行
- MVP 小, 基本串行 (上表顺序)
- 前端三件套接口定后可并行打磨, 串行也不慢

## 5. 验证检查点
每步完成后: uvicorn 起服务, 浏览器手动验对应「验证」列, 通过再做下一步。

## 待定 (不阻塞)
- 部门完整名单: 先用 3PO/CNN/OC 占位, 后续 config.py 加
