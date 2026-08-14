# Todo: 麦当劳日报归档平台 (Phase 3)

> 基于 plan.md。每个任务单 session 可完成, 改动 ≤5 文件, 带验收 + 验证。
> 按依赖排序, 一部分一部分做, 每完成一个给你验, 通过再做下一个。

## Step 1: 骨架跑起来

- [x] **Task 1: 项目骨架 + 依赖 + config**
  - Acceptance: 目录(app/templates/static/data/reports)就位; `app` 可 import; 依赖装好; config 含部门占位
  - Verify: `pip install -r requirements.txt`; `python -c "from app import config; print(config.DEPARTMENTS)"`
  - Files: app/__init__.py, app/config.py, requirements.txt

- [x] **Task 2: FastAPI 空壳 + 空白首页**
  - Acceptance: uvicorn 起, 浏览器打开 `localhost:8000` 见空壳页
  - Verify: `uvicorn app.main:app --reload --port 8000`; 浏览器访问
  - Files: app/main.py, app/templates/index.html

## Step 2: 数据层

- [ ] **Task 3: 建表 + DB 封装 + init_db**
  - Acceptance: `init_db` 建出 `archive.db`; 查询函数(insert/query_reports/query_calendar/query_latest)可调
  - Verify: `python -m app.init_db`; 手动调一个查询看返回
  - Files: app/models.py, app/db.py, app/init_db.py

## Step 3: 日历接口 + 左侧日历

- [ ] **Task 4: 日历接口**
  - Acceptance: `GET /api/calendar?month=2026-08` 返回 `{date: count}`
  - Verify: `curl "localhost:8000/api/calendar?month=2026-08"`
  - Files: app/main.py, app/db.py

- [ ] **Task 5: 左侧日历 UI**
  - Acceptance: 左侧显示月历, 可切月, 有日报的日期高亮
  - Verify: 浏览器看日历渲染
  - Files: app/static/app.js, app/static/style.css, app/templates/index.html

## Step 4: 当天清单

- [ ] **Task 6: 清单接口 + latest**
  - Acceptance: `GET /api/reports?date=&department=` 返回当天日报(可按部门筛); `GET /api/latest` 返回最新日期
  - Verify: curl 两个接口
  - Files: app/main.py, app/db.py

- [ ] **Task 7: 中栏列表 UI + 默认最新**
  - Acceptance: 点某天列出各部门日报; 打开默认定位最新一天
  - Verify: 浏览器操作
  - Files: app/static/app.js, app/templates/index.html

## Step 5: 渲染

- [ ] **Task 8: 日报 HTML 接口 + iframe**
  - Acceptance: 点某份, 右栏 iframe 渲染 HTML + Plotly 图表正常
  - Verify: 浏览器看图表显示
  - Files: app/main.py, app/templates/index.html, app/static/app.js

## Step 6: 拖拽上传

- [ ] **Task 9: 上传接口 + 存储**
  - Acceptance: `POST /api/upload` 文件落地 `data/reports/年/月/日/`, 入库, title 从 `<title>` 提取; 文件名 `{部门}_{时间戳}.html`
  - Verify: curl 上传一个 HTML; 查 DB + 文件存在
  - Files: app/main.py, app/storage.py

- [ ] **Task 10: 拖拽上传 UI**
  - Acceptance: 拖拽文件 + 选部门/日期, 上传成功, 列表刷新可见
  - Verify: 浏览器拖拽上传
  - Files: app/static/app.js, app/templates/index.html

## Step 7: 筛选

- [ ] **Task 11: 部门筛选 UI**
  - Acceptance: 部门下拉, 选中后列表只显示该部门日报
  - Verify: 浏览器切部门
  - Files: app/static/app.js, app/templates/index.html

## 收尾

- [ ] **Task 12: README + 全流程验证**
  - Acceptance: spec 的 6 条 Success Criteria 全过一遍
  - Verify: 浏览器从打开到上传全流程手动验
  - Files: README.md
