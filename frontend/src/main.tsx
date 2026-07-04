import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Clock,
  Database,
  FileText,
  Image,
  Link,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = "";
const PAGE_SIZE = 100;

type Account = {
  id: number;
  display_name: string;
  is_active: number;
};

type Group = {
  id: number;
  account_id: number;
  name: string;
  account_name: string;
  is_active: number;
};

type User = {
  id: number;
  display_name: string;
  source_user_id: string | null;
};

type FilterOptions = {
  accounts: Account[];
  groups: Group[];
  users: User[];
  message_types: string[];
};

type Message = {
  id: number;
  account_id: number;
  account_name: string;
  group_id: number;
  group_name: string;
  user_id: number;
  sender_name: string;
  source_user_id: string | null;
  source_message_id: string | null;
  sent_at: string;
  message_type: string;
  content_text: string;
  is_deleted: number;
  deleted_at: string | null;
  attachment_count: number;
};

type Attachment = {
  id: number;
  attachment_type: string;
  source_url: string | null;
  local_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  title: string | null;
  description: string | null;
  download_status: string;
};

type MessageDetail = Message & {
  raw_payload: string | null;
  normalized_text: string | null;
  attachments: Attachment[];
};

type Cursor = {
  before_sent_at: string;
  before_id: number;
};

type Filters = {
  accountId: string;
  groupId: string;
  user: string;
  keyword: string;
  dateFrom: string;
  dateTo: string;
  messageType: string;
  hasAttachment: string;
};

type DeletePreview = {
  preview_count: number;
  delete_mode: string;
  restore_mode?: string;
  attachment_record_count?: number;
};

type PreviewAction = "soft-delete" | "restore" | "hard-delete";
type ActionPreview = DeletePreview & {
  action: PreviewAction;
};

type ViewMode = "active" | "deleted" | "jobs" | "weibo";

type CollectionJob = {
  id: number;
  account_id: number;
  account_name: string;
  group_id: number;
  group_name: string;
  range_start: string;
  range_end: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  total_seen_count: number;
  inserted_count: number;
  skipped_count: number;
  failed_count: number;
  error_message: string | null;
  collector_type: string;
  created_at: string;
};

type CollectionJobForm = {
  accountId: string;
  groupId: string;
  rangeStart: string;
  rangeEnd: string;
  sourceFile: string;
};

type ImportFile = {
  name: string;
  relative_path: string;
  size: number;
  modified_at: string;
};

type SingleGroupCollectionSummary = {
  collection_job_id: number;
  source_total_count: number;
  total_count: number;
  inserted_count: number;
  skipped_count: number;
  red_packet_count: number;
  duplicate_count: number;
  attachment_count: number;
  out_of_range_count: number;
  invalid_count: number;
};

type BrowserCapture = {
  id: number;
  account_id: number;
  account_name: string;
  group_id: number;
  group_name: string;
  range_start: string;
  range_end: string;
  page_url: string | null;
  page_title: string | null;
  captured_at: string;
  text_length: number;
  script_version: string;
  status: string;
  created_at: string;
};

type BrowserCaptureParseItem = {
  index: number;
  sent_at: string;
  sender_name: string;
  message_type: string;
  content_text: string;
  source_message_id: string;
  is_duplicate: boolean;
  block_top: number | null;
};

type BrowserCaptureParsePreview = {
  capture_id: number;
  parser_version: string;
  total_blocks: number;
  skipped_blocks: number;
  parsed_count: number;
  duplicate_count: number;
  items: BrowserCaptureParseItem[];
};

type BrowserCaptureImportResult = {
  capture_id: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number;
  duplicate_count: number;
  red_packet_count: number;
  collection_job: CollectionJob;
};

type VerificationBooleanField =
  | "can_login"
  | "can_view_group"
  | "can_view_history"
  | "can_page_history"
  | "can_access_images"
  | "can_access_files"
  | "can_access_links"
  | "red_packet_identified"
  | "rate_limit_observed";

type WeiboObservation = {
  id: number;
  report_id: number;
  observation_type: string;
  method: string | null;
  endpoint_path: string | null;
  request_fields: unknown;
  response_fields: unknown;
  sample_payload: unknown;
  pagination_fields: unknown;
  redaction_notes: string | null;
  created_at: string;
};

type WeiboVerificationReport = {
  id: number;
  account_id: number;
  account_name: string;
  group_id: number;
  group_name: string;
  can_login: boolean;
  can_view_group: boolean;
  can_view_history: boolean;
  history_days_checked: number | null;
  can_page_history: boolean;
  can_access_images: boolean;
  can_access_files: boolean;
  can_access_links: boolean;
  red_packet_identified: boolean;
  rate_limit_observed: boolean;
  risk_level: "unknown" | "low" | "medium" | "high";
  verification_status: "draft" | "verified" | "blocked";
  notes: string | null;
  observation_count?: number;
  observations?: WeiboObservation[];
  created_at: string;
  updated_at: string;
};

type VerificationReportForm = {
  accountId: string;
  groupId: string;
  historyDaysChecked: string;
  riskLevel: "unknown" | "low" | "medium" | "high";
  verificationStatus: "draft" | "verified" | "blocked";
  notes: string;
};

type ObservationForm = {
  observationType:
    | "message_history"
    | "pagination"
    | "image"
    | "file"
    | "link"
    | "red_packet"
    | "error"
    | "official_api";
  method: string;
  endpointPath: string;
  requestFields: string;
  responseFields: string;
  samplePayload: string;
  paginationFields: string;
  redactionNotes: string;
};

const emptyFilters: Filters = {
  accountId: "",
  groupId: "",
  user: "",
  keyword: "",
  dateFrom: "",
  dateTo: "",
  messageType: "",
  hasAttachment: "",
};

const emptyCollectionJobForm: CollectionJobForm = {
  accountId: "",
  groupId: "",
  rangeStart: "",
  rangeEnd: "",
  sourceFile: "",
};

const emptyVerificationReportForm: VerificationReportForm = {
  accountId: "",
  groupId: "",
  historyDaysChecked: "7",
  riskLevel: "unknown",
  verificationStatus: "draft",
  notes: "",
};

const emptyObservationForm: ObservationForm = {
  observationType: "message_history",
  method: "GET",
  endpointPath: "",
  requestFields: "",
  responseFields: "",
  samplePayload: "",
  paginationFields: "",
  redactionNotes: "已移除 Cookie、Token、Authorization、用户隐私字段。",
};

const verificationBooleanFields: Array<{ key: VerificationBooleanField; label: string }> = [
  { key: "can_login", label: "账号可稳定登录" },
  { key: "can_view_group", label: "账号可进入对应群聊" },
  { key: "can_view_history", label: "可查看历史消息" },
  { key: "can_page_history", label: "历史消息可翻页" },
  { key: "can_access_images", label: "图片字段可识别" },
  { key: "can_access_files", label: "文件字段可识别" },
  { key: "can_access_links", label: "链接字段可识别" },
  { key: "red_packet_identified", label: "红包消息特征可识别" },
  { key: "rate_limit_observed", label: "观察到验证或风控限制" },
];

