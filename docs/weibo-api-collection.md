# 微博 API 采集指南

更新时间：2026-08-02

## 1. 方案定位

当前方案以 `weibo-chat-collector` 为主系统：账号、群聊、时间范围、采集任务、SQLite 落库、检索、删除和备用文件导入都在 collector 中完成。

相邻的 `weibo-chat-auto` 只承担两项一次性或按需重复的辅助工作：

1. 打开登录窗口，让用户用微博 App 扫码，并生成该账号的 `cookies.json`。
2. 打开目标群聊，通过浏览器网络请求找到 `query_messages.json` 的查询参数 `id`。

这个 `id` 是采集所需的微博群 ID。auto 的消息归档目录、查看器和 AI 分析结果不导入 collector，也不与 collector 共享数据库。

## 2. 数据流

```text
账号 A 在 auto 扫码 -> cookies.json -> collector 账号 A 的独立 Cookie 文件
账号 A 打开群聊甲 -> query_messages?id=123 -> chat_groups.source_group_id = "123"
                                                      |
用户选择 [开始时间, 结束时间] ------------------------+
                                                      v
                          POST /api/collection-jobs/weibo-api
                                                      |
                         分页、严格过滤、去重、红包过滤
                                                      |
                  messages / attachments / collection_jobs
```

账号 B 需要独立扫码、独立导入 Cookie、独立绑定群 ID。即使两个账号看到同名群聊，也通过 `account_id` 分成两个采集来源。

## 3. 运行项目

### 环境要求

- Python `>= 3.10`，推荐 Python `3.12`。
- Node.js `>= 18`。
- collector 后端固定使用 `127.0.0.1:8000`。
- 所有命令从 `weibo-chat-collector` 项目根目录执行。
- Windows 的 IANA 时区数据由 `backend/requirements.txt` 中的条件依赖提供。

### 终端一：后端

macOS / Linux：

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

Windows PowerShell：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir .\backend --host 127.0.0.1 --port 8000
```

### 终端二：前端

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

打开 <http://127.0.0.1:5173>。前端开发服务器把 `/api` 和 `/health` 代理到 `http://127.0.0.1:8000`。

项目设置中的相对路径都以 collector 根目录为基准，例如：

```text
data/weibo_chat_collector.sqlite3
data/auth/
data/attachments/
data/imports/
```

因此不要在文档或 `.env` 中改回某台电脑专用的绝对路径。

## 4. 用 auto 准备每个账号

以下步骤需要对每个微博账号分别执行。

### 4.1 扫码生成 Cookie

进入相邻的 auto 项目并按其说明安装依赖，然后执行：

```bash
cd ../weibo-chat-auto
npm run save-cookies
```

在弹出的独立浏览器中用微博 App 扫码并确认登录。auto 会生成 `cookies.json`。

注意：

- `cookies.json` 等同于当前微博登录凭据，任何能读取它的人都可能在有效期内使用该登录态。
- 不要打开或复制其中的 Cookie 值到聊天、Issue、日志或截图。
- 多账号应一次处理一个：账号 A 生成后先导入 collector 的账号 A，再登录账号 B 并导入账号 B。
- auto 之后再次扫码可能覆盖它自己的 `cookies.json`，但不会覆盖已经按账号导入 collector 的文件。

### 4.2 找到微博群 ID

在扫码登录所用的会话中打开目标群聊，通过浏览器开发者工具的 Network 面板查找：

```text
query_messages.json
```

请求 URL 查询参数中的 `id` 就是该群的源 ID。例如只记录：

```text
id=123456789
```

不要复制完整请求 URL、Cookie 请求头或 Authorization 信息。对每个账号看到的目标群分别确认，不要仅凭群名猜测。

## 5. 在 collector UI 中配置

打开 collector 前端后进入“采集任务”。建议按这个顺序操作：

1. 如果已有目标，先选择账号和属于该账号的群聊；如果没有，直接填写新的账号显示名称和群聊名称。
2. 在“微博群 ID”填写上一步 `query_messages.json` 查询参数中的纯数字 `id`。
3. 点击“保存账号与群 ID”。保存成功后，页面会选中新建或更新后的账号和群聊。
4. 再次核对当前账号，选择该账号在 auto 中生成的 `cookies.json`。
5. 等待“账号登录态已安全导入”提示，并确认就绪区域显示“Cookie 已导入”和“群 ID 已绑定”。
6. 填写开始时间和结束时间。
7. 点击“开始 API 采集”，等待请求完成。
8. 查看结果中的新增、跳过、红包和附件计数，再查看采集任务列表及消息页。

