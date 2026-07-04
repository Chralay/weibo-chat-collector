# 运行与调试指南

更新时间：2026-06-14

## 什么时候可以开启项目调试

当前项目已完成到第七步：单群聊文件采集。

现在可以调试：

- SQLite 数据库是否正常。
- JSON/CSV 导入是否正常。
- 单群聊文件采集是否正常。
- 红包过滤是否正常。
- 重复消息去重是否正常。
- 附件记录入库是否正常。
- 采集任务记录是否正常。
- 回收站和批量删除是否正常。

当前可以开始完整应用调试：

- 后端 API 调试。
- 前端页面调试。
- 前端调用后端接口。
- 消息列表和搜索功能调试。
- 采集任务页面调试。
- 微博验证记录页面调试。

微博真实登录态采集仍未接入，后续才适合调试：

- 第八步：第一个真实群聊文件采集试跑与字段映射确认。
- 后续步骤：接入真实微博采集适配器。

所以当前建议：

1. 启动后端。
2. 启动前端。
3. 在“采集任务”页选择 `single-group-sample.json` 调试单群聊文件采集。
4. 用样例数据调试消息列表、搜索、附件和删除。
5. 准备第一个真实群聊的授权导出文件，但不要提供 Cookie、Token 或账号密码。

## 项目路径

```text
D:\codex\weibo-chat-collector
```

## 后端技术栈

当前后端使用：

- Python。
- FastAPI。
- Uvicorn。
- pydantic-settings。
- Python 标准库 `sqlite3`。

后端目录：

```text
D:\codex\weibo-chat-collector\backend
```

## 前端技术栈

当前前端使用：

- React。
- TypeScript。
- Vite。
- lucide-react。
- 原生 CSS。

前端目录：

```text
D:\codex\weibo-chat-collector\frontend
```

## 数据库技术栈

当前数据库使用：

- SQLite。

数据库文件：

```text
D:\codex\weibo-chat-collector\data\weibo_chat_collector.sqlite3
```

## 当前可运行的调试命令

进入项目目录：

```powershell
cd D:\codex\weibo-chat-collector
```

检查数据库：

```powershell
python .\scripts\inspect_db.py
```

如果本机没有 `python` 命令，可以使用 Codex 桌面自带 Python：

```powershell
& 'C:\Users\SethJ\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\inspect_db.py
```

当前你的 Python 安装路径：

```text
D:\Dev\Python
```

如果 `python` 还没有加入 PATH，也可以用：

```powershell
D:\Dev\Python\python.exe .\scripts\inspect_db.py
```

导入 JSON 样例：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.json
```

导入 CSV 样例：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.csv
```

## 如何启动后端

建议从项目根目录启动后端，这样数据库路径 `.\data\weibo_chat_collector.sqlite3` 会指向项目根目录下的数据库。

进入项目根目录：

```powershell
cd D:\codex\weibo-chat-collector
```

创建虚拟环境：

```powershell
python -m venv .venv
```

启用虚拟环境：

```powershell
.\.venv\Scripts\Activate.ps1
```

安装依赖：

```powershell
pip install -r .\backend\requirements.txt
```

启动后端：

```powershell
python -m uvicorn app.main:app --reload --app-dir .\backend --host 127.0.0.1 --port 8000
```

如果 `python` 还没有加入 PATH，可以直接使用项目虚拟环境：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir .\backend --host 127.0.0.1 --port 8000
```

健康检查：

```text
http://127.0.0.1:8000/health
```

当前后端已有健康检查、筛选项、消息、删除、回收站、采集任务、单群聊文件采集和微博验证记录接口。

## 如何启动前端

进入前端目录：

```powershell
cd D:\codex\weibo-chat-collector\frontend
```

安装依赖：

```powershell
npm install
```

当前你的 Node 安装路径：

```text
D:\Dev\node
```

如果 `node` 或 `npm` 还没有加入 PATH，可以先临时执行：

```powershell
$env:Path = 'D:\Dev\node;' + $env:Path
```

也可以直接使用完整路径安装：

```powershell
D:\Dev\node\npm.cmd install
```

启动前端：

```powershell
npm run dev
```

如果 `npm` 还没有加入 PATH，可以直接使用：

```powershell
D:\Dev\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

默认访问地址通常是：

```text
http://127.0.0.1:5173
```

当前前端已接入消息检索、回收站、采集任务、单群聊文件采集和微博验证记录页面。

## 当前联调目标

调试时应该验证：

- 后端能返回消息列表。
- 后端能返回消息详情。
- 前端能展示消息列表。
- 前端筛选条件能传给后端。
- 账号筛选可用。
- 群聊筛选可用。
- 用户名筛选可用。
- 日期范围筛选可用。
- 关键词搜索可用。
- 消息类型筛选可用。
- 是否包含附件筛选可用。
- 默认不显示软删除消息。
- 回收站查询、恢复和彻底删除可用。
- 采集任务列表可用。
- `data/imports` 文件列表可用。
- 单群聊文件采集可用。
- 微博验证记录创建和观察记录可用。

## 微博侧需要准备哪些信息

微博真实登录态采集还没有开始。为了后续进行第一个真实群聊试跑和真实采集适配器开发，需要你从微博侧准备下面这些信息。

重要：不要提供密码、Cookie、Token、Authorization、XSRF、登录二维码、完整 HAR 原文件或任何可直接登录账号的信息。只需要脱敏后的接口形状和样例结构。

