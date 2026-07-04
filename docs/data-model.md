# 建议数据模型

## weibo_accounts

微博账号表。用于区分两个微博号的数据来源。

- id
- display_name
- weibo_uid
- login_profile_name
- auth_type
- is_active
- notes
- created_at
- updated_at

## chat_groups

群聊表。

- id
- account_id
- name
- source_group_id
- description
- is_active
- created_at
- updated_at

说明：同一个群名在不同账号下也应视为不同来源，必须通过 `account_id` 区分。

## chat_users

群聊用户表。

- id
- display_name
- source_user_id
- alias
- avatar_url
- notes
- created_at
- updated_at

## group_members

群成员关联表。

- id
- group_id
- user_id
- display_name_in_group
- first_seen_at
- last_seen_at
- is_active

## messages

消息表。

- id
- account_id
- group_id
- user_id
- source_message_id
- sent_at
- message_type
- content_text
- normalized_text
- raw_payload
- collection_job_id
- is_red_packet
- is_system_message
- is_deleted
- deleted_at
- created_at
- updated_at

建议索引：

- account_id
- group_id
- user_id
- sent_at
- message_type
- source_message_id
- is_deleted

去重建议：

- 优先使用 `account_id + group_id + source_message_id`。
- 如果没有稳定消息 ID，则使用 `account_id + group_id + user_id + sent_at + content_hash`。

## attachments

附件表。图片、文件、链接都作为附件保存。

- id
- message_id
- attachment_type
- source_url
- local_path
- file_name
- mime_type
- file_size
- content_hash
- title
- description
- download_status
- downloaded_at
- created_at

`attachment_type` 可取值：

- image
- file
- link
- video
- audio
- unknown

## collection_jobs

采集任务表。每次用户选择时间段采集都会生成一条记录。

- id
- account_id
- group_id
- range_start
- range_end
- status
- started_at
- finished_at
- total_seen_count
- inserted_count
- skipped_count
- failed_count
- error_message
- collector_type
- created_at

## weibo_verification_reports

微博实机验证记录表。用于记录某个微博账号对某个群聊的可采集性结论。

- id
- account_id
- group_id
- can_login
- can_view_group
- can_view_history
- history_days_checked
- can_page_history
- can_access_images
- can_access_files
- can_access_links
- red_packet_identified
- rate_limit_observed
- risk_level
- verification_status
- notes
- created_at
- updated_at

说明：该表只记录验证结论，不保存 Cookie、Token、Authorization、账号密码等敏感凭据。

## weibo_interface_observations

微博接口 / 页面观察记录表。用于保存脱敏后的字段结构和样例，为后续真实采集器做字段映射。

- id
- report_id
- observation_type
- method
- endpoint_path
- request_fields_json
- response_fields_json
- sample_payload_json
- pagination_fields_json
- redaction_notes
- created_at

说明：所有 JSON 样例都必须先脱敏。后端会拦截常见鉴权字段，避免误保存敏感凭据。

## browser_page_captures

网页版微博页面快照表。用于保存用户在已登录微博页面运行本地快照脚本后回传的可见文本块。

- id
- account_id
- group_id
- range_start
- range_end
- page_url
- page_title
- captured_at
- visible_text
- blocks_json
- script_version
- status
- notes
- created_at

说明：该表保存页面可见文本快照，用于后续分析真实 DOM 和字段映射；第一版不直接写入正式消息表。

## deletion_jobs

批量删除任务表。

- id
- account_id
- group_id
- filter_json
- preview_count
- deleted_count
- delete_attachments
- status
- created_by
- created_at
- finished_at

## import_batches

手动导入批次表。用于支持 CSV、JSON 或其他导入方式。

- id
- account_id
- group_id
- source_type
- source_file
- imported_count
- skipped_count
- status
- created_at

## search_indexes

可选的搜索索引表。SQLite 起步时可以先用 FTS。

- id
- message_id
- indexed_text
- updated_at