配置第二个账号时必须重新选择或创建第二个账号，再导入第二份 Cookie。不要在账号 A 仍被选中时上传账号 B 的文件，否则会原子替换账号 A 的登录态。

## 6. Cookie 存储规则

UI 会读取 auto 生成的以下任一种 JSON 外形：

- 顶层就是 Puppeteer Cookie 数组。
- 顶层对象包含 `cookies` 数组。

后端接口本身接收：

```text
PUT /api/weibo-api/accounts/{account_id}/cookies
Content-Type: application/json

{"cookies": [Puppeteer Cookie 对象...]}
```

保存时执行以下限制：

- 只接受 `weibo.com` 和 `sina.com.cn` 本域或子域的 Cookie。
- 必须包含可发送到 `api.weibo.com`、未在客户端判定过期的非空 `SUB`，否则拒绝导入，且不会覆盖原有可用文件。
- 每个账号保存到 `data/auth/account-<id>.cookies.json`。
- 使用临时文件写入并原子替换目标文件。
- POSIX 系统强制把目录权限收紧为 `0700`、Cookie 文件设为 `0600`。
- Windows 使用项目目录继承的 ACL；运行前应确认其他本机用户无权读取 `data/auth/`。
- Cookie 内容不会写入 SQLite；`weibo_accounts.login_profile_name` 只保存文件名。
- `data/auth/` 不进入 Git。
- Cookie 值不通过状态 API 或采集 API 返回。

安全状态可通过以下接口查看：

```text
GET /api/weibo-api/status
```

它只报告账号、群聊、Cookie 文件是否存在、是否包含可发送到 API 域且未在客户端判定过期的非空 `SUB`、Cookie 数量和更新时间等非敏感信息。这个检查不代表微博服务端仍接受该登录态，是否可用由实际 API 请求确认。

Cookie 失效后，collector 不会自动扫码刷新。应回到 auto 为对应账号重新扫码，再在 collector 中重新导入。

## 7. 账号与群聊绑定接口

```text
POST /api/weibo-api/targets
```

新建目标的请求示例：

```json
{
  "account_id": null,
  "account_name": "微博账号 A",
  "group_id": null,
  "group_name": "群聊甲",
  "source_group_id": "123456789"
}
```

更新已有目标时传入已有 `account_id` 和 `group_id`。`source_group_id` 必须只包含数字，并写入：

```text
chat_groups.source_group_id
```

系统会阻止以下错误配置：

- 更新不存在的账号或群聊。
- 把不属于当前账号的群聊绑定到当前账号。
- 同一账号下两个群聊使用相同 `source_group_id`。
- 把已经产生消息、任务或其他归档历史且已有群 ID 的本地群改绑到另一个微博群 ID。此时返回 `409`；应新建本地群，避免两个真实群的数据混入同一 `group_id`。

## 8. 执行时间范围采集

```text
POST /api/collection-jobs/weibo-api
```

请求体：

```json
{
  "account_id": 1,
  "group_id": 1,
  "range_start": "2026-08-01 08:00:00",
  "range_end": "2026-08-01 09:00:00"
}
```

### 时间语义

- 接口接受 ISO 风格日期时间；UI 会提交本地 `datetime-local` 值。
- 没有时区偏移的时间按 `WEIBO_API_TIMEZONE` 解释，默认 `Asia/Shanghai`。
- 开始时间必须严格早于结束时间。
- 消息入选条件是闭区间：`range_start <= sent_at <= range_end`。
- 采集器从新向旧分页；即使某页最旧消息恰好等于开始时间，仍继续一页，以免遗漏同一秒的其他消息。
- 只有确认已经翻过开始边界，或服务端返回历史终点，才认为范围覆盖完整。
- 达到 `WEIBO_API_MAX_PAGES` 仍未覆盖开始边界时，整个任务失败，不会将部分候选消息入库后伪装成成功。

### 分页和去重

- 首次请求使用 `max_mid=0`，后续使用当前页最旧消息 ID 作为游标。
- 接受页内按时间升序或降序，但拒绝页内乱序以及分页向更新消息移动。
- 跨页重复 ID 和重复游标会被识别，避免重复入库或无限循环。
- 最终候选消息按时间和消息 ID 排序后写入现有数据库。
- 入库层仍使用 `account_id + group_id + source_message_id` 等规则检查历史重复消息。

