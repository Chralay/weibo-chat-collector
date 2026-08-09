# Weibo Chat Collector

微博群聊消息的本地采集、归档、检索和管理工具。当前主线方案保留 collector 项目的多账号、群聊配置、SQLite 落库、搜索和删除能力，并使用微博 Web 端内部 JSON 接口代替网页 DOM 作为主要采集来源。

## 当前架构

`weibo-chat-collector` 是主项目，负责：

- 管理多个微博账号及其群聊。
- 按用户指定的开始、结束时间采集消息。
- 将所有账号、群聊的消息统一写入同一个 SQLite 数据库，同时保留账号和群聊维度。
- 过滤红包消息，去重，并保存可识别的图片、链接、视频等附件记录。
- 提供消息检索、筛选、详情、软删除、回收站和批量删除。
- 保留 JSON/CSV 文件导入作为备用采集方式。

`weibo-chat-auto` 现在只作为初始化辅助工具：

1. 为每个微博账号扫码登录并生成 `cookies.json`。
2. 在该账号打开目标群聊时，帮助找到 `query_messages.json` 请求中的 `id`，即微博群 ID。

auto 的归档、查看器和 AI 分析流程不作为 collector 的数据主链路，也不会与 collector 共用数据库。

```text
auto 扫码登录 -> cookies.json ----+
                                  +-> collector 配置账号/群聊 -> 按时间段调用 API -> SQLite
query_messages 请求 -> 群 ID -----+
```

详细操作见 [docs/weibo-api-collection.md](docs/weibo-api-collection.md)。

## 安全约束

- 每个账号的 Cookie 独立保存为 `data/auth/account-<id>.cookies.json`。
- Cookie 内容不写入数据库；数据库只保存不敏感的登录配置文件名。
- POSIX 系统把 Cookie 目录/文件权限强制设为 `0700`/`0600`，`data/auth/` 已加入 `.gitignore`；Windows 使用当前用户目录继承的 ACL，需确保其他本机用户无权读取项目目录。
- 状态接口只返回文件是否存在、是否包含可发送到 API 域且未在客户端判定过期的非空 `SUB`、Cookie 数量和更新时间，不返回 Cookie 值；服务端登录态是否仍有效由实际 API 请求确认。
- 不要把 `cookies.json`、Cookie、Token、Authorization 或账号密码提交到 Git、聊天记录、Issue 或日志。
- 服务默认只监听 `127.0.0.1`；不要把带有 Cookie 导入能力的本地 API 暴露到公网。

## 运行要求

- Python `>= 3.10`，推荐 Python `3.12`。
- Node.js `>= 18`，用于前端开发服务器。
- 从本项目根目录执行下面的命令；数据库、附件、导入文件和鉴权目录均相对项目根解析，不依赖当前 shell 的其他目录。

### 后端：固定使用 8000 端口

macOS / Linux：

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

如果系统命令是 `python3`，可将第一行的 `python3.12` 替换为 `python3`，但应先确认版本不低于 3.10。Windows 所需的 IANA 时区数据已通过 `backend/requirements.txt` 的条件依赖安装。

Windows PowerShell：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir .\backend --host 127.0.0.1 --port 8000
```

后端启动时会初始化所需数据库表。检查地址：

- 健康检查：<http://127.0.0.1:8000/health>
- API 文档：<http://127.0.0.1:8000/docs>

### 前端：另一个终端

仍从项目根目录执行：

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

打开 <http://127.0.0.1:5173>。Vite 开发服务器会把 `/api` 和 `/health` 统一代理到 `http://127.0.0.1:8000`，因此无需修改前端 API 地址。

## 首次配置与采集

对每个微博账号分别执行以下流程：

