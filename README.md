# Weibo Chat Collector

微博群聊聊天记录归档与检索工具。

## 当前需求版本

本项目用于把两个微博账号各自对应的微博群聊记录收集到同一个本地数据库中。采集范围不再限定指定用户，而是记录群聊中所有用户的发言和可保存的附件内容；红包等无整理价值或不需要保存的系统/交易类消息需要过滤。

采集方式也从“每天自动收集”调整为“用户选择一个时间段后，系统自动收集该时间段内的群聊消息”。后续可以再增加定时任务，但首版不以每天自动任务为核心。

## 核心目标

- 支持两个微博账号。
- 每个微博账号可绑定一个或多个微博群聊，当前预期是两个账号分别对应两个群聊。
- 两个账号、两个群聊的数据统一存入同一个数据库。
- 数据库中必须保留账号维度和群聊维度，避免不同账号、不同群聊的数据混在一起。
- 记录所有用户发言，不只记录指定用户。
- 过滤红包类消息。
- 支持按用户选择的时间段自动收集历史群聊消息。
- 支持保存文字、图片、文件、链接等消息内容。
- 支持搜索、筛选、查看详情。
- 支持批量删除聊天记录。

## 优先级调整

首版优先：

- 多微博账号配置。
- 群聊配置。
- 时间段采集。
- 全员消息归档。
- 图片、文件、链接附件入库。
- 搜索和基础筛选。
- 批量删除。

后续再做：

- 上下文查看。
- 统计仪表盘。
- 采集日志、导出、备份等增强功能。

已取消：

- 手动补充上下文表单。
- 只采集指定用户发言。
- 固定每天自动采集。

## 第 8 点可行性结论

“两个微博号、两个微博群聊、分别获取并放在同一个数据库中”在系统设计上可以满足。

真正需要确认的是微博侧数据获取方式：

- 如果微博提供可用的官方接口、导出能力或授权方式，项目可以按合规接口实现。
- 如果没有官方群聊历史接口，则只能做手动导入、半自动浏览器辅助采集或其他用户授权下的本地采集适配器。
- 自动化访问微博页面和批量抓取内容存在平台规则风险，必须避免绕过登录、安全验证、权限控制或高频请求。
- 首版建议先设计数据结构和导入流程，同时预留采集适配器接口；等实机验证后再确定最终采集方式。

详细说明见 [docs/feasibility-and-boundaries.md](docs/feasibility-and-boundaries.md)。

## 文档目录

- [docs/requirements.md](docs/requirements.md)：重规划后的需求清单。
- [docs/data-model.md](docs/data-model.md)：支持多账号、多群聊、附件和批量删除的数据模型。
- [docs/todo.md](docs/todo.md)：新版开发待办。
- [docs/feasibility-and-boundaries.md](docs/feasibility-and-boundaries.md)：微博数据获取方式与边界确认。
- [docs/implementation-plan.md](docs/implementation-plan.md)：从 0 到完成的实施步骤。
- [docs/project-decisions.md](docs/project-decisions.md)：当前已确认的项目决策。
- [docs/current-status.md](docs/current-status.md)：当前做到哪一步、下一步做什么、技术栈说明。
- [docs/handoff.md](docs/handoff.md)：跨会话继续项目的交接说明和提示词。
- [docs/run-and-debug.md](docs/run-and-debug.md)：如何启动前后端、何时开始调试、微博侧需要准备哪些信息。
- [docs/step-3-integration.md](docs/step-3-integration.md)：第三步消息列表和搜索完成后的前后端联调流程。
- [docs/message-api.md](docs/message-api.md)：消息列表、详情和筛选项 API 说明。
- [docs/recycle-bin.md](docs/recycle-bin.md)：回收站、恢复和彻底删除说明。
- [docs/collection-jobs.md](docs/collection-jobs.md)：时间段采集任务框架说明。
- [docs/weibo-verification.md](docs/weibo-verification.md)：微博实机验证记录和采集适配器准备说明。
- [docs/single-group-collection.md](docs/single-group-collection.md)：单群聊文件采集说明。
- [docs/browser-capture.md](docs/browser-capture.md)：网页版微博页面快照采集说明。
- [docs/import-format.md](docs/import-format.md)：JSON/CSV 手动导入格式。
- [docs/screenshot-analysis.md](docs/screenshot-analysis.md)：附件截图分析。

## 当前项目结构

```text
weibo-chat-collector/
  backend/              # FastAPI 后端
  frontend/             # React + Vite 前端
  data/
    attachments/        # 图片和文件原件保存目录
    imports/            # 手动导入文件目录
  docs/                 # 需求和实施文档
  scripts/              # 数据库初始化和维护脚本
```

## 初始化数据库

如果本机有 Python：

```powershell
python .\scripts\init_db.py --seed-placeholders
```

如果使用 Codex 桌面自带 Python，可按实际路径运行：

```powershell
& 'C:\Users\SethJ\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\init_db.py --seed-placeholders
```

检查数据库：

```powershell
python .\scripts\inspect_db.py
```

## 手动导入消息

JSON 示例：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.json
```

CSV 示例：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.csv
```

导入时会自动创建账号、群聊、用户和群成员，跳过红包消息，并对重复消息去重。

## 后端开发

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

健康检查地址：

```text
http://127.0.0.1:8000/health
```

## 前端开发

```powershell
cd frontend
npm install
npm run dev
```