function buildMessageQuery(
  filters: Filters,
  cursor: Cursor | null = null,
  viewMode: ViewMode = "active",
): string {
  const params = new URLSearchParams();

  if (filters.accountId) params.set("account_id", filters.accountId);
  if (filters.groupId) params.set("group_id", filters.groupId);
  if (filters.user.trim()) params.set("user", filters.user.trim());
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.dateFrom) params.set("date_from", `${filters.dateFrom} 00:00:00`);
  if (filters.dateTo) params.set("date_to", `${filters.dateTo} 23:59:59`);
  if (filters.messageType) params.set("message_type", filters.messageType);
  if (filters.hasAttachment) params.set("has_attachment", filters.hasAttachment);
  if (viewMode === "deleted") {
    params.set("include_deleted", "true");
    params.set("deleted_only", "true");
  }
  if (cursor) {
    params.set("before_sent_at", cursor.before_sent_at);
    params.set("before_id", String(cursor.before_id));
  }
  params.set("limit", String(PAGE_SIZE));

  return params.toString();
}

function buildFilterPayload(filters: Filters) {
  return {
    account_id: filters.accountId ? Number(filters.accountId) : null,
    group_id: filters.groupId ? Number(filters.groupId) : null,
    user: filters.user.trim() || null,
    keyword: filters.keyword.trim() || null,
    date_from: filters.dateFrom ? `${filters.dateFrom} 00:00:00` : null,
    date_to: filters.dateTo ? `${filters.dateTo} 23:59:59` : null,
    message_type: filters.messageType || null,
    has_attachment:
      filters.hasAttachment === "" ? null : filters.hasAttachment === "true",
  };
}

function formatDateTimeLocal(value: string): string {
  if (!value) return "";
  const normalized = value.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

async function fetchJson<T>(path: string, label: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const maxAttempts = init?.method && init.method !== "GET" ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        ...init,
      });
      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = await response.text().catch(() => "");
      const detail = body.trim().slice(0, 200);
      if (attempt < maxAttempts && response.status >= 500) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        continue;
      }

      throw new Error(
        `${label}失败：HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}，接口 ${url}${
          detail ? `，返回：${detail}` : ""
        }`,
      );
    } catch (requestError) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        continue;
      }
      throw requestError;
    }
  }

  throw new Error(`${label}失败：接口 ${url}`);
}

function resolveCollectionTarget(data: FilterOptions, current: Pick<CollectionJobForm, "accountId" | "groupId">) {
  const accountId = current.accountId || (data.accounts[0] ? String(data.accounts[0].id) : "");
  const groupId =
    current.groupId ||
    (accountId ? String(data.groups.find((group) => String(group.account_id) === accountId)?.id ?? "") : "");
  return { accountId, groupId };
}

function getAttachmentIcon(type: string) {
  if (type === "image") return Image;
  if (type === "link") return Link;
  return FileText;
}

function formatMessageType(type: string): string {
  const labels: Record<string, string> = {
    text: "文本",
    image: "图片",
    file: "文件",
    link: "链接",
    system: "系统",
  };
  return labels[type] ?? type;
}

function formatObservationType(type: string): string {
  const labels: Record<string, string> = {
    message_history: "历史消息",
    pagination: "分页",
    image: "图片",
    file: "文件",
    link: "链接",
    red_packet: "红包",
    error: "错误",
    official_api: "官方接口",
  };
  return labels[type] ?? type;
}

function formatRiskLevel(level: string): string {
  const labels: Record<string, string> = {
    unknown: "未确认",
    low: "低",
    medium: "中",
    high: "高",
  };
  return labels[level] ?? level;
}

function formatVerificationStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: "记录中",
    verified: "已验证",
    blocked: "受阻",
  };
  return labels[status] ?? status;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function parseJsonText(value: string, label: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} 需要填写合法 JSON，或留空`);
  }
}

function stringifyJsonPreview(value: unknown): string {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function groupMessagesByDate(messages: Message[]) {
  return messages.reduce<Array<{ date: string; items: Message[] }>>((groups, message) => {
    const date = message.sent_at.slice(0, 10) || "未知日期";
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.items.push(message);
    } else {
      groups.push({ date, items: [message] });
    }
    return groups;
  }, []);
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("jobs");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [options, setOptions] = useState<FilterOptions>({
    accounts: [],
    groups: [],
    users: [],
    message_types: [],
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionPreview, setActionPreview] = useState<ActionPreview | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collectionJobs, setCollectionJobs] = useState<CollectionJob[]>([]);
  const [collectionJobTotal, setCollectionJobTotal] = useState(0);
  const [collectionJobForm, setCollectionJobForm] = useState<CollectionJobForm>(
    emptyCollectionJobForm,
  );
  const [collectionJobStatusFilter, setCollectionJobStatusFilter] = useState("");
  const [importFiles, setImportFiles] = useState<ImportFile[]>([]);
  const [browserCaptures, setBrowserCaptures] = useState<BrowserCapture[]>([]);
  const [browserCaptureSnippet, setBrowserCaptureSnippet] = useState("");
  const [browserCapturePreview, setBrowserCapturePreview] =
    useState<BrowserCaptureParsePreview | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [verificationReports, setVerificationReports] = useState<WeiboVerificationReport[]>([]);
  const [verificationTotal, setVerificationTotal] = useState(0);
  const [verificationForm, setVerificationForm] = useState<VerificationReportForm>(
    emptyVerificationReportForm,
  );
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("");
  const [selectedVerificationId, setSelectedVerificationId] = useState<number | null>(null);
  const [selectedVerification, setSelectedVerification] =
    useState<WeiboVerificationReport | null>(null);
  const [observationForm, setObservationForm] = useState<ObservationForm>(emptyObservationForm);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleGroups = useMemo(() => {
    if (!filters.accountId) return options.groups;
    return options.groups.filter((group) => String(group.account_id) === filters.accountId);
  }, [filters.accountId, options.groups]);

  const visibleCollectionGroups = useMemo(() => {
    if (!collectionJobForm.accountId) return options.groups;
    return options.groups.filter(
      (group) => String(group.account_id) === collectionJobForm.accountId,
    );
  }, [collectionJobForm.accountId, options.groups]);

  const visibleVerificationGroups = useMemo(() => {
    if (!verificationForm.accountId) return options.groups;
    return options.groups.filter(
      (group) => String(group.account_id) === verificationForm.accountId,
    );
  }, [verificationForm.accountId, options.groups]);

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  async function loadOptions() {
    const data = await fetchJson<FilterOptions>("/api/filter-options", "筛选项加载");
    setOptions(data);
    setCollectionJobForm((current) => {
      const { accountId, groupId } = resolveCollectionTarget(data, current);
      return { ...current, accountId, groupId };
    });
    return data;
  }

  async function loadMessages(
    nextFilters = appliedFilters,
    mode: "replace" | "append" = "replace",
    cursor: Cursor | null = null,
    nextViewMode = viewMode,
  ) {
    const append = mode === "append";
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const query = buildMessageQuery(nextFilters, cursor, nextViewMode);
      const response = await fetch(`${API_BASE_URL}/api/messages?${query}`);
      if (!response.ok) throw new Error("消息列表加载失败");
      const data = (await response.json()) as {
        items: Message[];
        total: number;
        has_more: boolean;
        next_cursor: Cursor | null;
      };
      setMessages((current) => (append ? [...current, ...data.items] : data.items));
      setTotal(data.total);
      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);

      if (!append) {
        if (data.items.length > 0) {
          setSelectedMessageId(data.items[0].id);
        } else {
          setSelectedMessageId(null);
          setDetail(null);
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadDetail(messageId: number) {
    setDetailLoading(true);
    setError(null);
    try {
      const detailQuery = viewMode === "deleted" ? "?include_deleted=true" : "";
      const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}${detailQuery}`);
      if (!response.ok) throw new Error("消息详情加载失败");
      setDetail((await response.json()) as MessageDetail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function previewAction(action: PreviewAction) {
    setDeleting(true);
    setDeleteResult(null);
    setError(null);
    const endpointByAction: Record<PreviewAction, string> = {
      "soft-delete": "delete-preview",
      restore: "restore-preview",
      "hard-delete": "hard-delete-preview",
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${endpointByAction[action]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: buildFilterPayload(appliedFilters) }),
      });
      if (!response.ok) throw new Error("操作预览失败");
      const data = (await response.json()) as DeletePreview;
      setActionPreview({ ...data, action });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setDeleting(false);
    }
  }

  async function executeSoftDelete() {
    if (!actionPreview || actionPreview.preview_count <= 0) return;
    const confirmed = window.confirm(
      `确认软删除当前搜索条件下的 ${actionPreview.preview_count} 条消息？`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/soft-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: buildFilterPayload(appliedFilters),
          confirm: true,
          delete_attachments: false,
          created_by: "local_user",
        }),
      });
      if (!response.ok) throw new Error("软删除失败");
      const result = (await response.json()) as { deleted_count: number };
      setDeleteResult(`已软删除 ${result.deleted_count} 条消息`);
      setActionPreview(null);
      setSelectedMessageId(null);
      setDetail(null);
      await loadOptions();
      await loadMessages(appliedFilters);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setDeleting(false);
    }
  }

  async function executeRestore() {
    if (!actionPreview || actionPreview.preview_count <= 0) return;
    const confirmed = window.confirm(
      `确认恢复当前搜索条件下的 ${actionPreview.preview_count} 条消息？`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: buildFilterPayload(appliedFilters),
          confirm: true,
          created_by: "local_user",
        }),
      });
      if (!response.ok) throw new Error("恢复失败");
      const result = (await response.json()) as { restored_count: number };
      setDeleteResult(`已恢复 ${result.restored_count} 条消息`);
      setActionPreview(null);
      setSelectedMessageId(null);
      setDetail(null);
      await loadOptions();
      await loadMessages(appliedFilters);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setDeleting(false);
    }
  }

  async function executeHardDelete() {
    if (!actionPreview || actionPreview.preview_count <= 0) return;
    const confirmed = window.confirm(
      `确认彻底删除当前搜索条件下的 ${actionPreview.preview_count} 条已删除消息？此操作不可恢复。`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/hard-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: buildFilterPayload(appliedFilters),
          confirm: true,
          delete_attachment_files: false,
          created_by: "local_user",
        }),
      });
      if (!response.ok) throw new Error("彻底删除失败");
      const result = (await response.json()) as { deleted_count: number };
      setDeleteResult(`已彻底删除 ${result.deleted_count} 条消息记录`);
      setActionPreview(null);
      setSelectedMessageId(null);
      setDetail(null);
      await loadOptions();
      await loadMessages(appliedFilters);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setDeleting(false);
    }
  }

  async function loadCollectionJobs(status = collectionJobStatusFilter) {
    setJobLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (status) params.set("status", status);
      const data = await fetchJson<{
        items: CollectionJob[];
        total: number;
      }>(`/api/collection-jobs?${params.toString()}`, "采集任务加载");
      setCollectionJobs(data.items);
      setCollectionJobTotal(data.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function loadImportFiles() {
    setError(null);
    try {
      const data = await fetchJson<{
        items: ImportFile[];
        total: number;
      }>("/api/import-files", "采集文件列表加载");
      setImportFiles(data.items);
      setCollectionJobForm((current) => {
        if (current.sourceFile || data.items.length === 0) return current;
        return { ...current, sourceFile: data.items[0].relative_path };
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    }
  }

  async function loadBrowserCaptures(
    accountId = collectionJobForm.accountId,
    groupId = collectionJobForm.groupId,
  ) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (accountId) params.set("account_id", accountId);
      if (groupId) params.set("group_id", groupId);
      const query = params.toString();
      const data = await fetchJson<{
        items: BrowserCapture[];
        total: number;
      }>(`/api/browser-captures${query ? `?${query}` : ""}`, "网页快照列表加载");
      setBrowserCaptures(data.items);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `网页快照读取失败：${requestError.message}`
          : "网页快照读取失败",
      );
    }
  }

  async function generateBrowserCaptureSnippet() {
    setJobLoading(true);
    setJobMessage(null);
    setError(null);
    try {
      if (
        !collectionJobForm.accountId ||
        !collectionJobForm.groupId ||
        !collectionJobForm.rangeStart ||
        !collectionJobForm.rangeEnd
      ) {
        throw new Error("请先选择账号、群聊、开始时间和结束时间");
      }
      const params = new URLSearchParams({
        account_id: collectionJobForm.accountId,
        group_id: collectionJobForm.groupId,
        range_start: formatDateTimeLocal(collectionJobForm.rangeStart),
        range_end: formatDateTimeLocal(collectionJobForm.rangeEnd),
      });
      const response = await fetch(`${API_BASE_URL}/api/browser-capture/snippet?${params.toString()}`);
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "网页快照脚本生成失败");
      }
      const data = (await response.json()) as { script: string };
      setBrowserCaptureSnippet(data.script);
      setJobMessage("网页快照脚本已生成");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function copyBrowserCaptureSnippet() {
    if (!browserCaptureSnippet) return;
    await navigator.clipboard.writeText(browserCaptureSnippet);
    setJobMessage("网页快照脚本已复制");
  }

  async function previewBrowserCapture(captureId: number) {
    setJobLoading(true);
    setJobMessage(null);
    setError(null);
    try {
      const data = await fetchJson<BrowserCaptureParsePreview>(
        `/api/browser-captures/${captureId}/parse-preview`,
        "网页快照解析预览",
      );
      setBrowserCapturePreview(data);
      setJobMessage(
        `快照 #${captureId} 解析出 ${data.parsed_count} 条消息，重复 ${data.duplicate_count} 条`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function importBrowserCapture() {
    if (!browserCapturePreview) return;
    const confirmed = window.confirm(
      `确认将快照 #${browserCapturePreview.capture_id} 中解析出的 ${browserCapturePreview.parsed_count} 条消息写入数据库？`,
    );
    if (!confirmed) return;

    setJobLoading(true);
    setJobMessage(null);
    setError(null);
    try {
      const result = await fetchJson<BrowserCaptureImportResult>(
        `/api/browser-captures/${browserCapturePreview.capture_id}/import`,
        "网页快照入库",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );
      setJobMessage(
        `已入库 ${result.inserted_count} 条，跳过 ${result.skipped_count} 条，重复 ${result.duplicate_count} 条`,
      );
      setBrowserCapturePreview(null);
      await loadBrowserCaptures();
      await loadCollectionJobs();
      await loadMessages(appliedFilters);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function createCollectionJob() {
    setJobLoading(true);
    setJobMessage(null);
    setError(null);
    try {
      if (
        !collectionJobForm.accountId ||
        !collectionJobForm.groupId ||
        !collectionJobForm.rangeStart ||
        !collectionJobForm.rangeEnd
      ) {
        throw new Error("请先选择账号、群聊、开始时间和结束时间");
      }
      const response = await fetch(`${API_BASE_URL}/api/collection-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: Number(collectionJobForm.accountId),
          group_id: Number(collectionJobForm.groupId),
          range_start: formatDateTimeLocal(collectionJobForm.rangeStart),
          range_end: formatDateTimeLocal(collectionJobForm.rangeEnd),
          collector_type: "time_range_placeholder",
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "采集任务创建失败");
      }
      const created = (await response.json()) as CollectionJob;
      setJobMessage(`已创建采集任务 #${created.id}`);
      await loadCollectionJobs();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function runSingleGroupFileCollection() {
    setJobLoading(true);
    setJobMessage(null);
    setError(null);
    try {
      if (
        !collectionJobForm.accountId ||
        !collectionJobForm.groupId ||
        !collectionJobForm.rangeStart ||
        !collectionJobForm.rangeEnd ||
        !collectionJobForm.sourceFile
      ) {
        throw new Error("请先选择账号、群聊、开始时间、结束时间和采集文件");
      }
      const response = await fetch(`${API_BASE_URL}/api/collection-jobs/single-group-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: Number(collectionJobForm.accountId),
          group_id: Number(collectionJobForm.groupId),
          range_start: formatDateTimeLocal(collectionJobForm.rangeStart),
          range_end: formatDateTimeLocal(collectionJobForm.rangeEnd),
          source_file: collectionJobForm.sourceFile,
          copy_local_attachments: true,
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "单群聊文件采集失败");
      }
      const result = (await response.json()) as {
        summary: SingleGroupCollectionSummary;
        job: CollectionJob;
      };
      setJobMessage(
        `已完成采集 #${result.summary.collection_job_id}：新增 ${result.summary.inserted_count}，跳过 ${result.summary.skipped_count}，红包 ${result.summary.red_packet_count}，附件 ${result.summary.attachment_count}`,
      );
      await loadCollectionJobs();
      await loadOptions();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setJobLoading(false);
    }
  }

  async function loadVerificationReports(status = verificationStatusFilter) {
    setVerificationLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (status) params.set("verification_status", status);
      const response = await fetch(`${API_BASE_URL}/api/weibo-verifications?${params.toString()}`);
      if (!response.ok) throw new Error("微博验证记录加载失败");
      const data = (await response.json()) as {
        items: WeiboVerificationReport[];
        total: number;
      };
      setVerificationReports(data.items);
      setVerificationTotal(data.total);
      if (
        selectedVerificationId !== null &&
        !data.items.some((report) => report.id === selectedVerificationId)
      ) {
        setSelectedVerificationId(null);
        setSelectedVerification(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function loadVerificationDetail(reportId: number) {
    setVerificationLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/weibo-verifications/${reportId}`);
      if (!response.ok) throw new Error("微博验证详情加载失败");
      setSelectedVerification((await response.json()) as WeiboVerificationReport);
      setSelectedVerificationId(reportId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function createVerificationReport() {
    setVerificationLoading(true);
    setVerificationMessage(null);
    setError(null);
    try {
      if (!verificationForm.accountId || !verificationForm.groupId) {
        throw new Error("请先选择账号和群聊");
      }
      const response = await fetch(`${API_BASE_URL}/api/weibo-verifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: Number(verificationForm.accountId),
          group_id: Number(verificationForm.groupId),
          history_days_checked: verificationForm.historyDaysChecked
            ? Number(verificationForm.historyDaysChecked)
            : null,
          risk_level: verificationForm.riskLevel,
          verification_status: verificationForm.verificationStatus,
          notes: verificationForm.notes.trim() || null,
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "微博验证记录创建失败");
      }
      const created = (await response.json()) as WeiboVerificationReport;
      setVerificationMessage(`已创建微博验证记录 #${created.id}`);
      setSelectedVerification(created);
      setSelectedVerificationId(created.id);
      await loadVerificationReports();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setVerificationLoading(false);
    }
  }

  function updateSelectedVerification<K extends keyof WeiboVerificationReport>(
    key: K,
    value: WeiboVerificationReport[K],
  ) {
    setSelectedVerification((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveVerificationReport() {
    if (!selectedVerification) return;
    setVerificationLoading(true);
    setVerificationMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/weibo-verifications/${selectedVerification.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            can_login: selectedVerification.can_login,
            can_view_group: selectedVerification.can_view_group,
            can_view_history: selectedVerification.can_view_history,
            history_days_checked: selectedVerification.history_days_checked,
            can_page_history: selectedVerification.can_page_history,
            can_access_images: selectedVerification.can_access_images,
            can_access_files: selectedVerification.can_access_files,
            can_access_links: selectedVerification.can_access_links,
            red_packet_identified: selectedVerification.red_packet_identified,
            rate_limit_observed: selectedVerification.rate_limit_observed,
            risk_level: selectedVerification.risk_level,
            verification_status: selectedVerification.verification_status,
            notes: selectedVerification.notes,
          }),
        },
      );
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "微博验证记录保存失败");
      }
      setSelectedVerification((await response.json()) as WeiboVerificationReport);
      setVerificationMessage("微博验证记录已保存");
      await loadVerificationReports();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function createObservation() {
    if (!selectedVerification) return;
    setVerificationLoading(true);
    setVerificationMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/weibo-verifications/${selectedVerification.id}/observations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observation_type: observationForm.observationType,
            method: observationForm.method.trim() || null,
            endpoint_path: observationForm.endpointPath.trim() || null,
            request_fields: parseJsonText(observationForm.requestFields, "请求字段"),
            response_fields: parseJsonText(observationForm.responseFields, "响应字段"),
            sample_payload: parseJsonText(observationForm.samplePayload, "样例内容"),
            pagination_fields: parseJsonText(observationForm.paginationFields, "分页字段"),
            redaction_notes: observationForm.redactionNotes.trim() || null,
          }),
        },
      );
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail || "接口观察记录创建失败");
      }
      setObservationForm(emptyObservationForm);
      setVerificationMessage("已添加脱敏观察记录");
      await loadVerificationDetail(selectedVerification.id);
      await loadVerificationReports();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function loadJobView() {
    setError(null);
    const optionsData = await loadOptions();
    const { accountId, groupId } = resolveCollectionTarget(optionsData, collectionJobForm);
    await loadCollectionJobs();
    await loadImportFiles();
    await loadBrowserCaptures(accountId, groupId);
    setError(null);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      try {
        await loadJobView();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "无法连接后端，请确认 127.0.0.1:8000 已启动",
        );
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (selectedMessageId !== null) {
      void loadDetail(selectedMessageId);
    }
  }, [selectedMessageId]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "accountId") next.groupId = "";
      return next;
    });
    setActionPreview(null);
    setDeleteResult(null);
  }

  function applySearch() {
    setAppliedFilters(filters);
    setSelectedMessageId(null);
    setActionPreview(null);
    setDeleteResult(null);
    void loadMessages(filters);
  }

  function resetSearch() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSelectedMessageId(null);
    setActionPreview(null);
    setDeleteResult(null);
    void loadMessages(emptyFilters);
  }

  function loadMore() {
    if (!nextCursor || loadingMore) return;
    void loadMessages(appliedFilters, "append", nextCursor);
  }

  function switchView(nextViewMode: ViewMode) {
    setViewMode(nextViewMode);
    setSelectedMessageId(null);
    setDetail(null);
    setActionPreview(null);
    setDeleteResult(null);
    setJobMessage(null);
    setVerificationMessage(null);
    if (nextViewMode === "jobs") {
      void loadJobView().catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "请求失败");
      });
    } else if (nextViewMode === "weibo") {
      void loadVerificationReports();
    } else {
      void loadMessages(appliedFilters, "replace", null, nextViewMode);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>微博群聊归档库</h1>
          <p>
            {viewMode === "jobs"
              ? "创建时间段采集任务，等待后续微博采集适配器接入"
              : viewMode === "weibo"
                ? "记录微博实机验证结果和脱敏接口观察，为真实采集器做准备"
              : viewMode === "deleted"
                ? "回收站：查看、恢复或彻底删除已删除消息"
                : "按日期分组展示，游标分页加载更早消息"}
          </p>
        </div>
        <div className="header-actions">
          <button
            className={viewMode === "active" ? "icon-button" : "secondary-button"}
            type="button"
            onClick={() => switchView("active")}
          >
            消息
          </button>
          <button
            className={viewMode === "deleted" ? "icon-button" : "secondary-button"}
            type="button"
            onClick={() => switchView("deleted")}
          >
            回收站
          </button>
          <button
            className={viewMode === "jobs" ? "icon-button" : "secondary-button"}
            type="button"
            onClick={() => switchView("jobs")}
          >
            采集任务
          </button>
          <button
            className={viewMode === "weibo" ? "icon-button" : "secondary-button"}
            type="button"
            onClick={() => switchView("weibo")}
          >
            微博验证
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              viewMode === "jobs"
                ? void loadJobView()
                : viewMode === "weibo"
                  ? void loadVerificationReports()
                  : void loadMessages()
            }
          >
            <RefreshCw size={17} aria-hidden="true" />
            刷新
          </button>
        </div>
      </header>

      <section className="status-row">
        <article>
          {viewMode === "jobs" ? (
            <Clock size={18} aria-hidden="true" />
          ) : viewMode === "weibo" ? (
            <ShieldCheck size={18} aria-hidden="true" />
          ) : (
            <Database size={18} aria-hidden="true" />
          )}
          <span>
            {viewMode === "jobs"
              ? `${collectionJobTotal} 个任务`
              : viewMode === "weibo"
                ? `${verificationTotal} 条验证记录`
                : `${total} 条消息`}
          </span>
        </article>
        <article>
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            {viewMode === "jobs"
              ? "任务只记录时间段，暂不执行微博采集"
              : viewMode === "weibo"
                ? "先记录脱敏结构，不保存 Cookie 或 Token"
              : viewMode === "deleted"
                ? "当前只看已删除消息"
                : `每次加载 ${PAGE_SIZE} 条`}
          </span>
        </article>
        <article>
          <Search size={18} aria-hidden="true" />
          <span>
            {viewMode === "jobs"
              ? "后续接入真实采集器"
              : viewMode === "weibo"
                ? "观察样例必须先脱敏"
                : "正文与附件字段可搜索"}
          </span>
        </article>
      </section>

      {error ? <div className="alert">{error}</div> : null}
      {deleteResult ? <div className="success-alert">{deleteResult}</div> : null}
      {jobMessage ? <div className="success-alert">{jobMessage}</div> : null}
      {verificationMessage ? <div className="success-alert">{verificationMessage}</div> : null}

      {viewMode === "jobs" ? (
        <section className="jobs-workspace">
          <aside className="job-form-panel">
            <div className="panel-title">
              <h2>创建采集任务</h2>
            </div>

            <label>
              <span>账号</span>
              <select
                value={collectionJobForm.accountId}
                onChange={(event) =>
                  setCollectionJobForm((current) => ({
                    ...current,
                    accountId: event.target.value,
                    groupId: "",
                  }))
                }
              >
                <option value="">选择账号</option>
                {options.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>群聊</span>
              <select
                value={collectionJobForm.groupId}
                onChange={(event) =>
                  setCollectionJobForm((current) => ({
                    ...current,
                    groupId: event.target.value,
                  }))
                }
              >
                <option value="">选择群聊</option>
                {visibleCollectionGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>开始时间</span>
              <input
                type="datetime-local"
                value={collectionJobForm.rangeStart}
                onChange={(event) =>
                  setCollectionJobForm((current) => ({
                    ...current,
                    rangeStart: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>结束时间</span>
              <input
                type="datetime-local"
                value={collectionJobForm.rangeEnd}
                onChange={(event) =>
                  setCollectionJobForm((current) => ({
                    ...current,
                    rangeEnd: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>采集文件</span>
              <select
                value={collectionJobForm.sourceFile}
                onChange={(event) =>
                  setCollectionJobForm((current) => ({
                    ...current,
                    sourceFile: event.target.value,
                  }))
                }
              >
                <option value="">选择 data/imports 中的文件</option>
                {importFiles.map((file) => (
                  <option key={file.relative_path} value={file.relative_path}>
                    {file.name} · {formatFileSize(file.size)} · {file.modified_at}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="icon-button full-width-button"
              type="button"
              onClick={createCollectionJob}
              disabled={jobLoading}
            >
              <Clock size={16} aria-hidden="true" />
              创建空任务
            </button>

            <button
              className="secondary-button full-width-button"
              type="button"
              onClick={runSingleGroupFileCollection}
              disabled={jobLoading}
            >
              <Database size={16} aria-hidden="true" />
              执行文件采集
            </button>

            <p className="form-hint">
              文件采集会读取 data/imports 下的 JSON/CSV，按所选时间段入库，并复制本地附件原件。
            </p>

            <section className="capture-box">
              <h3>滚动快照</h3>
              <div className="stacked-buttons">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={generateBrowserCaptureSnippet}
                  disabled={jobLoading}
                >
                  <FileText size={16} aria-hidden="true" />
                  生成滚动脚本
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={copyBrowserCaptureSnippet}
                  disabled={!browserCaptureSnippet}
                >
                  复制脚本
                </button>
              </div>
              {browserCaptureSnippet ? (
                <textarea readOnly rows={6} value={browserCaptureSnippet} />
              ) : null}
              <p className="form-hint">
                脚本会在微博群聊页向上滚动加载历史消息，适合一次采集一周内的大量聊天记录。
              </p>
              <button
                className="secondary-button full-width-button no-side-margin"
                type="button"
                onClick={() => void loadBrowserCaptures()}
              >
                刷新快照
              </button>
              <div className="capture-list">
                {browserCaptures.slice(0, 3).map((capture) => (
                  <article key={capture.id}>
                    <strong>#{capture.id} {capture.group_name}</strong>
                    <span>{capture.captured_at}</span>
                    <span>{capture.text_length} 字符</span>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => void previewBrowserCapture(capture.id)}
                      disabled={jobLoading}
                    >
                      解析预览
                    </button>
                  </article>
                ))}
              </div>
              {browserCapturePreview ? (
                <div className="capture-preview">
                  <div className="capture-preview-header">
                    <strong>快照 #{browserCapturePreview.capture_id}</strong>
                    <span>
                      {browserCapturePreview.parsed_count} 条 / 重复 {browserCapturePreview.duplicate_count} 条
                    </span>
                  </div>
                  <div className="capture-preview-list">
                    {browserCapturePreview.items.slice(0, 5).map((item) => (
                      <article key={item.source_message_id}>
                        <span>{item.sent_at}</span>
                        <strong>{item.sender_name}</strong>
                        <p>{item.content_text}</p>
                        {item.is_duplicate ? <em>已存在</em> : null}
                      </article>
                    ))}
                  </div>
                  <button
                    className="icon-button full-width-button no-side-margin"
                    type="button"
                    onClick={() => void importBrowserCapture()}
                    disabled={jobLoading || browserCapturePreview.parsed_count <= 0}
                  >
                    确认入库
                  </button>
                </div>
              ) : null}
            </section>
          </aside>

          <section className="job-list-panel">
            <div className="panel-title">
              <h2>采集任务</h2>
              <span>{jobLoading ? "加载中" : `${collectionJobs.length} / ${collectionJobTotal}`}</span>
            </div>

            <div className="job-toolbar">
              <select
                value={collectionJobStatusFilter}
                onChange={(event) => {
                  setCollectionJobStatusFilter(event.target.value);
                  void loadCollectionJobs(event.target.value);
                }}
              >
                <option value="">全部状态</option>
                <option value="pending">pending</option>
                <option value="running">running</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <div className="job-list">
              {collectionJobs.map((job) => (
                <article className="job-card" key={job.id}>
                  <div className="job-card-header">
                    <strong>#{job.id} {job.group_name}</strong>
                    <span className={`job-status status-${job.status}`}>{job.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>账号</dt>
                      <dd>{job.account_name}</dd>
                    </div>
                    <div>
                      <dt>时间段</dt>
                      <dd>{job.range_start} 至 {job.range_end}</dd>
                    </div>
                    <div>
                      <dt>采集器</dt>
                      <dd>{job.collector_type}</dd>
                    </div>
                    <div>
                      <dt>结果</dt>
                      <dd>
                        新增 {job.inserted_count}，跳过 {job.skipped_count}，失败 {job.failed_count}
                      </dd>
                    </div>
                    <div>
                      <dt>创建</dt>
                      <dd>{job.created_at}</dd>
                    </div>
                  </dl>
                  {job.error_message ? <p className="job-error">{job.error_message}</p> : null}
                </article>
              ))}

              {!jobLoading && collectionJobs.length === 0 ? (
                <div className="empty-state">还没有采集任务</div>
              ) : null}
            </div>
          </section>
        </section>
      ) : viewMode === "weibo" ? (
        <section className="verification-workspace">
          <aside className="verification-form-panel">
            <div className="panel-title">
              <h2>创建验证记录</h2>
            </div>

            <label>
              <span>账号</span>
              <select
                value={verificationForm.accountId}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    accountId: event.target.value,
                    groupId: "",
                  }))
                }
              >
                <option value="">选择账号</option>
                {options.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>群聊</span>
              <select
                value={verificationForm.groupId}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    groupId: event.target.value,
                  }))
                }
              >
                <option value="">选择群聊</option>
                {visibleVerificationGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>核验历史天数</span>
              <input
                min="0"
                type="number"
                value={verificationForm.historyDaysChecked}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    historyDaysChecked: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>风险级别</span>
              <select
                value={verificationForm.riskLevel}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    riskLevel: event.target.value as VerificationReportForm["riskLevel"],
                  }))
                }
              >
                <option value="unknown">未确认</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>

            <label>
              <span>验证状态</span>
              <select
                value={verificationForm.verificationStatus}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    verificationStatus:
                      event.target.value as VerificationReportForm["verificationStatus"],
                  }))
                }
              >
                <option value="draft">记录中</option>
                <option value="verified">已验证</option>
                <option value="blocked">受阻</option>
              </select>
            </label>

            <label>
              <span>备注</span>
              <textarea
                rows={4}
                value={verificationForm.notes}
                onChange={(event) =>
                  setVerificationForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="只记录现象和字段含义，不粘贴 Cookie、Token、Authorization。"
              />
            </label>

            <button
              className="icon-button full-width-button"
              type="button"
              onClick={createVerificationReport}
              disabled={verificationLoading}
            >
              <Plus size={16} aria-hidden="true" />
              创建记录
            </button>

            <p className="form-hint">
              每个微博账号对应一个群聊时，建议分别创建记录，所有结果会进入同一个 SQLite 数据库。
            </p>
          </aside>

          <section className="verification-list-panel">
            <div className="panel-title">
              <h2>验证记录</h2>
              <span>
                {verificationLoading ? "加载中" : `${verificationReports.length} / ${verificationTotal}`}
              </span>
            </div>

            <div className="job-toolbar">
              <select
                value={verificationStatusFilter}
                onChange={(event) => {
                  setVerificationStatusFilter(event.target.value);
                  void loadVerificationReports(event.target.value);
                }}
              >
                <option value="">全部状态</option>
                <option value="draft">记录中</option>
                <option value="verified">已验证</option>
                <option value="blocked">受阻</option>
              </select>
            </div>

            <div className="verification-list">
              {verificationReports.map((report) => (
                <button
                  className={
                    selectedVerificationId === report.id
                      ? "verification-card selected"
                      : "verification-card"
                  }
                  key={report.id}
                  type="button"
                  onClick={() => void loadVerificationDetail(report.id)}
                >
                  <div className="job-card-header">
                    <strong>#{report.id} {report.group_name}</strong>
                    <span className={`job-status status-${report.verification_status}`}>
                      {formatVerificationStatus(report.verification_status)}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>账号</dt>
                      <dd>{report.account_name}</dd>
                    </div>
                    <div>
                      <dt>核验天数</dt>
                      <dd>{report.history_days_checked ?? "未填"}</dd>
                    </div>
                    <div>
                      <dt>风险</dt>
                      <dd>{formatRiskLevel(report.risk_level)}</dd>
                    </div>
                    <div>
                      <dt>观察</dt>
                      <dd>{report.observation_count ?? 0} 条</dd>
                    </div>
                  </dl>
                </button>
              ))}

              {!verificationLoading && verificationReports.length === 0 ? (
                <div className="empty-state">还没有微博验证记录</div>
              ) : null}
            </div>
          </section>

          <aside className="verification-detail-panel">
            <div className="panel-title">
              <h2>验证详情</h2>
              <span>
                {verificationLoading ? "加载中" : selectedVerification ? `#${selectedVerification.id}` : "未选择"}
              </span>
            </div>

            {selectedVerification ? (
              <div className="verification-detail-body">
                <section className="verification-section">
                  <h3>验证结论</h3>
                  <div className="checkbox-grid">
                    {verificationBooleanFields.map((field) => (
                      <label className="checkbox-row" key={field.key}>
                        <input
                          checked={Boolean(selectedVerification[field.key])}
                          type="checkbox"
                          onChange={(event) =>
                            updateSelectedVerification(field.key, event.target.checked)
                          }
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>

                  <label>
                    <span>核验历史天数</span>
                    <input
                      min="0"
                      type="number"
                      value={selectedVerification.history_days_checked ?? ""}
                      onChange={(event) =>
                        updateSelectedVerification(
                          "history_days_checked",
                          event.target.value ? Number(event.target.value) : null,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>风险级别</span>
                    <select
                      value={selectedVerification.risk_level}
                      onChange={(event) =>
                        updateSelectedVerification(
                          "risk_level",
                          event.target.value as WeiboVerificationReport["risk_level"],
                        )
                      }
                    >
                      <option value="unknown">未确认</option>
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </label>

                  <label>
                    <span>验证状态</span>
                    <select
                      value={selectedVerification.verification_status}
                      onChange={(event) =>
                        updateSelectedVerification(
                          "verification_status",
                          event.target.value as WeiboVerificationReport["verification_status"],
                        )
                      }
                    >
                      <option value="draft">记录中</option>
                      <option value="verified">已验证</option>
                      <option value="blocked">受阻</option>
                    </select>
                  </label>

                  <label>
                    <span>备注</span>
                    <textarea
                      rows={4}
                      value={selectedVerification.notes ?? ""}
                      onChange={(event) =>
                        updateSelectedVerification("notes", event.target.value)
                      }
                    />
                  </label>

                  <button
                    className="icon-button full-width-button no-side-margin"
                    type="button"
                    onClick={saveVerificationReport}
                    disabled={verificationLoading}
                  >
                    <Save size={16} aria-hidden="true" />
                    保存结论
                  </button>
                </section>

                <section className="verification-section">
                  <h3>添加脱敏观察</h3>
                  <label>
                    <span>类型</span>
                    <select
                      value={observationForm.observationType}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          observationType: event.target.value as ObservationForm["observationType"],
                        }))
                      }
                    >
                      <option value="message_history">历史消息</option>
                      <option value="pagination">分页</option>
                      <option value="image">图片</option>
                      <option value="file">文件</option>
                      <option value="link">链接</option>
                      <option value="red_packet">红包</option>
                      <option value="error">错误</option>
                      <option value="official_api">官方接口</option>
                    </select>
                  </label>

                  <div className="two-column-fields">
                    <label>
                      <span>方法</span>
                      <input
                        value={observationForm.method}
                        onChange={(event) =>
                          setObservationForm((current) => ({
                            ...current,
                            method: event.target.value,
                          }))
                        }
                        placeholder="GET / POST"
                      />
                    </label>
                    <label>
                      <span>路径</span>
                      <input
                        value={observationForm.endpointPath}
                        onChange={(event) =>
                          setObservationForm((current) => ({
                            ...current,
                            endpointPath: event.target.value,
                          }))
                        }
                        placeholder="/example/path"
                      />
                    </label>
                  </div>

                  <label>
                    <span>请求字段 JSON</span>
                    <textarea
                      rows={3}
                      value={observationForm.requestFields}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          requestFields: event.target.value,
                        }))
                      }
                      placeholder='{"group_id":"脱敏群 ID","start_time":"2026-06-01 00:00:00"}'
                    />
                  </label>

                  <label>
                    <span>响应字段 JSON</span>
                    <textarea
                      rows={3}
                      value={observationForm.responseFields}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          responseFields: event.target.value,
                        }))
                      }
                      placeholder='{"messages":[],"next_cursor":"脱敏游标"}'
                    />
                  </label>

                  <label>
                    <span>样例内容 JSON</span>
                    <textarea
                      rows={4}
                      value={observationForm.samplePayload}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          samplePayload: event.target.value,
                        }))
                      }
                      placeholder='{"message_id":"脱敏消息 ID","text":"示例正文"}'
                    />
                  </label>

                  <label>
                    <span>分页字段 JSON</span>
                    <textarea
                      rows={3}
                      value={observationForm.paginationFields}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          paginationFields: event.target.value,
                        }))
                      }
                      placeholder='{"cursor":"脱敏游标","has_more":true}'
                    />
                  </label>

                  <label>
                    <span>脱敏备注</span>
                    <textarea
                      rows={3}
                      value={observationForm.redactionNotes}
                      onChange={(event) =>
                        setObservationForm((current) => ({
                          ...current,
                          redactionNotes: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button
                    className="secondary-button full-width-button no-side-margin"
                    type="button"
                    onClick={createObservation}
                    disabled={verificationLoading}
                  >
                    <Plus size={16} aria-hidden="true" />
                    添加观察
                  </button>
                </section>

                <section className="verification-section">
                  <h3>已有观察</h3>
                  <div className="observation-list">
                    {(selectedVerification.observations ?? []).map((observation) => (
                      <article className="observation-item" key={observation.id}>
                        <div className="job-card-header">
                          <strong>{formatObservationType(observation.observation_type)}</strong>
                          <span>{observation.created_at}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>方法</dt>
                            <dd>{observation.method || "未填"}</dd>
                          </div>
                          <div>
                            <dt>路径</dt>
                            <dd>{observation.endpoint_path || "未填"}</dd>
                          </div>
                        </dl>
                        {observation.redaction_notes ? (
                          <p className="form-hint no-side-margin">{observation.redaction_notes}</p>
                        ) : null}
                        {observation.sample_payload ? (
                          <pre>{stringifyJsonPreview(observation.sample_payload)}</pre>
                        ) : null}
                      </article>
                    ))}

                    {(selectedVerification.observations ?? []).length === 0 ? (
                      <p className="muted">还没有接口或页面观察记录</p>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : (
              <div className="empty-state">请选择或创建一条验证记录</div>
            )}
          </aside>
        </section>
      ) : (
      <section className="workspace">
        <aside className="filter-panel">
          <div className="panel-title">
            <h2>筛选</h2>
          </div>

          <label>
            <span>账号</span>
            <select
              value={filters.accountId}
              onChange={(event) => updateFilter("accountId", event.target.value)}
            >
              <option value="">全部账号</option>
              {options.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.display_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>群聊</span>
            <select
              value={filters.groupId}
              onChange={(event) => updateFilter("groupId", event.target.value)}
            >
              <option value="">全部群聊</option>
              {visibleGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>用户</span>
            <input
              value={filters.user}
              onChange={(event) => updateFilter("user", event.target.value)}
              placeholder="昵称或用户 ID"
            />
          </label>

          <label>
            <span>关键词</span>
            <input
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="正文、链接、文件名"
            />
          </label>

          <div className="date-grid">
            <label>
              <span>开始日期</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
              />
            </label>
            <label>
              <span>结束日期</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => updateFilter("dateTo", event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>消息类型</span>
            <select
              value={filters.messageType}
              onChange={(event) => updateFilter("messageType", event.target.value)}
            >
              <option value="">全部类型</option>
              {options.message_types.map((type) => (
                <option key={type} value={type}>
                  {formatMessageType(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>附件</span>
            <select
              value={filters.hasAttachment}
              onChange={(event) => updateFilter("hasAttachment", event.target.value)}
            >
              <option value="">全部消息</option>
              <option value="true">有附件</option>
              <option value="false">无附件</option>
            </select>
          </label>

          <div className="button-row">
            <button className="icon-button" type="button" onClick={applySearch}>
              <Search size={16} aria-hidden="true" />
              搜索
            </button>
            <button className="secondary-button" type="button" onClick={resetSearch}>
              重置
            </button>
          </div>

          {viewMode === "active" ? (
            <section className="delete-box">
              <h3>批量软删除</h3>
              <p>删除对象为当前搜索结果，默认只标记删除，不移除附件原件。</p>
              <button
                className="danger-outline-button"
                type="button"
                onClick={() => void previewAction("soft-delete")}
                disabled={deleting}
              >
                <Trash2 size={15} aria-hidden="true" />
                预览删除数量
              </button>
              {actionPreview?.action === "soft-delete" ? (
                <div className="delete-preview">
                  <strong>{actionPreview.preview_count}</strong>
                  <span>条消息将被软删除</span>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={executeSoftDelete}
                    disabled={deleting || actionPreview.preview_count <= 0}
                  >
                    确认软删除
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="delete-box recycle-box">
              <h3>回收站操作</h3>
              <p>恢复会让消息重新回到普通列表。彻底删除只删除数据库记录和附件记录，不删除磁盘原件。</p>
              <div className="stacked-buttons">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void previewAction("restore")}
                  disabled={deleting}
                >
                  预览恢复数量
                </button>
                <button
                  className="danger-outline-button"
                  type="button"
                  onClick={() => void previewAction("hard-delete")}
                  disabled={deleting}
                >
                  预览彻底删除
                </button>
              </div>
              {actionPreview?.action === "restore" ? (
                <div className="delete-preview restore-preview">
                  <strong>{actionPreview.preview_count}</strong>
                  <span>条消息将被恢复</span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={executeRestore}
                    disabled={deleting || actionPreview.preview_count <= 0}
                  >
                    确认恢复
                  </button>
                </div>
              ) : null}
              {actionPreview?.action === "hard-delete" ? (
                <div className="delete-preview">
                  <strong>{actionPreview.preview_count}</strong>
                  <span>
                    条消息和 {actionPreview.attachment_record_count ?? 0} 条附件记录将被彻底删除
                  </span>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={executeHardDelete}
                    disabled={deleting || actionPreview.preview_count <= 0}
                  >
                    确认彻底删除
                  </button>
                </div>
              ) : null}
            </section>
          )}
        </aside>

        <section className="message-panel">
          <div className="panel-title">
            <h2>{viewMode === "deleted" ? "回收站" : "消息列表"}</h2>
            <span>{loading ? "加载中" : `${messages.length} / ${total}`}</span>
          </div>

          <div className="message-list">
            {groupedMessages.map((group) => (
              <section className="date-group" key={group.date}>
                <h3>{group.date}</h3>
                {group.items.map((message) => (
                  <button
                    className={
                      selectedMessageId === message.id
                        ? "message-row selected"
                        : "message-row"
                    }
                    key={message.id}
                    type="button"
                    onClick={() => setSelectedMessageId(message.id)}
                  >
                    <div className="message-meta">
                      <strong>{message.sender_name}</strong>
                      <span>{message.sent_at}</span>
                    </div>
                    <p>{message.content_text || "(无文本内容)"}</p>
                    <div className="message-tags">
                      <span>{message.account_name}</span>
                      <span>{message.group_name}</span>
                      <span>{formatMessageType(message.message_type)}</span>
                      {message.attachment_count > 0 ? (
                        <span>附件 {message.attachment_count}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </section>
            ))}

            {!loading && messages.length === 0 ? (
              <div className="empty-state">
                {viewMode === "deleted" ? "回收站没有符合条件的消息" : "没有找到符合条件的消息"}
              </div>
            ) : null}

            {messages.length > 0 ? (
              <div className="load-more-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={loadMore}
                  disabled={!hasMore || loadingMore}
                >
                  {hasMore ? (loadingMore ? "加载中" : "加载更早消息") : "没有更多消息"}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="detail-panel">
          <div className="panel-title">
            <h2>消息详情</h2>
            <span>{detailLoading ? "加载中" : detail ? `#${detail.id}` : "未选择"}</span>
          </div>

          {detail ? (
            <div className="detail-body">
              <dl>
                <div>
                  <dt>账号</dt>
                  <dd>{detail.account_name}</dd>
                </div>
                <div>
                  <dt>群聊</dt>
                  <dd>{detail.group_name}</dd>
                </div>
                <div>
                  <dt>用户</dt>
                  <dd>{detail.sender_name}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{detail.sent_at}</dd>
                </div>
                <div>
                  <dt>类型</dt>
                  <dd>{formatMessageType(detail.message_type)}</dd>
                </div>
              </dl>

              <section>
                <h3>正文</h3>
                <p className="detail-text">{detail.content_text || "(无文本内容)"}</p>
              </section>

              <section>
                <h3>附件</h3>
                {detail.attachments.length > 0 ? (
                  <div className="attachment-list">
                    {detail.attachments.map((attachment) => {
                      const Icon = getAttachmentIcon(attachment.attachment_type);
                      return (
                        <article className="attachment-item" key={attachment.id}>
                          <Icon size={17} aria-hidden="true" />
                          <div>
                            <strong>
                              {attachment.file_name || attachment.title || attachment.attachment_type}
                            </strong>
                            <span>{attachment.download_status}</span>
                            {attachment.source_url ? (
                              <a href={attachment.source_url} target="_blank" rel="noreferrer">
                                {attachment.source_url}
                              </a>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">无附件</p>
                )}
              </section>
            </div>
          ) : (
            <div className="empty-state">请选择一条消息</div>
          )}
        </aside>
      </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
