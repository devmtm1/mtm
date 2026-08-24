export interface SettingListItem {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  redacted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettingPayload {
  key: string;
  value: unknown;
  description?: string;
  isSensitive?: boolean;
}
