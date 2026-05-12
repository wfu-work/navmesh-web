import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { EventItem, EventStatus, EventsService } from '../events.service';

interface EventRow extends EventItem {
  deviceName: string;
}

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class EventListComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected rows: EventRow[] = [];
  protected devices: Device[] = [];
  protected total = 0;

  protected q = {
    deviceGuid: '',
    level: '',
    status: '',
    limit: 100,
  };

  protected readonly statusTag: STColumnTag = {
    0: { text: '未处理', color: 'red' },
    1: { text: '已确认', color: 'gold' },
    2: { text: '已关闭', color: 'green' },
  };

  protected readonly levelTag: STColumnTag = {
    critical: { text: '严重', color: 'red' },
    high: { text: '高危', color: 'volcano' },
    medium: { text: '中危', color: 'gold' },
    low: { text: '低危', color: 'blue' },
    info: { text: '信息', color: 'default' },
  };

  protected readonly sourceTag: STColumnTag = {
    device: { text: '设备', color: 'green' },
    ssh: { text: 'SSH', color: 'purple' },
    http: { text: 'HTTP', color: 'blue' },
    tunnel: { text: '隧道', color: 'cyan' },
    auth: { text: '认证', color: 'gold' },
    mapping: { text: '映射', color: 'geekblue' },
  };

  protected readonly columns: STColumn<EventRow>[] = [
    { title: '事件', index: 'title', render: 'titleRender', fixed: 'left', width: 280 },
    { title: '等级', index: 'level', type: 'tag', tag: this.levelTag, width: 100 },
    { title: '来源', index: 'source', type: 'tag', tag: this.sourceTag, width: 100 },
    { title: '设备', index: 'deviceName', width: 180, default: '-' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 110 },
    { title: '消息', index: 'message', render: 'messageRender', width: 360 },
    { title: '发生时间', index: 'occurredAt', render: 'timeRender', width: 180 },
    { title: '关闭时间', index: 'closedAt', render: 'timeRender', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 160,
      buttons: [
        {
          icon: 'folder-view',
          click: (item) => this.detail(item.guid),
        },
        {
          icon: 'check',
          iif: (item) => String(item.status) === '0',
          click: (item) => this.ack(item.guid),
        },
        {
          icon: 'close',
          className: 'text-error',
          iif: (item) => String(item.status) !== '2',
          click: (item) => this.close(item.guid),
          pop: {
            title: '确认关闭该事件？',
            okType: 'danger',
            icon: 'close',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 200 }),
      events: this.eventsService.list({
        limit: this.q.limit,
        deviceGuid: this.q.deviceGuid || undefined,
        level: this.q.level || undefined,
        status: this.q.status || undefined,
      }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, events }) => {
          this.devices = devices.data ?? [];
          this.total = events.total ?? 0;
          this.rows = this.toRows(events.data ?? []);
        },
        error: () => this.message.error('事件告警加载失败'),
      });
  }

  protected reset(): void {
    this.q = { deviceGuid: '', level: '', status: '', limit: this.q.limit };
    this.load();
  }

  protected detail(guid: string): void {
    this.router.navigate(['/events', guid]);
  }

  protected ack(guid: string): void {
    this.eventsService.ack(guid).subscribe({
      next: () => {
        this.message.success('事件已确认');
        this.load();
      },
      error: () => this.message.error('事件确认失败'),
    });
  }

  protected close(guid: string): void {
    this.eventsService.close(guid).subscribe({
      next: () => {
        this.message.success('事件已关闭');
        this.load();
      },
      error: () => this.message.error('事件关闭失败'),
    });
  }

  protected openCount(): number {
    return this.rows.filter((item) => String(item.status) === '0').length;
  }

  protected ackedCount(): number {
    return this.rows.filter((item) => String(item.status) === '1').length;
  }

  protected closedCount(): number {
    return this.rows.filter((item) => String(item.status) === '2').length;
  }

  protected severeCount(): number {
    return this.rows.filter((item) => ['critical', 'high'].includes(item.level)).length;
  }

  protected statusText(status: EventStatus): string {
    const map: Record<string, string> = {
      0: '未处理',
      1: '已确认',
      2: '已关闭',
    };
    return map[String(status)] ?? '未知';
  }

  protected formatDateTime(value: number | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (item: number): string => String(item).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected formatPayload(value: string): string {
    if (!value) return '-';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private toRows(items: EventItem[]): EventRow[] {
    const deviceMap = new Map(this.devices.map((device) => [device.guid, device.name || device.hostname || device.guid]));
    return items.map((item) => ({
      ...item,
      source: item.source || item.eventType || '',
      deviceName: deviceMap.get(item.deviceGuid) ?? item.deviceGuid,
    }));
  }
}
