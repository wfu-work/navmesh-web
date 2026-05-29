import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface DashboardShortcut {
  title: string;
  description: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'dashboard-shortcuts',
  template: `
    <section class="shortcuts-card">
      <div class="shortcuts-section-head">
        <div>
          <h2>常用入口</h2>
          <p>快速进入排查和配置页面。</p>
        </div>
      </div>

      <div class="shortcuts-list">
        @for (item of shortcuts; track item.link) {
          <a class="shortcut-item" [routerLink]="item.link">
            <span class="shortcut-icon">
              <nz-icon [nzType]="item.icon" />
            </span>
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <nz-icon nzType="arrow-right" />
          </a>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        height: 100%;
      }

      .shortcuts-card {
        box-sizing: border-box;
        min-width: 0;
        height: 100%;
        padding: 28px 30px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 12%);
        border-radius: 22px;
        background: rgb(255 255 255 / 88%);
        box-shadow:
          0 18px 44px rgb(var(--nm-primary-rgb) / 8%),
          inset 0 1px 0 rgb(255 255 255 / 90%);
      }

      :host-context([data-theme='dark']) .shortcuts-card {
        border-color: rgb(var(--nm-primary-rgb) / 18%);
        background: linear-gradient(180deg, rgb(18 26 41 / 96%) 0%, rgb(14 20 31 / 96%) 100%);
        box-shadow:
          0 18px 44px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .shortcuts-section-head {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 22px;
      }

      .shortcuts-section-head h2,
      .shortcuts-section-head p {
        margin: 0;
      }

      .shortcuts-section-head h2 {
        color: #182334;
        font-size: 20px;
        font-weight: 850;
        line-height: 1.35;
      }

      .shortcuts-section-head p {
        margin-top: 4px;
        color: #697684;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      :host-context([data-theme='dark']) .shortcuts-section-head h2,
      :host-context([data-theme='dark']) .shortcut-item strong {
        color: rgba(255, 255, 255, 0.92);
      }

      :host-context([data-theme='dark']) .shortcuts-section-head p,
      :host-context([data-theme='dark']) .shortcut-item small {
        color: rgba(255, 255, 255, 0.56);
      }

      .shortcuts-list {
        display: grid;
        gap: 10px;
      }

      .shortcut-item {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        min-width: 0;
        padding: 12px;
        border: 1px solid #edf2ef;
        border-radius: 8px;
        color: inherit;
        background: #fbfdfc;
        text-decoration: none;
        transition:
          border-color 0.16s ease,
          background-color 0.16s ease;
      }

      .shortcut-item:hover {
        border-color: rgb(var(--nm-primary-rgb) / 24%);
        background: rgb(var(--nm-primary-rgb) / 5%);
      }

      :host-context([data-theme='dark']) .shortcut-item {
        border-color: rgb(255 255 255 / 8%);
        background: rgb(255 255 255 / 4%);
      }

      .shortcut-item strong,
      .shortcut-item small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .shortcut-item strong {
        color: #26344a;
        font-size: 14px;
        font-weight: 850;
      }

      .shortcut-item small {
        margin-top: 2px;
        color: #697684;
        font-size: 12px;
        font-weight: 700;
      }

      .shortcut-item > nz-icon {
        color: #9aa7b5;
        font-size: 14px;
      }

      .shortcut-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        color: var(--nm-primary);
        background: rgb(var(--nm-primary-rgb) / 8%);
      }

      .shortcut-icon nz-icon {
        font-size: 18px;
      }

      @media (max-width: 767px) {
        .shortcuts-card {
          padding: 22px 20px;
          border-radius: 18px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NzIconModule],
})
export class DashboardShortcutsComponent {
  protected readonly shortcuts: DashboardShortcut[] = [
    {
      title: '设备列表',
      description: '查看设备号、在线状态和最近心跳',
      icon: 'desktop',
      link: '/devices/list',
    },
    {
      title: '访问日志',
      description: '定位 HTTP 状态码、来源 IP 和响应耗时',
      icon: 'file-search',
      link: '/devices/access-logs',
    },
    {
      title: '事件中心',
      description: '确认设备离线、连接失败和认证事件',
      icon: 'alert',
      link: '/events/list',
    },
    {
      title: '系统配置',
      description: '维护域名、保留策略和运行参数',
      icon: 'setting',
      link: '/settings/system',
    },
  ];
}
