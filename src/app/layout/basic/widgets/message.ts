import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';

type HeaderMessageLevel = 'info' | 'warning' | 'error';

export interface HeaderMessageItem {
  id: string | number;
  eventGuid?: string;
  deviceGuid?: string;
  deviceName?: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  level: HeaderMessageLevel;
}

@Component({
  selector: 'header-message',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    DatePipe,
    NzBadgeModule,
    NzButtonModule,
    NzDropdownModule,
    NzEmptyModule,
    NzIconModule,
  ],
  template: `
    <div
      class="header-message"
      nz-dropdown
      nzTrigger="click"
      nzPlacement="bottomRight"
      [nzDropdownMenu]="menu"
    >
      <nz-badge [nzCount]="unreadCount()" [nzOverflowCount]="99" nzSize="small">
        <button type="button" class="header-message__trigger" aria-label="消息通知">
          <nz-icon nzType="bell" class="header-message__bell" />
        </button>
      </nz-badge>
    </div>

    <nz-dropdown-menu #menu="nzDropdownMenu">
      <div class="header-message-panel">
        <div class="header-message-panel__header">
          <div>
            <div class="header-message-panel__title">{{ title }}</div>
            <div class="header-message-panel__subtitle">
              @if (unreadCount() > 0) {
                {{ unreadCount() }} 条未读消息
              } @else {
                暂无未读消息
              }
            </div>
          </div>

          <button
            nz-button
            nzType="link"
            class="header-message-panel__action"
            [disabled]="unreadCount() === 0"
            (click)="markAllRead()"
          >
            全部已读
          </button>
        </div>

        @if (messages().length) {
          <div class="header-message-panel__list">
            @for (item of messages(); track item.id) {
              <button
                type="button"
                class="header-message-item"
                [ngClass]="{
                  'is-read': item.read,
                  'is-warning': item.level === 'warning',
                  'is-error': item.level === 'error',
                }"
                (click)="handleItemClick(item)"
              >
                <span class="header-message-item__dot"></span>
                <div class="header-message-item__body">
                  <div class="header-message-item__row">
                    <span class="header-message-item__title">
                      {{ item.title }}
                      @if (item.deviceName) {
                        <span class="header-message-item__device">· {{ item.deviceName }}</span>
                      }
                    </span>
                    <span class="header-message-item__time">
                      {{ item.time | date: 'MM-dd HH:mm' }}
                    </span>
                  </div>
                  <div class="header-message-item__content">{{ item.content }}</div>
                </div>
              </button>
            }
          </div>
        } @else {
          <div class="header-message-panel__empty">
            <nz-empty nzNotFoundImage="simple" [nzNotFoundContent]="emptyText" />
          </div>
        }

        <div class="header-message-panel__footer">
          <button
            type="button"
            class="header-message-panel__all-events"
            (click)="openAllEvents($event)"
          >
            <span>查看全部事件</span>
            <nz-icon nzType="arrow-right" />
          </button>
        </div>
      </div>
    </nz-dropdown-menu>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }

    .header-message {
      display: inline-flex;
      align-items: center;
    }

    .header-message__trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .header-message__bell {
      font-size: 18px;
    }

    .header-message-panel {
      width: 360px;
      overflow: hidden;
      background: rgb(255 255 255 / 96%);
      border: 1px solid rgb(var(--nm-primary-rgb) / 8%);
      border-radius: 22px;
      box-shadow: 0 22px 44px rgb(var(--nm-primary-rgb) / 14%);
      backdrop-filter: blur(16px);
    }

    :host-context([data-theme='dark']) .header-message-panel {
      background: rgb(17 24 39 / 96%);
      border-color: rgb(255 255 255 / 8%);
      box-shadow: 0 22px 44px rgb(0 0 0 / 34%);
    }

    .header-message-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 18px 14px;
      border-bottom: 1px solid rgb(var(--nm-primary-rgb) / 7%);
      background: linear-gradient(180deg, #fbfdfc 0%, #f5faf7 100%);
    }

    :host-context([data-theme='dark']) .header-message-panel__header {
      border-bottom-color: rgb(255 255 255 / 6%);
      background: linear-gradient(180deg, #121a2a 0%, #0f1724 100%);
    }

    .header-message-panel__title {
      color: #203049;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.3;
    }

    :host-context([data-theme='dark']) .header-message-panel__title,
    :host-context([data-theme='dark']) .header-message-item__title {
      color: rgba(255, 255, 255, 0.9);
    }

    :host-context([data-theme='dark']) .header-message-panel__subtitle,
    :host-context([data-theme='dark']) .header-message-item__content,
    :host-context([data-theme='dark']) .header-message-item__time,
    :host-context([data-theme='dark']) .header-message-item__device {
      color: rgba(255, 255, 255, 0.62);
    }

    .header-message-panel__subtitle {
      margin-top: 4px;
      color: #81908a;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
    }

    .header-message-panel__action.ant-btn-link {
      height: auto;
      padding: 2px 0;
      color: var(--nm-primary);
      font-weight: 700;
    }

    .header-message-panel__list {
      max-height: 388px;
      padding: 8px;
      overflow: auto;
    }

    .header-message-panel__list::-webkit-scrollbar {
      width: 6px;
    }

    .header-message-panel__list::-webkit-scrollbar-thumb {
      background: rgb(var(--nm-primary-rgb) / 14%);
      border-radius: 999px;
    }

    .header-message-item {
      display: flex;
      gap: 12px;
      width: 100%;
      padding: 12px;
      text-align: left;
      border: 0;
      border-radius: 16px;
      background: transparent;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .header-message-item:hover {
      background: rgb(var(--nm-primary-rgb) / 4%);
    }

    .header-message-item.is-read {
      opacity: 0.72;
    }

    .header-message-item__dot {
      width: 10px;
      height: 10px;
      margin-top: 6px;
      border-radius: 50%;
      flex: 0 0 auto;
      background: var(--nm-primary);
      box-shadow: 0 0 0 4px rgb(var(--nm-primary-rgb) / 8%);
    }

    .header-message-item.is-warning .header-message-item__dot {
      background: #b7791f;
      box-shadow: 0 0 0 4px rgb(183 121 31 / 9%);
    }

    .header-message-item.is-error .header-message-item__dot {
      background: #d14343;
      box-shadow: 0 0 0 4px rgb(209 67 67 / 9%);
    }

    .header-message-item__body {
      min-width: 0;
      flex: 1 1 auto;
    }

    .header-message-item__row {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }

    .header-message-item__title {
      min-width: 0;
      color: #233348;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.4;
    }

    .header-message-item__device {
      color: #6e7d91;
      font-weight: 700;
    }

    .header-message-item__time {
      color: #99a5b2;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .header-message-item__content {
      margin-top: 6px;
      color: #748191;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
    }

    .header-message-panel__empty {
      padding: 18px 12px 8px;
    }

    .header-message-panel__footer {
      padding: 8px 12px 12px;
      text-align: center;
    }

    .header-message-panel__all-events {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      padding: 0 8px;
      border: 0;
      color: var(--nm-primary);
      font-size: 13px;
      font-weight: 700;
      background: transparent;
      cursor: pointer;
      transition:
        color 0.2s ease,
        transform 0.2s ease;
    }

    .header-message-panel__all-events:hover {
      color: var(--nm-primary-active);
      transform: translateY(-1px);
    }

    :host-context([data-theme='dark']) .header-message-panel__all-events {
      color: rgba(255, 255, 255, 0.86);
    }

    @media (max-width: 767px) {
      .header-message-panel {
        width: min(360px, calc(100vw - 24px));
      }

      .header-message-panel__header {
        padding: 16px 16px 12px;
      }

      .header-message-panel__list {
        max-height: 320px;
        padding: 6px;
      }
    }
  `,
})
export class HeaderMessage {
  @Input() title = '消息通知';
  @Input() emptyText = '暂无消息';
  @Input() set items(value: HeaderMessageItem[] | null | undefined) {
    this.messages.set(value ?? []);
  }
  @Input() set unreadTotal(value: number | null | undefined) {
    this.unreadTotalValue.set(typeof value === 'number' ? Math.max(0, value) : null);
  }

  @Output() readonly itemClick = new EventEmitter<HeaderMessageItem>();
  @Output() readonly markAllReadClick = new EventEmitter<HeaderMessageItem[]>();
  @Output() readonly allEventsClick = new EventEmitter<void>();

  protected readonly messages = signal<HeaderMessageItem[]>([]);
  private readonly unreadTotalValue = signal<number | null>(null);

  protected readonly unreadCount = computed(
    () => this.unreadTotalValue() ?? this.messages().filter((item) => !item.read).length,
  );

  protected markRead(id: string | number): void {
    this.messages.update((list) =>
      list.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  protected markAllRead(): void {
    const unreadItems = this.messages().filter((item) => !item.read);
    this.messages.update((list) => list.map((item) => ({ ...item, read: true })));
    this.unreadTotalValue.set(0);
    this.markAllReadClick.emit(unreadItems);
  }

  protected openAllEvents(event: MouseEvent): void {
    event.stopPropagation();
    this.allEventsClick.emit();
  }

  protected handleItemClick(item: HeaderMessageItem): void {
    this.markRead(item.id);
    this.itemClick.emit(item);
  }
}
