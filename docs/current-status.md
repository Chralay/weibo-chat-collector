# 当前状态与下一步

更新时间：2026-06-14

## 项目位置

```text
D:\codex\weibo-chat-collector
```

## 当前做到哪一步

目前已经推进到第八步：网页版微博页面快照采集第一版。

已完成内容：

- 第 0 步：确认项目边界。
- 第 1 步：初始化项目骨架。
- 第 2 步：实现 JSON/CSV 手动导入。
- 第 3 步：实现消息列表、搜索接口和前端检索页面。
- 第 4 步：实现批量软删除核心功能。
- 第 4 步增强：实现回收站 / 已删除消息。
- 第 5 步：实现时间段采集任务框架。
- 第 6 步：实现微博实机验证记录、脱敏观察记录和采集适配器骨架。
- 第 7 步：实现一个账号 + 一个群聊的本地文件采集闭环。
- 第 8 步：实现网页版微博当前页面可见文本快照采集。

## 已完成的能力

### 1. 项目骨架

已建立目录：

```text
backend/
frontend/
data/
  attachments/
  imports/
docs/
scripts/
```

### 2. 数据库基础表

已创建 SQLite 数据库：

```text
data/weibo_chat_collector.sqlite3
```

已建表：

- `weibo_accounts`
- `chat_groups`
- `chat_users`
- `group_members`
- `messages`
- `attachments`
- `collection_jobs`
- `weibo_verification_reports`
- `weibo_interface_observations`
- `browser_page_captures`
- `deletion_jobs`
- `import_batches`
- `search_indexes`

### 3. 手动导入

已实现：

- JSON 导入。
- CSV 导入。
- 自动创建账号。
- 自动创建群聊。
- 自动创建用户。
- 自动维护群成员。
- 红包消息过滤。
- 重复消息去重。
- 消息入库。
- 附件记录入库。
- 本地附件原件复制逻辑。

相关文件：

```text
backend/app/importer.py
scripts/import_messages.py
docs/import-format.md
data/imports/sample-import.json
data/imports/sample-import.csv
```

### 4. 当前验证结果

当前数据库包含样例验证数据：

- 消息：4 条。
- 附件：2 条。
- 导入批次：4 条。

这些数据来自 JSON/CSV 样例导入和重复导入去重测试。

### 5. 消息列表和搜索

已实现后端接口：

- `GET /api/filter-options`
- `GET /api/messages`
- `GET /api/messages/{message_id}`
- `POST /api/messages/delete-preview`
- `POST /api/messages/soft-delete`
- `POST /api/messages/restore-preview`
- `POST /api/messages/restore`
- `POST /api/messages/hard-delete-preview`
- `POST /api/messages/hard-delete`

已实现前端页面：

- 消息列表。
- 消息详情。
- 按日期分组展示。
- 游标分页加载更早消息。
- 账号筛选。
- 群聊筛选。
- 用户筛选。
- 日期范围筛选。
- 关键词搜索。
- 消息类型筛选。
- 是否包含附件筛选。
- 当前搜索结果删除预览。
- 二次确认批量软删除。
- 消息 / 回收站视图切换。
- 查看已删除消息。
- 批量恢复已删除消息。
- 批量彻底删除已删除消息。

相关文件：

```text
backend/app/api/messages.py
frontend/src/main.tsx
frontend/src/styles.css
docs/message-api.md
docs/recycle-bin.md
```

### 6. 大量消息展示

已实现适合每天 999+ 条消息的基础展示策略：

- 默认每页加载 100 条。
- 服务端游标分页，不依赖大 offset 翻页。
- 前端按日期分组。
- 日期标题吸顶。
- 点击“加载更早消息”继续追加下一页。

游标字段：

- `before_sent_at`
- `before_id`

### 7. 本地联调状态

第四步已在工作区临时库上完成验证：

- 后端依赖已安装到 `D:\codex\weibo-chat-collector\.venv`。
- 前端依赖已安装到 `D:\codex\weibo-chat-collector\frontend\node_modules`。
- 后端编译检查通过。
- 前端生产构建通过。
- 后端 HTTP 接口验证通过。
- 游标分页逻辑验证通过。
- 删除预览逻辑验证通过。
- 软删除逻辑在临时数据库验证通过。
- 回收站查询逻辑验证通过。
- 恢复逻辑在临时数据库验证通过。
- 彻底删除逻辑在临时数据库验证通过。

已验证接口结果：

- `GET /api/messages?limit=5` 返回总数 `4`。
- `GET /api/messages?keyword=Sample` 返回总数 `2`。
- `GET /api/messages?has_attachment=true` 返回总数 `2`。
- 临时库 `keyword=Sample` 删除预览 `2` 条。
- 临时库软删除后 `keyword=Sample` 剩余 `0` 条。
- 临时库软删除后回收站 `keyword=Sample` 为 `2` 条。
- 临时库恢复后普通列表 `keyword=Sample` 为 `2` 条。
- 临时库彻底删除后回收站 `keyword=Sample` 为 `0` 条。

### 8. 时间段采集任务

已实现后端接口：

- `GET /api/collection-jobs`
- `POST /api/collection-jobs`
- `GET /api/collection-jobs/{job_id}`
- `PATCH /api/collection-jobs/{job_id}/status`
- `GET /api/import-files`
- `POST /api/collection-jobs/single-group-file`

已实现前端页面：

- 顶部“采集任务”视图。
- 账号选择。
- 群聊选择。
- 开始/结束时间选择。
- 创建采集任务。
- 选择 `data/imports` 下的 JSON/CSV 采集文件。
- 执行一个账号 + 一个群聊的文件采集。
- 按状态筛选任务列表。
- 任务卡片展示。