### 重试和失败

默认设置见项目根目录 [.env.example](../.env.example)：

```text
WEIBO_API_PAGE_SIZE=20
WEIBO_API_MAX_PAGES=500
WEIBO_API_PAGE_DELAY_SECONDS=0.3
WEIBO_API_REQUEST_TIMEOUT_SECONDS=30
WEIBO_API_MAX_RETRIES=2
WEIBO_API_RETRY_BASE_SECONDS=1
```

`WEIBO_API_MAX_RETRIES=2` 表示首次请求之外最多重试 2 次，即总尝试次数最多 3 次。

- 超时：指数退避后重试；耗尽后明确失败。
- HTTP `429`：优先遵守 `Retry-After`，否则退避；耗尽后返回限流失败。
- HTTP `5xx`：退避后重试；耗尽后失败。
- 登录失效、群不可访问、其他 `4xx`、无法解析的 JSON、未知业务错误和分页异常不会被静默忽略。

采集开始后会先创建 `running` 任务。后续任何异常都会把该任务更新为 `failed`、写入结束时间和错误信息，并在 HTTP 响应中返回错误。目标、时间或 Cookie 在启动前校验失败时会直接返回 `4xx`，不会创建一个假的运行任务。

常见响应状态：

| 状态 | 含义 |
| --- | --- |
| `400` | 时间范围、账号/群关系、群 ID 或 Cookie 配置无效 |
| `401` | 微博登录态失效 |
| `404` | collector 目标不存在，或微博群不存在/当前账号无权访问 |
| `409` | 同一账号已有 API 采集正在运行，或目标绑定冲突 |
| `429` | 微博侧限流且重试耗尽 |
| `502` | 微博内部接口的 HTTP、响应、网络或分页错误 |
| `500` | 未预期的本地处理错误 |

## 9. 入库内容

API 候选消息复用 collector 已有入库流程：

- 账号：`weibo_accounts`。
- 群聊和源群 ID：`chat_groups`、`chat_groups.source_group_id`。
- 发送人和群成员：`chat_users`、`group_members`。
- 正文、消息 ID、时间和保留的原始响应：`messages`。
- 可映射的图片、链接、视频等 URL/元数据：`attachments`。
- 本次执行状态与计数：`collection_jobs`，采集器类型为 `weibo_api_v1`。

红包消息不写入 `messages`，重复消息跳过并进入任务计数。

## 10. 备用方式和旧网页快照

JSON/CSV 文件导入仍是正式保留的备用能力：

- UI：“采集任务” -> “备用：文件导入”。
- 文件目录：`data/imports/`。
- 接口：`POST /api/collection-jobs/single-group-file`。
- 命令行：`scripts/import_messages.py`。

网页快照接口、历史代码和记录仍保留用于排查页面结构或研究字段，但它们不再是主采集入口。当前后端 CORS 只允许本地前端来源；现代浏览器对跨站页面访问本机 HTTP 服务的 Private Network Access 和内容安全策略限制也更严格，因此从微博页面控制台直接回传本机快照不再是受支持的常规流程。

## 11. 尚待真实验证

当前 API 客户端、分页、时间过滤、错误分类和字段映射已有模拟响应的自动化测试，但这不等于完成了微博实机验证。

首次真实试跑必须确认：

- 当前账号的 Cookie 是否能访问该内部接口。
- `id` 是否确实对应当前账号下的目标群。
- 消息 ID、时间戳、发送人和正文的真实字段是否一致。
- 历史分页是否仍使用当前的 `max_mid` 行为。
- 红包、系统消息和未知消息类型是否需要扩充规则。
- 图片、文件、链接、视频的真实字段及鉴权要求。
- 附件 URL 是否有时效、防盗链或额外 Cookie 要求。

在完成上述验证前，不应声称微博 API 采集已经实机可用，也不应声称附件文件字段或附件原件下载已经验证。

## 12. 接口性质和使用边界

当前使用的地址是从微博 Web 客户端行为中观察到的内部接口：

```text
https://api.weibo.com/webim/groupchat/query_messages.json
```

它不是微博公开、受支持或保证稳定的官方 API。微博可能随时改变地址、字段、参数、鉴权、分页、限流或访问策略。使用者应：

- 只采集自己账号有权查看的数据。
- 遵守微博服务条款和适用法律。
- 避免高频或并发请求，并根据实际限流降低速度。
- 在真实响应发生变化时停止任务、保留错误信息并更新适配器，不能静默丢消息。
