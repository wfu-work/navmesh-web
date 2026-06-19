import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface MessageQuery {
  page?: number;
  size?: number;
  keyword?: string;
  status?: string | number;
  sendStatus?: string;
  receiveStatus?: string;
  channel?: string;
  tag?: string;
  messageType?: string;
  templateCode?: string;
  recipient?: string;
  batchGuid?: string;
}

export interface MessageEmailConfig {
  guid: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  fromEmail: string;
  from_email?: string;
  fromName: string;
  from_name?: string;
  encryption: string;
  isDefault: boolean;
  is_default?: boolean;
  remark: string;
  status: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface MessageTemplate {
  guid?: string;
  id?: string;
  code: string;
  name: string;
  channel: string;
  subject: string;
  content: string;
  description: string;
  status: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface MessageDebugSendRequest {
  templateCode: string;
  recipientGuids: string[];
}

export interface MessageDebugSendResult {
  recipients: number;
  subject: string;
  successes: number;
  failures: number;
}

export interface MessageTemplatePreviewRequest {
  code: string;
  subject: string;
  content: string;
}

export interface MessageTemplatePreviewResult {
  subject: string;
  html: string;
}

export interface MessageRecipient {
  guid: string;
  name: string;
  email: string;
  messageTypes: string;
  message_types?: string;
  tags: string;
  remark: string;
  status: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface MessageSendRecord {
  guid: string;
  batchGuid: string;
  batch_guid?: string;
  channel: string;
  templateCode: string;
  template_code?: string;
  templateName: string;
  template_name?: string;
  subject: string;
  recipientGuid: string;
  recipient_guid?: string;
  recipientName: string;
  recipient_name?: string;
  recipientEmail: string;
  recipient_email?: string;
  fromEmail: string;
  from_email?: string;
  fromName: string;
  from_name?: string;
  sendStatus: string;
  send_status?: string;
  receiveStatus: string;
  receive_status?: string;
  retryCount: number;
  retry_count?: number;
  maxRetries: number;
  max_retries?: number;
  errorMessage: string;
  error_message?: string;
  lastSendTime?: number;
  last_send_time?: number;
  nextRetryTime?: number;
  next_retry_time?: number;
  successTime?: number;
  success_time?: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly http = inject(HttpClient);

  emailConfigs(params?: MessageQuery): Observable<PageEntity<MessageEmailConfig>> {
    return this.http.get<PageEntity<MessageEmailConfig>>('/messages/email-configs/list', {
      params: this.cleanParams(params),
    });
  }

  saveEmailConfig(payload: Partial<MessageEmailConfig>): Observable<MessageEmailConfig> {
    return this.http.post<MessageEmailConfig>('/messages/email-configs', payload);
  }

  setDefaultEmailConfig(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/messages/email-configs/${guid}/default`, {});
  }

  disableEmailConfig(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/email-configs/${guid}`);
  }

  deleteEmailConfig(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/email-configs/${guid}/delete`);
  }

  templates(params?: MessageQuery): Observable<PageEntity<MessageTemplate>> {
    return this.http.get<PageEntity<MessageTemplate>>('/messages/templates/list', {
      params: this.cleanParams(params),
    });
  }

  template(guid: string): Observable<MessageTemplate> {
    return this.http.get<MessageTemplate>(`/messages/templates/${guid}`);
  }

  saveTemplate(payload: Partial<MessageTemplate>): Observable<MessageTemplate> {
    return this.http.post<MessageTemplate>('/messages/templates', payload);
  }

  previewTemplate(payload: MessageTemplatePreviewRequest): Observable<MessageTemplatePreviewResult> {
    return this.http.post<MessageTemplatePreviewResult>('/messages/templates/preview', payload);
  }

  disableTemplate(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/templates/${guid}`);
  }

  deleteTemplate(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/templates/${guid}/delete`);
  }

  recipients(params?: MessageQuery): Observable<PageEntity<MessageRecipient>> {
    return this.http.get<PageEntity<MessageRecipient>>('/messages/recipients/list', {
      params: this.cleanParams(params),
    });
  }

  saveRecipient(payload: Partial<MessageRecipient>): Observable<MessageRecipient> {
    return this.http.post<MessageRecipient>('/messages/recipients', payload);
  }

  disableRecipient(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/recipients/${guid}`);
  }

  deleteRecipient(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/recipients/${guid}/delete`);
  }

  sendRecords(params?: MessageQuery): Observable<PageEntity<MessageSendRecord>> {
    return this.http.get<PageEntity<MessageSendRecord>>('/messages/send-records/list', {
      params: this.cleanParams(params),
    });
  }

  sendRecord(guid: string): Observable<MessageSendRecord> {
    return this.http.get<MessageSendRecord>(`/messages/send-records/${guid}`);
  }

  retrySendRecord(guid: string): Observable<MessageSendRecord> {
    return this.http.post<MessageSendRecord>(`/messages/send-records/${guid}/retry`, {});
  }

  deleteSendRecord(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/messages/send-records/${guid}/delete`);
  }

  debugSend(payload: MessageDebugSendRequest): Observable<MessageDebugSendResult> {
    return this.http.post<MessageDebugSendResult>('/messages/send-records/debug', payload);
  }

  private cleanParams(params?: MessageQuery): Record<string, string | number> {
    const requestParams: Record<string, string | number> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        requestParams[key] = value;
      }
    });
    return requestParams;
  }
}
