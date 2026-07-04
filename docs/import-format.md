# 手动导入格式

第二步先支持 JSON 和 CSV 手动导入。这个能力用于在微博自动采集适配器完成前，把聊天记录先导入数据库并验证搜索、附件、删除等后续功能。

## JSON 格式

```json
{
  "account": "account_a",
  "group": "group_a",
  "messages": [
    {
      "source_message_id": "msg-001",
      "sender_name": "用户昵称",
      "source_user_id": "user-001",
      "sent_at": "2026-06-10 21:00:00",
      "message_type": "text",
      "content_text": "消息内容",
      "attachments": []
    }
  ]
}
```

## CSV 字段

CSV 首行需要包含：

```text
account,group,source_message_id,sender_name,source_user_id,sent_at,message_type,content_text,attachments_json
```

其中 `attachments_json` 是一个 JSON 数组字符串。

## 附件格式

```json
{
  "attachment_type": "image",
  "source_url": "https://example.com/image.jpg",
  "local_path": "C:/path/to/image.jpg",
  "file_name": "image.jpg",
  "mime_type": "image/jpeg",
  "download_status": "pending"
}
```

`attachment_type` 可用值：

- `image`
- `file`
- `link`
- `video`
- `audio`
- `unknown`

## 红包过滤

导入时会跳过红包类消息。

当前识别规则：

- `message_type` 为 `red_packet`、`hongbao`、`weibo_red_packet`。
- 消息正文为 `[红包]`、`微博红包`、`发了一个红包`、`领取了红包` 等。

## 去重规则

优先按以下字段去重：

```text
account_id + group_id + source_message_id
```

如果没有 `source_message_id`，则使用：

```text
account_id + group_id + user_id + sent_at + content_hash
```

## 运行导入

JSON：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.json
```

CSV：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.csv
```

如果消息里的附件提供了本地路径，并且需要复制原件：

```powershell
python .\scripts\import_messages.py .\data\imports\sample-import.json --copy-local-attachments
```

检查数据库：

```powershell
python .\scripts\inspect_db.py
```

