PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS weibo_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    weibo_uid TEXT,
    login_profile_name TEXT,
    auth_type TEXT NOT NULL DEFAULT 'manual',
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    source_group_id TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id)
);

CREATE TABLE IF NOT EXISTS chat_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    source_user_id TEXT,
    alias TEXT,
    avatar_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    display_name_in_group TEXT,
    first_seen_at TEXT,
    last_seen_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id),
    FOREIGN KEY (user_id) REFERENCES chat_users(id),
    UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS collection_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TEXT,
    finished_at TEXT,
    total_seen_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    collector_type TEXT NOT NULL DEFAULT 'manual_import',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id)
);

CREATE TABLE IF NOT EXISTS weibo_verification_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    can_login INTEGER NOT NULL DEFAULT 0,
    can_view_group INTEGER NOT NULL DEFAULT 0,
    can_view_history INTEGER NOT NULL DEFAULT 0,
    history_days_checked INTEGER,
    can_page_history INTEGER NOT NULL DEFAULT 0,
    can_access_images INTEGER NOT NULL DEFAULT 0,
    can_access_files INTEGER NOT NULL DEFAULT 0,
    can_access_links INTEGER NOT NULL DEFAULT 0,
    red_packet_identified INTEGER NOT NULL DEFAULT 0,
    rate_limit_observed INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'unknown',
    verification_status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id)
);

CREATE TABLE IF NOT EXISTS weibo_interface_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    observation_type TEXT NOT NULL,
    method TEXT,
    endpoint_path TEXT,
    request_fields_json TEXT,
    response_fields_json TEXT,
    sample_payload_json TEXT,
    pagination_fields_json TEXT,
    redaction_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES weibo_verification_reports(id)
);

CREATE TABLE IF NOT EXISTS browser_page_captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    page_url TEXT,
    page_title TEXT,
    captured_at TEXT NOT NULL,
    visible_text TEXT,
    blocks_json TEXT NOT NULL,
    script_version TEXT NOT NULL DEFAULT 'visible_blocks_v1',
    status TEXT NOT NULL DEFAULT 'captured',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    source_message_id TEXT,
    sent_at TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    content_text TEXT,
    normalized_text TEXT,
    raw_payload TEXT,
    content_hash TEXT,
    collection_job_id INTEGER,
    is_red_packet INTEGER NOT NULL DEFAULT 0,
    is_system_message INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id),
    FOREIGN KEY (user_id) REFERENCES chat_users(id),
    FOREIGN KEY (collection_job_id) REFERENCES collection_jobs(id)
);

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    attachment_type TEXT NOT NULL,
    source_url TEXT,
    local_path TEXT,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    content_hash TEXT,
    title TEXT,
    description TEXT,
    download_status TEXT NOT NULL DEFAULT 'pending',
    downloaded_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE TABLE IF NOT EXISTS deletion_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    group_id INTEGER,
    filter_json TEXT NOT NULL,
    preview_count INTEGER NOT NULL DEFAULT 0,
    deleted_count INTEGER NOT NULL DEFAULT 0,
    delete_attachments INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'preview',
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id)
);

CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_file TEXT,
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES weibo_accounts(id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id)
);

CREATE TABLE IF NOT EXISTS search_indexes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    indexed_text TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_account_id ON chat_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_account_group_sent_at ON messages(account_id, group_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_source_id ON messages(account_id, group_id, source_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages(account_id, group_id, user_id, sent_at, content_hash);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(content_hash);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_range ON collection_jobs(account_id, group_id, range_start, range_end);
CREATE INDEX IF NOT EXISTS idx_weibo_verification_reports_account_group ON weibo_verification_reports(account_id, group_id);
CREATE INDEX IF NOT EXISTS idx_weibo_verification_reports_status ON weibo_verification_reports(verification_status);
CREATE INDEX IF NOT EXISTS idx_weibo_interface_observations_report_id ON weibo_interface_observations(report_id);
CREATE INDEX IF NOT EXISTS idx_browser_page_captures_account_group ON browser_page_captures(account_id, group_id);
CREATE INDEX IF NOT EXISTS idx_browser_page_captures_created_at ON browser_page_captures(created_at);
