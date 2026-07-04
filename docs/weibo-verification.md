# 微博实机验证与采集适配器准备

更新时间：2026-06-14

## 功能目标

第六步用于把微博侧实机验证过程结构化记录下来，为后续真实采集适配器做字段映射。

当前不直接登录微博、不保存账号密码、不保存 Cookie、Token、Authorization 等敏感凭据，也不绕过平台登录、验证或权限控制。

## 已实现能力

- 新增微博验证记录表。
- 新增微博接口 / 页面观察表。
- 新增数据库幂等迁移脚本。
- 新增后端验证记录 API。
- 新增后端脱敏观察 API。
- 新增敏感字段拦截，避免误保存 Cookie、Token、Authorization 等字段。
- 新增前端“微博验证”视图。
- 新增采集器抽象接口和微博占位采集器。

## 数据库表

新增表：

- `weibo_verification_reports`
- `weibo_interface_observations`

迁移命令：

```powershell
python .\scripts\migrate_db.py
```

## 后端接口

### 验证记录列表

```text
GET /api/weibo-verifications
```

支持参数：

- `account_id`
- `group_id`
- `verification_status`
- `limit`
- `offset`

### 创建验证记录

```text
POST /api/weibo-verifications
```

请求体：

```json
{
  "account_id": 1,
  "group_id": 1,
  "history_days_checked": 7,
  "risk_level": "unknown",
  "verification_status": "draft",
  "notes": "只记录验证现象，不保存敏感凭据"
}
```

### 验证记录详情

```text
GET /api/weibo-verifications/{report_id}
```

### 更新验证结论

```text
PATCH /api/weibo-verifications/{report_id}
```

可更新字段：

- `can_login`
- `can_view_group`
- `can_view_history`
- `history_days_checked`
- `can_page_history`
- `can_access_images`
- `can_access_files`
- `can_access_links`
- `red_packet_identified`
- `rate_limit_observed`
- `risk_level`
- `verification_status`
- `notes`

### 添加脱敏观察

```text
POST /api/weibo-verifications/{report_id}/observations
```

请求体：

```json
{
  "observation_type": "message_history",
  "method": "GET",
  "endpoint_path": "/redacted/history",
  "request_fields": {
    "group_id": "redacted",
    "start_time": "2026-06-01 00:00:00"
  },
  "response_fields": {
    "messages": [],
    "next_cursor": "redacted"
  },
  "sample_payload": {
    "message_id": "redacted",
    "text": "示例正文"
  },
  "pagination_fields": {
    "cursor": "redacted",
    "has_more": true
  },
  "redaction_notes": "已移除 Cookie、Token、Authorization 和隐私字段"
}
```

## 前端入口

前端顶部新增：

```text
微博验证
```

该视图包含：

- 创建验证记录。
- 选择账号和群聊。
- 设置核验历史天数、风险级别、验证状态。
- 勾选账号登录、群聊可见、历史可见、分页、图片、文件、链接、红包特征、风控观察。
- 添加脱敏观察 JSON。
- 查看已有观察样例。

## 采集器骨架

新增文件：

```text
backend/app/collectors/base.py
backend/app/collectors/weibo_placeholder.py
```

当前真实微博采集器仍未实现。后续只有在确认可用、合规、授权的数据获取方式后，才会替换 `WeiboVerifiedInterfaceCollector` 的占位实现。

## 实机验证时需要你提供什么

你后续可以提供以下脱敏信息：

- 账号 A 对应群聊 A 是否能看到历史消息。
- 账号 B 对应群聊 B 是否能看到历史消息。
- 历史消息是否能继续向上翻页。
- 分页字段或页面加载规律。
- 消息字段结构，例如发送人、时间、正文、消息 ID。
- 图片字段结构和原图链接是否可用。
- 文件字段结构和下载入口是否可用。
- 链接字段结构。
- 红包消息在界面或字段中的稳定特征。
- 是否出现登录验证、访问频率限制或风控提示。

不要提供：

- 微博账号密码。
- Cookie。
- Token。
- Authorization 请求头。
- 个人隐私明文。
- 任何绕过登录、验证码、权限控制的信息。

## 验证结果

已在临时数据库验证：

- 创建验证记录成功。
- 保存验证结论成功。
- 添加脱敏观察成功。
- 敏感字段拦截成功。
- 前端生产构建通过。
- 后端编译检查通过。

当前项目数据库已执行迁移，包含第六步新增表。

## 下一步

第七步“单群聊文件采集”已完成，详见：

```text
docs/single-group-collection.md
```

下一步建议用第一个真实群聊的授权导出文件执行试跑，并根据结果整理真实采集器字段映射。
