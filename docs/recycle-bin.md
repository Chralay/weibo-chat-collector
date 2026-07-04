# 回收站与已删除消息

更新时间：2026-06-14

## 功能目标

回收站用于管理软删除消息。

普通消息列表默认只展示：

```text
is_deleted = 0
```

回收站只展示：

```text
is_deleted = 1
```

这样批量删除后，消息不会立刻从数据库消失，可以先在回收站查看和恢复。

## 已实现能力

- 切换“消息 / 回收站”视图。
- 回收站内复用账号、群聊、用户、日期、关键词、消息类型、附件筛选。
- 回收站内查看已删除消息详情。
- 预览恢复数量。
- 批量恢复当前筛选结果。
- 预览彻底删除数量。
- 二次确认后彻底删除当前筛选结果。

## 恢复逻辑

恢复会把消息重新放回普通消息列表：

```text
is_deleted = 0
deleted_at = NULL
```

附件记录会保留。

## 彻底删除逻辑

彻底删除只针对回收站中的消息。

执行顺序：

1. 删除数据库中的附件记录。
2. 删除搜索索引记录。
3. 删除消息记录。

当前不会删除磁盘上的图片和文件原件，避免误删文件。

## 后端接口

查看已删除消息：

```text
GET /api/messages?include_deleted=true&deleted_only=true
```

恢复预览：

```text
POST /api/messages/restore-preview
```

执行恢复：

```text
POST /api/messages/restore
```

彻底删除预览：

```text
POST /api/messages/hard-delete-preview
```

执行彻底删除：

```text
POST /api/messages/hard-delete
```

## 验证结果

已在临时数据库完成验证：

- `keyword=Sample` 软删除前普通列表：2 条。
- 软删除后回收站：2 条。
- 恢复预览：2 条。
- 恢复后普通列表：2 条。
- 再次软删除后彻底删除预览：2 条消息，1 条附件记录。
- 彻底删除后回收站：0 条。

