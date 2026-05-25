import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

type PanelTrendType = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-panel',
  template: `
    <section class="panel">
      <div class="panel-header">
        <div class="panel-icon">
          <nz-icon [nzType]="icon" />
        </div>
        @if (trend) {
          <span
            class="panel-trend"
            [class.panel-trend-down]="trendType === 'down'"
            [class.panel-trend-neutral]="trendType === 'neutral'"
          >
            {{ trend }}
          </span>
        }
      </div>

      <div class="panel-body">
        <div class="panel-title">{{ title }}</div>
        <div class="panel-value">{{ value }}</div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .panel {
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        padding: 26px 28px 24px;
        border: 1px solid rgb(255 255 255 / 74%);
        border-radius: 24px;
        background: rgb(255 255 255 / 88%);
        box-shadow:
          0 18px 46px rgb(47 103 124 / 10%),
          inset 0 1px 0 rgb(255 255 255 / 92%);
      }

      :host-context([data-theme='dark']) .panel {
        border-color: rgb(255 255 255 / 6%);
        background: linear-gradient(180deg, rgb(18 26 41 / 96%) 0%, rgb(14 20 31 / 96%) 100%);
        box-shadow:
          0 18px 46px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        min-width: 0;
      }

      .panel-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 58px;
        height: 58px;
        border-radius: 14px;
        color: #35c7b4;
        font-size: 28px;
        background: #f0f5ff;
      }

      :host-context([data-theme='dark']) .panel-icon {
        color: #60d5c8;
        background: rgb(96 213 200 / 12%);
      }

      .panel-trend {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        color: #188d7a;
        font-size: 16px;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
        background: #dcfbf2;
      }

      :host-context([data-theme='dark']) .panel-trend {
        color: #67d5c4;
        background: rgb(103 213 196 / 14%);
      }

      .panel-trend-down {
        color: #c94747;
        background: #ffe8e8;
      }

      :host-context([data-theme='dark']) .panel-trend-down {
        color: #ff8e8e;
        background: rgb(255 142 142 / 14%);
      }

      .panel-trend-neutral {
        color: #65727f;
        background: #edf2f7;
      }

      :host-context([data-theme='dark']) .panel-trend-neutral {
        color: rgba(255, 255, 255, 0.66);
        background: rgb(255 255 255 / 8%);
      }

      .panel-body {
        margin-top: 24px;
        min-width: 0;
      }

      .panel-title {
        color: #7b8793;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.5;
      }

      :host-context([data-theme='dark']) .panel-title {
        color: rgba(255, 255, 255, 0.6);
      }

      .panel-value {
        margin-top: 8px;
        color: #253044;
        font-size: 20px;
        font-weight: 800;
        line-height: 1.25;
        letter-spacing: 0;
      }

      :host-context([data-theme='dark']) .panel-value {
        color: rgba(255, 255, 255, 0.92);
      }

      @media (max-width: 767px) {
        .panel {
          padding: 22px 22px 20px;
          border-radius: 20px;
        }

        .panel-icon {
          width: 52px;
          height: 52px;
          font-size: 25px;
        }

        .panel-trend {
          min-height: 30px;
          padding: 0 12px;
          font-size: 14px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzIconModule],
})
export class PanelComponent {
  @Input() icon = 'sync';
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input() trend = '';
  @Input() trendType: PanelTrendType = 'up';
}
