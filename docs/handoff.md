# 跨会话交接说明

这个文件用于在当前会话额度用完、会话中断或换新会话后，让新的 Codex 会话可以继续推进项目。

## 项目路径

```text
D:\codex\weibo-chat-collector
```

## 新会话开始时先读这些文件

建议按顺序读取：

1. `README.md`
2. `docs/current-status.md`
3. `docs/implementation-plan.md`
4. `docs/todo.md`
5. `docs/import-format.md`
6. `docs/data-model.md`
7. `docs/weibo-verification.md`
8. `docs/single-group-collection.md`
9. `docs/browser-capture.md`

如果只想快速接上进度，优先读：

```text
docs/current-status.md
docs/handoff.md
```

## 当前进度摘要

目前项目已推进到第八步：

- 第 0 步：确认项目边界。
- 第 1 步：初始化项目骨架。
- 第 2 步：实现 JSON/CSV 手动导入。
- 第 3 步：实现消息列表、搜索接口和前端检索页面。
- 第 4 步：实现批量软删除核心功能。
- 第 4 步增强：实现回收站 / 已删除消息。
- 第 5 步：实现时间段采集任务框架。
- 第 6 步：实现微博实机验证记录、脱敏观察记录和采集适配器骨架。
- 第 7 步：实现一个账号 + 一个群聊的本地文件采集闭环。
- 第 8 步：实现网页版微博当前页面可见文本快照采集第一版。

当前已实现：

- FastAPI 后端骨架。
- React + Vite 前端骨架。
- SQLite 数据库。
- 数据库初始化脚本。
- 数据库检查脚本。
- JSON/CSV 导入脚本。
- 红包过滤。
- 消息去重。
- 附件记录入库。
- 消息列表 API。
- 消息详情 API。
- 筛选项 API。
- 前端消息检索页面。
- 游标分页加载更早消息。
- 按日期分组展示消息。
- 删除预览 API。
- 批量软删除 API。
- 回收站视图。
- 已删除消息查询。
- 恢复预览 API。
- 批量恢复 API。
- 彻底删除预览 API。
- 批量彻底删除 API。
- 采集任务创建 API。
- 采集任务列表 API。
- 采集任务详情 API。
- 采集任务状态更新占位 API。
- 前端采集任务视图。
- 微博验证记录 API。
- 微博脱敏观察 API。
- 敏感字段拦截，避免保存 Cookie、Token、Authorization 等字段。
- 前端“微博验证”视图。
- 采集器抽象接口和微博占位采集器。
- 数据库迁移脚本 `scripts/migrate_db.py`。
- 单群聊文件采集 API。
- `data/imports` 文件列表 API。
- 前端“采集任务”视图中的采集文件选择和执行文件采集按钮。
- 单群聊样例文件 `data/imports/single-group-sample.json`。
- 网页快照脚本生成 API。
- 网页快照接收 API。
- 前端“采集任务”页的网页快照脚本生成和复制入口。
- 第一个目标配置脚本 `scripts/configure_first_target.py`。

当前数据库中有样例验证数据：

- 消息：4 条。
- 附件：2 条。

## 下一步任务

下一步是继续第八步：运行第一条真实网页版微博快照，并基于快照做字段解析。

需要实现：

- 让用户在“采集任务”页选择 `微博账号A`、`汉语从句研究会` 和时间段。
- 生成并复制网页快照脚本。
- 用户在已打开的网页版微博群聊页面 Console 运行脚本。
- 确认 `browser_page_captures` 出现真实快照。
- 基于真实快照解析消息时间、发言人、正文、图片、文件和链接。
- 将解析结果写入 `messages` 和 `attachments`。

## 技术栈

前端：

- React。
- TypeScript。
- Vite。
- lucide-react。
- 原生 CSS。

后端：

- Python。
- FastAPI。
- Uvicorn。
- pydantic-settings。
- Python 标准库 `sqlite3`。

数据库：

- SQLite。
- 数据库文件：`data/weibo_chat_collector.sqlite3`。

## 常用命令

初始化数据库：

```powershell
python .\scripts\init_db.py --seed-placeholders
```

检查数据库：

```powershell
python .\scripts\inspect_db.py
```

导入 JSON：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.json
```

导入 CSV：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.csv
```

如果本机没有 `python` 命令，可使用 Codex 桌面 bundled Python。当前已验证可用路径：

```powershell
& 'C:\Users\SethJ\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\inspect_db.py
```

## 给新会话的提示词

可以在新会话中直接发送：

```text
请继续 D:\codex\weibo-chat-collector 这个项目。先读取 README.md、docs/current-status.md 和 docs/handoff.md，确认当前进度后继续第八步：运行第一条真实网页版微博快照，并基于快照做字段解析。项目技术栈是 FastAPI + SQLite + React/Vite。注意不要重建项目，不要删除已有数据库和文档，继续在现有结构上开发。
```

如果要继续最新进度，可以在新会话中直接发送：

```text
请继续 D:\codex\weibo-chat-collector 这个项目。先读取 README.md、docs/current-status.md、docs/handoff.md、docs/weibo-verification.md、docs/single-group-collection.md 和 docs/browser-capture.md，确认当前已推进到第八步后，继续运行第一条真实网页版微博快照并做字段解析。不要重建项目，不要删除已有数据库，不要要求我提供 Cookie、Token 或账号密码。
```

如果新会话只需要了解状态，可以发送：

```text
请读取 D:\codex\weibo-chat-collector\docs\current-status.md 和 D:\codex\weibo-chat-collector\docs\handoff.md，告诉我当前项目做到哪一步、下一步应该做什么。
```

## 协作注意事项

- 不要从零重建项目。
- 不要删除 `data/weibo_chat_collector.sqlite3`，除非明确要重置样例数据。
- 不要直接写死微博采集器；下一步先用网页版微博页面快照整理脱敏字段映射。
- 批量删除默认做软删除。
- 图片和文件最终需要保存原件。
- 真实微博账号和群聊名称尚未写入，当前仍使用 `account_a/account_b` 和 `group_a/group_b` 占位。
