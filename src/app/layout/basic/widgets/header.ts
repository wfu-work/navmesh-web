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
import { filter, forkJoin } from 'rxjs';

import {
  EventItem,
  EventsService,
  eventDisplayMessage,
  eventDisplayTitle,
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
          (itemClick)="openMessage($event)"
          (markAllReadClick)="markMessagesRead($event)"
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

  @Output() public readonly collapsClick = new EventEmitter<boolean>();

  @Input() isCollapsed = false;

  protected pageTitle = 'NavMesh';
  protected hasScrolled = false;
  protected messageItems: HeaderMessageItem[] = [];

  ngOnInit(): void {
    this.updatePageTitle();
    this.loadMessages();
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
      this.router.navigate(['/events', item.eventGuid]);
    }
  }

  protected markMessagesRead(items: HeaderMessageItem[]): void {
    const guids = items.map((item) => item.eventGuid).filter((guid): guid is string => !!guid);
    if (!guids.length) return;
    forkJoin(guids.map((guid) => this.eventsService.ack(guid)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadMessages(),
        error: () => this.loadMessages(),
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
    this.eventsService
      .list({ page: 1, size: 5, status: '1' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.messageItems = (res.data ?? []).map((item) => this.toMessageItem(item));
        },
        error: () => {
          this.messageItems = [];
        },
      });
  }

  private toMessageItem(item: EventItem): HeaderMessageItem {
    const eventType = this.firstText(item.eventType, item.event_type);
    const occurredAt = this.firstNumber(item.occurredAt, item.occurred_at, item.createTime, item.create_time);
    return {
      id: item.guid,
      eventGuid: item.guid,
      title: eventDisplayTitle({ ...item, eventType }),
      content: eventDisplayMessage({ ...item, eventType }),
      time: new Date(this.normalizeTimestamp(occurredAt) || Date.now()).toISOString(),
      read: !isOpenEventStatus(item.status),
      level: this.messageLevel(item.level),
    };
  }

  private messageLevel(level: string | undefined): HeaderMessageItem['level'] {
    const value = String(level || '').toLowerCase();
    if (['critical', 'error', 'high'].includes(value)) return 'error';
    if (['warn', 'warning', 'medium'].includes(value)) return 'warning';
    return 'info';
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