相关文件：

```text
backend/app/api/collection_jobs.py
backend/app/api/single_group_collection.py
backend/app/collectors/local_file.py
frontend/src/main.tsx
frontend/src/styles.css
docs/collection-jobs.md
docs/single-group-collection.md
```

已在临时数据库验证：

- 创建任务成功。
- 任务默认状态为 `pending`。
- 任务列表总数增加 1。
- 任务详情可读取。
- 状态可更新为 `running` 和 `completed`。
- 单群聊样例文件采集成功。
- 样例 3 条消息中入库 2 条，红包过滤 1 条，附件记录 1 条。

### 9. 微博实机验证记录

已实现后端接口：

- `GET /api/weibo-verifications`
- `POST /api/weibo-verifications`
- `GET /api/weibo-verifications/{report_id}`
- `PATCH /api/weibo-verifications/{report_id}`
- `POST /api/weibo-verifications/{report_id}/observations`

已实现前端页面：

- 顶部“微博验证”视图。
- 创建账号 + 群聊维度的验证记录。
- 勾选登录、群聊可见、历史可见、分页、图片、文件、链接、红包特征和风控观察。
- 保存核验天数、风险级别、验证状态和备注。
- 添加脱敏接口 / 页面观察 JSON。
- 查看已有观察记录。

已新增采集器骨架：

```text
backend/app/collectors/base.py
backend/app/collectors/weibo_placeholder.py
```

已新增数据库迁移脚本：

```text
scripts/migrate_db.py
```

已在临时数据库验证：

- 创建微博验证记录成功。
- 保存验证结论成功。
- 添加脱敏观察成功。
- Cookie、Token、Authorization 等敏感字段拦截成功。

相关文件：

```text
backend/app/api/weibo_verifications.py
frontend/src/main.tsx
frontend/src/styles.css
docs/weibo-verification.md
```

### 10. 网页版微博页面快照

已实现后端接口：

- `GET /api/browser-capture/snippet`
- `POST /api/browser-captures`
- `GET /api/browser-captures`

已实现前端页面：

- 在“采集任务”视图生成网页快照脚本。
- 复制网页快照脚本。
- 查看最近网页快照。

已新增脚本：

```text
scripts/configure_first_target.py
```

当前第一个目标配置为：

- 账号：`微博账号A`
- 群聊：`汉语从句研究会`
- 时间段：`2026-06-15 17:00:00` 到当前时间。

相关文件：

```text
backend/app/api/browser_captures.py
frontend/src/main.tsx
frontend/src/styles.css
docs/browser-capture.md
```

已在临时数据库验证：

- 网页快照脚本生成成功。
- 模拟网页快照保存成功。
- 快照列表读取成功。

当前启动地址：

```text
后端：http://127.0.0.1:8000
前端：http://127.0.0.1:5173
```

## 还没完成的内容

以下内容尚未完成：

- 微博真实自动采集适配器。
- 真实微博账号和真实群聊名称替换。
- 网页快照解析为正式消息。
- 图片和文件从微博侧自动下载。
- 统计仪表盘。
- 上下文查看。
- 导出和备份。

## 接下来要做什么

下一步建议继续第八步：运行第一条真实网页版微博快照，并基于快照做字段解析。

目标是先让你在已打开的网页版微博群聊页面运行本地快照脚本，把当前可见消息文本保存到本地数据库，然后根据真实快照确认字段映射和附件保存方式。

### 第八步需要确认的内容

- 前端是否能生成网页快照脚本。
- 微博页面运行脚本后是否成功保存快照。
- 快照中的文本块是否包含目标群聊消息。
- 消息 ID、发送人、发送时间、正文、消息类型字段如何映射。
- 图片、文件、链接字段如何映射到 `attachments`。
- 红包消息识别规则如何映射为过滤条件。
- 如何将快照解析结果写入正式 `messages` 和 `attachments`。

数据库：

- 继续使用现有 `messages`、`attachments`、`weibo_accounts`、`chat_groups`、`chat_users` 表。
- 先用普通 SQL 搜索。
- 后续数据量大时再启用全文搜索索引。

## 技术栈

### 前端

当前采用：

- React。
- TypeScript。
- Vite。
- lucide-react 图标库。
- 原生 CSS。

当前前端位置：

```text
frontend/
```

当前前端已接入消息列表、筛选项和消息详情 API。

当前 Node 安装路径：

```text
D:\Dev\node
```

### 后端

当前采用：

- Python。
- FastAPI。
- Uvicorn。
- pydantic-settings。
- Python 标准库 `sqlite3`。

当前后端位置：

```text
backend/
```

当前已有健康检查、筛选项、消息列表和消息详情接口。

当前 Python 安装路径：

```text
D:\Dev\Python
```

### 数据库

当前采用：

- SQLite。

数据库文件：

```text
data/weibo_chat_collector.sqlite3
```

选择 SQLite 的原因：

- 适合本地项目起步。
- 不需要额外安装数据库服务。
- 方便备份和迁移。
- 后续数据量变大时可以迁移到 PostgreSQL。

### 脚本

当前采用 Python 标准库实现：

- 数据库初始化。
- 数据库检查。
- JSON/CSV 手动导入。

脚本位置：

```text
scripts/
```

## 当前推荐动作

下一步继续第八步：在“采集任务”页选择 `微博账号A`、`汉语从句研究会`、时间段 `2026-06-15 17:00:00` 到当前时间，生成并复制网页快照脚本，然后在已打开的微博群聊页面控制台运行。不要提供账号密码、Cookie 或 Token。
