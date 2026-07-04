# 时间段采集任务框架

更新时间：2026-06-14

## 功能目标

第五步用于建立“按时间段采集”的任务框架。

当前可以创建和管理任务，也可以用 `data/imports` 下的 JSON/CSV 执行单群聊文件采集。仍未连接微博真实登录态采集器。

## 已实现能力

- 创建采集任务。
- 选择微博账号。
- 选择群聊。
- 选择开始时间。
- 选择结束时间。
- 任务状态默认为 `pending`。
- 列出 `data/imports` 下的采集文件。
- 执行单群聊文件采集。
- 查看任务列表。
- 按状态筛选任务列表。
- 查看任务详情。
- 预留任务状态更新接口。

## 任务状态

当前支持：

- `pending`
- `running`
- `completed`
- `failed`
- `cancelled`

后续微博采集适配器接入后，会按实际采集过程更新这些状态。

## 后端接口

### 创建任务

```text
POST /api/collection-jobs
```

请求体：

```json
{
  "account_id": 1,
  "group_id": 1,
  "range_start": "2026-06-07 00:00:00",
  "range_end": "2026-06-14 23:59:00",
  "collector_type": "time_range_placeholder"
}
```

### 任务列表

```text
GET /api/collection-jobs
```

支持参数：

- `account_id`
- `group_id`
- `status`
- `limit`
- `offset`

### 任务详情

```text
GET /api/collection-jobs/{job_id}
```

### 更新任务状态

```text
PATCH /api/collection-jobs/{job_id}/status
```

请求体：

```json
{
  "status": "running",
  "error_message": null
}
```

### 执行单群聊文件采集

```text
POST /api/collection-jobs/single-group-file
```

详见：

```text
docs/single-group-collection.md
```

## 前端入口

前端顶部新增：

```text
采集任务
```

该视图包含：

- 创建采集任务表单。
- 采集文件选择。
- 执行文件采集。
- 任务状态筛选。
- 任务列表。
- 任务结果计数展示。

## 验证结果

已在临时数据库验证：

- 成功创建任务。
- 任务默认状态为 `pending`。
- 任务列表总数增加 1。
- 任务详情可读取。
- 状态可更新为 `running`。
- 状态可更新为 `completed`。
- 单群聊样例文件采集成功。

正式数据库未被验证过程修改。

## 后续

第六步“微博采集实机验证与采集适配器准备”和第七步“单群聊文件采集”已完成，详见：

```text
docs/weibo-verification.md
docs/single-group-collection.md
```

下一步进入第一个真实群聊采集试跑与字段映射确认。
