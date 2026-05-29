import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import {
  EventItem,
  EventStatus,
  EventsService,
  eventDisplayMessage,
  eventDisplayTitle,
  isClosedEventStatus,
  isOpenEventStatus,
} from '../events.service';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected loading = false;
  protected event?: EventItem;
  protected device?: Device;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (!this.guid) {
      this.message.error('事件标识不存在');
      return;
    }

    this.loading = true;
    this.eventsService
      .list({ page: 1, size: 500 })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          const item = (res.data ?? []).find((event) => event.guid === this.guid);
          this.event = item ? this.normalizeEvent(item) : undefined;
          this.device = undefined;
          if (this.event?.deviceGuid) {
            this.loadDevice(this.event.deviceGuid);
          }
        },
        error: () => this.message.error('事件详情加载失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/events/list']);
  }

  protected ack(): void {
    if (!this.guid) return;
    this.eventsService.ack(this.guid).subscribe({
      next: () => {
        this.message.success('事件已处理');
        this.load();
      },
      error: () => this.message.error('事件确认失败'),
    });
  }

  protected close(): void {
    if (!this.guid) return;
    this.eventsService.close(this.guid).subscribe({
      next: () => {
        this.message.success('事件已关闭');
        this.load();
      },
      error: () => this.message.error('事件关闭失败'),
    });
  }

  protected title(): string {
    return this.event?.title || this.guid || '事件详情';
  }

  protected deviceName(): string {
    return this.device?.name || this.device?.hostname || this.event?.deviceGuid || '-';
  }

  protected statusText(status: EventStatus | undefined): string {
    const map: Record<string, string> = {
      0: '已关闭',
      1: '未处理',
      2: '已关闭',
    };
    return map[String(status)] ?? '未知';
  }

  protected statusClass(status: EventStatus | undefined): string {
    const map: Record<string, string> = {
      0: 'status-closed',
      1: 'status-open',
      2: 'status-closed',
    };
    return map[String(status)] ?? 'status-unknown';
  }

  protected levelText(level: string | undefined): string {
    const map: Record<string, string> = {
      critical: '严重',
      error: '错误',
      high: '高危',
      warn: '警告',
      warning: '警告',
      medium: '中危',
      low: '低危',
      info: '信息',
    };
    return map[String(level)] ?? (level || '-');
  }

  protected sourceText(source: string | undefined): string {
    const map: Record<string, string> = {
      device: '设备',
      device_offline: '设备离线',
      ssh: 'SSH',
      http: 'HTTP',
      tunnel: '隧道',
      auth: '认证',
      mapping: '映射',
      session_rejected: '会话拒绝',
      open_tcp_failed: '连接失败',
    };
    return map[String(source)] ?? (source || '-');
  }

  protected formatDateTime(value: number | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (item: number): string => String(item).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected formatPayload(value: string | undefined): string {
    if (!value) return '-';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  protected isOpen(status: EventStatus | undefined): boolean {
    return isOpenEventStatus(status);
  }

  protected isClosed(status: EventStatus | undefined): boolean {
    return isClosedEventStatus(status);
  }

  private normalizeEvent(item: EventItem): EventItem {
    const eventType = this.firstText(item.eventType, item.event_type);
    const deviceGuid = this.firstText(item.deviceGuid, item.device_guid);
    const title = eventDisplayTitle({ ...item, eventType });
    return {
      ...item,
      deviceGuid,
      eventType,
      source: this.firstText(item.source, eventType),
      level: this.normalizeLevel(item.level),
      title,
      message: eventDisplayMessage({ ...item, eventType, title }),
      payload: this.firstText(item.payload, item.payload_json),
      occurredAt: this.firstNumber(item.occurredAt, item.occurred_at, item.createTime, item.create_time),
      closedAt: this.firstNumber(item.closedAt, item.closed_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeLevel(level: string | undefined): string {
    const value = String(level || 'info').toLowerCase();
    if (value === 'warning') return 'warn';
    return value;
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  private loadDevice(deviceGuid: string): void {
    forkJoin({
      device: this.devicesService.get(deviceGuid),
    }).subscribe({
      next: ({ device }) => {
        this.device = device.device;
        this.cdr.markForCheck();
      },
      error: () => {
        this.device = undefined;
        this.cdr.markForCheck();
      },
    });
  }
}
