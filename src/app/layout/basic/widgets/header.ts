import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LayoutDefaultModule } from '@delon/theme/layout-default';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { auditTime, filter, forkJoin } from 'rxjs';

import { EventWebSocketService } from '../../../core/net';
import type { EventNotification } from '../../../core/net';
import { Device, DevicesService } from '../../../routes/devices/devices.service';
import {
  EventItem,
  EventsService,
  eventDisplayMessage,
  eventDisplayTitle,
  isWebSocketMessageEvent,
  isOpenEventStatus,
} from '../../../routes/events/events.service';
import { AvatarComponent } from './avatar';
import { HeaderMessage, HeaderMessageItem } from './message';
import { ThemeColorComponent } from './theme-color';

@Component({
  selector: 'basic-header',
  template: `
    <div
      class="header-container"
      [class.header-container-collapsed]="isCollapsed"
      [class.header-container-scrolled]="hasScrolled"
    >
      <div class="header-left">
        <span
          class="trigger"
          nz-icon
          [nzType]="isCollapsed ? 'menu-unfold' : 'menu-fold'"
          (click)="collapsTap()"
        ></span>
        <span class="font-weight-bold text-xl title">{{ pageTitle }}</span>
      </div>
      <div class="header-actions">
        <theme-color />
        <header-message
          class="mr-md"
          [items]="messageItems"
          [unreadTotal]="unreadMessageCount"
          (itemClick)="openMessage($event)"
          (markAllReadClick)="markMessagesRead()"
          (allEventsClick)="openAllEvents()"
        />
        <header-avatar />
      </div>
    </div>
  `,
  styles: [
    `
      .header-container {
        position: fixed;
        top: var(--basic-header-top, 14px);
        right: var(--basic-layout-gap, 14px);
        left: calc(var(--basic-sider-width, 220px) + var(--basic-layout-gap, 14px) * 2);
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 68px;
        padding: 10px 18px;
        border: 1px solid transparent;
        border-radius: 22px;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          background-color 0.2s ease,
          backdrop-filter 0.2s ease,
          left 0.2s ease;
      }

      .header-container-scrolled {
        border-color: rgb(255 255 255 / 74%);
        background: rgb(255 255 255 / 82%);
        box-shadow:
          0 12px 32px rgb(41 99 119 / 10%),
          inset 0 1px 0 rgb(255 255 255 / 88%);
        backdrop-filter: blur(18px);
      }

      :host-context([data-theme='dark']) .header-container-scrolled {
        border-color: rgb(255 255 255 / 8%);
        background: rgb(15 23 36 / 78%);
        box-shadow:
          0 12px 32px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .header-container-collapsed {
        left: calc(var(--basic-sider-collapsed-width, 80px) + var(--basic-layout-gap, 14px) * 2);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        white-space: nowrap;
      }

      .trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 10%);
        border-radius: 14px;
        color: var(--nm-primary);
        font-size: 18px;
        background: rgb(var(--nm-primary-rgb) / 8%);
        cursor: pointer;
        transition:
          color 0.2s ease,
          background-color 0.2s ease,
          transform 0.2s ease;
      }

      :host-context([data-theme='dark']) .trigger {
        border-color: rgb(255 255 255 / 10%);
        color: rgba(255, 255, 255, 0.84);
        background: rgb(255 255 255 / 6%);
      }

      .trigger:hover {
        transform: translateY(-1px);
        color: var(--nm-primary-active);
        background: rgb(var(--nm-primary-rgb) / 14%);
      }

      :host-context([data-theme='dark']) .trigger:hover {
        color: #fff;
        background: rgb(255 255 255 / 10%);
      }

      .title {
        color: var(--nm-primary);
      }

      :host-context([data-theme='dark']) .title {
        color: rgba(255, 255, 255, 0.92);
      }

      .header-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: 0;
        color: #56657d;
      }

      :host-context([data-theme='dark']) .header-actions {
        color: rgba(255, 255, 255, 0.72);
      }

      .header-actions > * {
        display: inline-flex;
        align-items: center;
      }

      .header-actions .mr-md {
        margin-right: 0 !important;
      }

      @media (max-width: 767px) {
        .header-container,
        .header-container-collapsed {
          top: 12px;
          right: 12px;
          left: 12px;
          min-height: 60px;
          padding: 8px 12px;
          border-radius: 18px;
        }

        .trigger {
          width: 38px;
          height: 38px;
        }

        .header-actions {
          gap: 8px;
        }
      }
    `,
  ],
  standalone: true,
  imports: [AvatarComponent, HeaderMessage, LayoutDefaultModule, NzIconModule, ThemeColorComponent],
})
export class BasicHeaderComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly eventWebSocketService = inject(EventWebSocketService);
  private readonly devicesService = inject(DevicesService);
  private readonly notification = inject(NzNotificationService);
  private readonly notifiedEventGuids = new Set<string>();

  @Output() public readonly collapsClick = new EventEmitter<boolean>();

  @Input() isCollapsed = false;

  protected pageTitle = 'NavMesh';
  protected hasScrolled = false;
  protected messageItems: HeaderMessageItem[] = [];
  protected unreadMessageCount = 0;

  ngOnInit(): void {
    this.updatePageTitle();
    this.loadMessages();
    this.eventWebSocketService.connect();
    this.destroyRef.onDestroy(() => this.eventWebSocketService.disconnect());
    this.eventWebSocketService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleEventNotification(notification));
    this.eventWebSocketService.notifications$
      .pipe(auditTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMessages());
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updatePageTitle();
        this.loadMessages();
      });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.hasScrolled = window.scrollY > 8 || document.documentElement.scrollTop > 8;
  }

  protected collapsTap(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsClick.emit(this.isCollapsed);
  }

  protected openMessage(item: HeaderMessageItem): void {
    if (item.eventGuid) {
      if (!item.read) {
        this.messageItems = this.messageItems.map((message) =>
          message.eventGuid === item.eventGuid ? { ...message, read: true } : message,
        );
        this.unreadMessageCount = Math.max(0, this.unreadMessageCount - 1);
        this.eventsService
          .ack(item.eventGuid)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.loadMessages(),
            error: () => this.loadMessages(),
          });
      }
      this.router.navigate(['/events', item.eventGuid]);
    }
  }

  protected openAllEvents(): void {
    this.router.navigate(['/events/list']);
  }

  protected markMessagesRead(): void {
    const previousItems = this.messageItems;
    const previousUnreadCount = this.unreadMessageCount;
    this.messageItems = this.messageItems.map((item) => ({ ...item, read: true }));
    this.unreadMessageCount = 0;

    this.eventsService
      .ackAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadMessages(),
        error: () => {
          this.messageItems = previousItems;
          this.unreadMessageCount = previousUnreadCount;
          this.loadMessages();
        },
      });
  }

  private updatePageTitle(): void {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.pageTitle = route.snapshot.data['title'] || 'NavMesh';
  }

  private loadMessages(): void {
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 200 }),
      events: this.eventsService.list({ page: 1, size: 5, status: '1' }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ devices, events }) => {
          const deviceMap = new Map(
            (devices.data ?? []).map((device) => [device.guid, this.deviceLabel(device)]),
          );
          this.messageItems = (events.data ?? []).map((item) =>
            this.toMessageItem(item, deviceMap),
          );
          this.unreadMessageCount = events.total ?? this.messageItems.length;
        },
        error: () => {
          this.messageItems = [];
          this.unreadMessageCount = 0;
        },
      });
  }

  private toMessageItem(item: EventItem, deviceMap: Map<string, string>): HeaderMessageItem {
    const eventType = this.firstText(item.eventType, item.event_type);
    const deviceGuid = this.firstText(item.deviceGuid, item.device_guid);
    const deviceSncode = this.firstText(item.deviceSncode, item.device_sncode);
    const occurredAt = this.firstNumber(
      item.occurredAt,
      item.occurred_at,
      item.createTime,
      item.create_time,
    );
    return {
      id: item.guid,
      eventGuid: item.guid,
      deviceGuid,
      deviceName: this.firstText(deviceSncode, deviceMap.get(deviceGuid), deviceGuid),
      title: eventDisplayTitle({ ...item, eventType }),
      content: eventDisplayMessage({ ...item, eventType }),
      time: new Date(this.normalizeTimestamp(occurredAt) || Date.now()).toISOString(),
      read: !isOpenEventStatus(item.status),
      level: this.messageLevel(item.level),
    };
  }

  private handleEventNotification(notification: EventNotification): void {
    if (notification.type !== 'event.created' || !notification.data) return;
    const item = notification.data as Partial<EventItem>;
    if (!isWebSocketMessageEvent(item)) return;
    if (item.guid && this.notifiedEventGuids.has(item.guid)) return;
    if (item.guid) {
      if (this.notifiedEventGuids.size > 200) this.notifiedEventGuids.clear();
      this.notifiedEventGuids.add(item.guid);
    }

    const title = eventDisplayTitle(item);
    const message = eventDisplayMessage(item);
    const options = { nzDuration: this.notificationDuration(item.level) };
    switch (this.messageLevel(item.level)) {
      case 'error':
        this.notification.error(title, message, options);
        break;
      case 'warning':
        this.notification.warning(title, message, options);
        break;
      default:
        this.notification.info(title, message, options);
        break;
    }
  }

  private deviceLabel(device: Device): string {
    return this.firstText(device.sncode, device.alias, device.name, device.hostname, device.guid);
  }

  private messageLevel(level: string | undefined): HeaderMessageItem['level'] {
    const value = String(level || '').toLowerCase();
    if (['critical', 'error', 'high'].includes(value)) return 'error';
    if (['warn', 'warning', 'medium'].includes(value)) return 'warning';
    return 'info';
  }

  private notificationDuration(level: string | undefined): number {
    return this.messageLevel(level) === 'error' ? 0 : 5000;
  }

  private normalizeTimestamp(time: number): number {
    return time > 0 && time < 1000000000000 ? time * 1000 : time;
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

}