1. 在相邻的 `weibo-chat-auto` 项目中扫码登录，取得该账号的 `cookies.json`。
2. 打开目标群聊，从 `query_messages.json` 网络请求的查询参数 `id` 取得群 ID。
3. 在 collector 的“采集任务”页填写账号显示名称、群聊名称和微博群 ID，点击“保存账号与群 ID”。
4. 确认当前选择的是对应账号，然后导入该账号的 `cookies.json`。
5. 选择开始时间和结束时间，点击“开始 API 采集”。
6. 在采集任务列表确认结果，再到消息页检索入库记录。

第二个账号必须重新扫码并把新生成的 `cookies.json` 导入到第二个 collector 账号，不能复用第一个账号的 Cookie 文件。

## API 采集行为

主入口是：

```text
POST /api/collection-jobs/weibo-api
```

请求体示例：

```json
{
  "account_id": 1,
  "group_id": 1,
  "range_start": "2026-08-01 00:00:00",
  "range_end": "2026-08-01 23:59:59"
}
```

- `range_start` 必须早于 `range_end`。
- 服务从新消息向旧消息分页，覆盖开始边界后停止，只入库 `range_start <= sent_at <= range_end` 的消息。
- 如果页数上限耗尽但仍未覆盖开始边界，任务会失败，不会把不完整结果伪装成成功。
- 超时、HTTP `429` 和 `5xx` 使用有上限的退避重试；默认额外重试 2 次，即最多尝试 3 次。
- 登录失效、群不可访问、限流、响应异常、分页异常和网络失败都会明确返回错误。已经创建的任务会标记为 `failed` 并记录错误信息，不静默跳过。
- 同一账号同一时间只允许一个 API 采集任务运行。

可通过项目根目录的 `.env` 调整页大小、最大页数、页间延迟、超时和重试参数，示例见 [.env.example](.env.example)。

## 备用采集方式

- JSON/CSV 文件导入继续保留，可在“采集任务”页的“备用：文件导入”中使用，也可运行 `scripts/import_messages.py`。
- 网页快照相关历史代码和数据继续保留用于研究；当前后端 CORS 只允许本地前端来源，加上浏览器 Private Network Access 和页面安全策略已收紧，从微博页面跨域回传本机快照不再作为推荐主流程。

## 重要限制

collector 当前调用的是从微博 Web 客户端行为中观察到的内部接口：

```text
https://api.weibo.com/webim/groupchat/query_messages.json
```

它不是公开、受支持或保证稳定的官方 API，字段、鉴权、分页方式和可用性都可能在没有通知的情况下改变。使用时应遵守微博服务条款、账号权限和适用法律，控制请求频率，并仅采集有权访问的数据。

当前实现已有本地自动化测试，但尚未声称已用真实微博账号完成端到端 API 验证。尤其是图片、文件、链接、视频等附件字段仍需用真实且脱敏的响应确认；现阶段主要保存从已知字段映射出的附件 URL/元数据，不代表附件原件已成功下载。

## 文档

- [docs/weibo-api-collection.md](docs/weibo-api-collection.md)：API 采集架构、安全约束和完整操作流程。
- [docs/current-status.md](docs/current-status.md)：当前完成度、验证边界和下一步。
- [docs/import-format.md](docs/import-format.md)：JSON/CSV 手动导入格式。
- [docs/message-api.md](docs/message-api.md)：消息列表、详情和筛选接口。
- [docs/collection-jobs.md](docs/collection-jobs.md)：通用采集任务框架。
- [docs/single-group-collection.md](docs/single-group-collection.md)：备用的单群聊文件采集。
- [docs/browser-capture.md](docs/browser-capture.md)：非主流程的网页快照说明。
- [docs/recycle-bin.md](docs/recycle-bin.md)：回收站、恢复和彻底删除。

## 项目结构

```text
weibo-chat-collector/
  backend/              # FastAPI 后端和采集器
  frontend/             # React + Vite 前端
  data/
    auth/               # 按账号隔离的 Cookie，仅本机保存且不进 Git
    attachments/        # 附件原件目录
    imports/            # JSON/CSV 备用导入目录
    weibo_chat_collector.sqlite3
  docs/
  scripts/
```
