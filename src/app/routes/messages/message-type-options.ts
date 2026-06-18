export interface MessageTypeOption {
  value: string;
  label: string;
}

export const MESSAGE_TYPE_OPTIONS: MessageTypeOption[] = [
  { value: 'release_published_notice', label: '版本发布通知' },
  { value: 'device_offline_notice', label: '设备离线通知' },
  { value: 'disk_usage_high_notice', label: '磁盘阈值通知' },
];

export const DEFAULT_MESSAGE_TYPES = [MESSAGE_TYPE_OPTIONS[0].value];

export function parseMessageTypes(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeMessageTypes(value?: string | string[] | null, fallback = DEFAULT_MESSAGE_TYPES): string[] {
  const parsed = parseMessageTypes(value);
  return parsed.length ? parsed : fallback;
}

export function messageTypeLabel(value: string): string {
  return MESSAGE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}
