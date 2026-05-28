import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface RuleSnapshot {
  name: string;
  flow: string;
  status: string;
  tone: 'success' | 'idle' | 'warning';
}

@Component({
  selector: 'dashboard-active-rules',
  template: `
    <section class="rules-card">
      <div class="rules-card-header">
        <h2>待处理事项</h2>
        <span class="rules-more">•••</span>
      </div>

      <div class="rules-list">
        @for (item of rules; track item.name) {
          <div class="rule-item">
            <span
              class="rule-dot"
              [class.rule-dot-idle]="item.tone === 'idle'"
              [class.rule-dot-warning]="item.tone === 'warning'"
            ></span>
            <div class="rule-copy">
              <strong>{{ item.name }}</strong>
              <span>{{ item.flow }}</span>
            </div>
            <span class="rule-status">{{ item.status }}</span>
          </div>
        }
      </div>

      <a class="rules-link" routerLink="/events/list">查看全部事件</a>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .rules-card {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: 100%;
        padding: 28px 30px 26px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 12%);
        border-radius: 22px;
        background: rgb(255 255 255 / 88%);
        box-shadow:
          0 18px 44px rgb(var(--nm-primary-rgb) / 8%),
          inset 0 1px 0 rgb(255 255 255 / 90%);
      }

      :host-context([data-theme='dark']) .rules-card {
        border-color: rgb(var(--nm-primary-rgb) / 18%);
        background: linear-gradient(180deg, rgb(18 26 41 / 96%) 0%, rgb(14 20 31 / 96%) 100%);
        box-shadow:
          0 18px 44px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .rules-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .rules-card-header h2 {
        margin: 0;
        color: #182334;
        font-size: 20px;
        font-weight: 800;
        line-height: 1.35;
      }

      :host-context([data-theme='dark']) .rules-card-header h2,
      :host-context([data-theme='dark']) .rule-copy strong {
        color: rgba(255, 255, 255, 0.92);
      }

      .rules-more {
        color: var(--nm-primary);
        font-size: 22px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: 2px;
      }

      :host-context([data-theme='dark']) .rules-more {
        color: var(--nm-primary-hover);
      }

      .rules-list {
        display: grid;
        gap: 30px;
        margin-top: 42px;
      }

      .rule-item {
        display: grid;
        grid-template-columns: 14px minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        min-width: 0;
      }

      .rule-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--nm-primary);
        box-shadow: 0 0 0 5px rgb(var(--nm-primary-rgb) / 12%);
      }

      :host-context([data-theme='dark']) .rule-dot {
        background: var(--nm-primary-hover);
        box-shadow: 0 0 0 5px rgb(var(--nm-primary-rgb) / 12%);
      }

      .rule-dot-idle {
        background: #94a3b8;
        box-shadow: 0 0 0 5px rgb(148 163 184 / 12%);
      }

      .rule-dot-warning {
        background: #ef6b6b;
        box-shadow: 0 0 0 5px rgb(239 107 107 / 10%);
      }

      .rule-copy {
        min-width: 0;
      }

      .rule-copy strong,
      .rule-copy span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rule-copy strong {
        color: #334054;
        font-size: 15px;
        font-weight: 800;
        line-height: 1.45;
      }

      .rule-copy span {
        margin-top: 2px;
        color: #697684;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
      }

      :host-context([data-theme='dark']) .rule-copy span,
      :host-context([data-theme='dark']) .rule-status {
        color: rgba(255, 255, 255, 0.54);
      }

      .rule-status {
        color: #7f8c99;
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
      }

      .rules-link {
        align-self: center;
        margin-top: auto;
        padding-top: 34px;
        color: var(--nm-primary);
        font-size: 14px;
        font-weight: 800;
      }

      :host-context([data-theme='dark']) .rules-link {
        color: var(--nm-primary-hover);
      }

      @media (max-width: 767px) {
        .rules-card {
          padding: 22px 20px;
        }

        .rules-list {
          gap: 22px;
          margin-top: 30px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class DashboardActiveRulesComponent {
  @Input() offlineDevices = 0;
  @Input() httpFailures = 0;
  @Input() openEvents = 0;

  protected get rules(): RuleSnapshot[] {
    return [
      {
        name: '离线设备',
        flow: '检查设备心跳和隧道连接',
        status: `${this.offlineDevices} 个`,
        tone: this.offlineDevices > 0 ? 'warning' : 'success',
      },
      {
        name: 'HTTP 映射失败',
        flow: '查看访问日志中的 5xx 或上游错误',
        status: `${this.httpFailures} 条`,
        tone: this.httpFailures > 0 ? 'warning' : 'success',
      },
      {
        name: '未处理事件',
        flow: '进入事件中心确认或关闭',
        status: `${this.openEvents} 条`,
        tone: this.openEvents > 0 ? 'warning' : 'idle',
      },
    ];
  }
}