### 1. 账号和群聊映射

需要确认：

- 微博账号 A 的显示名或备注名。
- 微博账号 B 的显示名或备注名。
- 账号 A 对应的群聊名称。
- 账号 B 对应的群聊名称。
- 首次验证时间段：最近 7 天。

可以继续使用占位名：

```text
account_a -> group_a
account_b -> group_b
```

后续再替换为真实名称。

### 2. 是否存在官方接口或导出能力

优先确认：

- 微博开放平台是否提供群聊消息读取接口。
- 微博客户端或网页版是否提供聊天记录导出。
- 群聊图片和文件是否能通过官方方式下载。

如果有官方接口，需要记录：

- 官方文档链接。
- 接口名称。
- 接口权限说明。
- 是否支持私信/群聊。
- 是否支持历史时间范围。
- 是否支持图片、文件、链接。

不要提供：

- App Secret。
- Access Token。
- Refresh Token。

### 3. 网页端接口形状

如果只能在已登录的微博网页端查看群聊历史，需要在你自己的账号和浏览器里观察接口形状。

需要记录脱敏后的信息：

- 请求 URL 的域名和路径。
- HTTP 方法，例如 `GET` 或 `POST`。
- 请求参数名称。
- 请求体字段名称。
- 是否有分页参数。
- 是否有时间范围参数。
- 响应状态码。
- 响应内容类型。
- 响应 JSON 顶层字段。

示例格式：

```text
method: GET
path: /example/message/history
query_fields:
  - group_id
  - cursor
  - count
response_top_level_fields:
  - ok
  - data
  - next_cursor
  - has_more
```

不要提供：

- 完整 URL 中的 token。
- Cookie。
- Authorization header。
- XSRF token。
- 原始请求头。

### 4. 消息对象字段

需要整理一条普通文本消息的脱敏样例：

```json
{
  "message_id": "redacted-message-id",
  "sender_id": "redacted-user-id",
  "sender_name": "用户昵称",
  "sent_at": "2026-06-10 21:00:00",
  "message_type": "text",
  "content_text": "消息内容"
}
```

还需要分别整理：

- 图片消息字段。
- 文件消息字段。
- 链接消息字段。
- 红包消息字段。
- 系统消息字段。

重点关注：

- 消息唯一 ID 字段。
- 发送人 ID 字段。
- 发送人昵称字段。
- 发送时间字段。
- 消息类型字段。
- 正文字段。
- 附件字段。

### 5. 分页和时间范围字段

需要确认：

- 历史消息是向上翻页还是向下翻页。
- 是否有 `cursor`、`max_id`、`since_id`、`page`、`offset` 之类字段。
- 每次最多返回多少条。
- 响应里如何判断还有下一页。
- 能否直接按时间范围查询。
- 如果不能按时间范围查询，是否只能分页直到到达目标时间。

### 6. 附件字段

图片消息需要记录：

- 图片 URL 字段名。
- 缩略图 URL 字段名。
- 原图 URL 字段名。
- 图片尺寸字段。
- 图片格式字段。

文件消息需要记录：

- 文件名字段。
- 文件大小字段。
- 下载 URL 字段。
- 过期时间字段。
- MIME 类型字段。

链接消息需要记录：

- URL 字段。
- 标题字段。
- 摘要字段。
- 来源域名字段。
- 封面图字段。

### 7. 红包消息识别

需要记录红包消息有什么稳定特征：

- `message_type` 是否固定。
- 正文是否固定。
- 是否有特殊字段。
- 是否没有普通正文。
- 是否有红包图标或系统类型字段。

目标是导入和采集时自动跳过红包消息。

### 8. 错误和限制

需要记录：

- 未登录时返回什么。
- 登录过期时返回什么。
- 请求太快时返回什么。
- 没有权限看群聊时返回什么。
- 附件过期时返回什么。

只需要脱敏结构，不需要真实账号凭据。

## 可以给 Codex 的安全样例

推荐提供这种脱敏信息：

```json
{
  "endpoint": {
    "method": "GET",
    "path": "/redacted/message/history",
    "query_fields": ["group_id", "cursor", "count"]
  },
  "response_shape": {
    "top_level_fields": ["ok", "data", "has_more", "next_cursor"],
    "message_fields": [
      "id",
      "sender.id",
      "sender.name",
      "created_at",
      "type",
      "text",
      "attachments"
    ]
  },
  "notes": {
    "pagination": "uses next_cursor",
    "time_filter": "not supported directly",
    "red_packet_type": "red_packet"
  }
}
```

## 不要给 Codex 的内容

不要提供：

- 微博密码。
- 手机验证码。
- 二维码登录截图。
- Cookie。
- Authorization。
- Bearer Token。
- XSRF Token。
- Access Token。
- Refresh Token。
- App Secret。
- 未脱敏 HAR 文件。
- 可直接复用的完整请求头。

如果必须调试带登录状态的采集，应让代码在你的本机浏览器环境中运行，并且不要把凭据复制到聊天里。

## 推荐的下一步

当前最合理的顺序：

1. 启动后端和前端。
2. 打开前端“微博验证”视图。
3. 分别为两个微博账号和两个群聊创建验证记录。
4. 填入脱敏接口形状、页面观察和消息样例。
5. 根据观察结果整理真实采集器的字段映射。
