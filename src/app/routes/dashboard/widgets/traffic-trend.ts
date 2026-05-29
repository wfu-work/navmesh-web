import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

export interface TrafficDistributionBucket {
  label: string;
  inbound: number;
  outbound: number;
}

export interface TrafficWindowOption {
  value: string;
  label: string;
  hours: number;
}

interface TrafficDistributionBar extends TrafficDistributionBucket {
  total: number;
  height: number;
  inboundShare: number;
  outboundShare: number;
  active?: boolean;
}

@Component({
  selector: 'dashboard-traffic-trend',
  template: `
    <section class="trend-card">
      <div class="trend-card-header">
        <div>
          <h2>流量统计分布</h2>
          <p>{{ totalLabel }}</p>
        </div>
        <div class="trend-meta">
          <span class="trend-legend trend-legend-in">入站</span>
          <span class="trend-legend trend-legend-out">出站</span>
          <nz-select
            class="trend-window-select"
            [ngModel]="windowValue"
            (ngModelChange)="changeWindow($event)"
            [nzDropdownMatchSelectWidth]="false"
            aria-label="流量统计时间段"
          >
            @for (option of windowOptions; track option.value) {
              <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
            }
          </nz-select>
        </div>
      </div>

      <div class="trend-chart" [attr.aria-label]="windowLabel + '流量统计分布柱状图'">
        @for (item of bars; track item.label) {
          <div class="trend-bar-wrap">
            <div
              class="trend-bar"
              [class.trend-bar-active]="item.active"
              [class.trend-bar-empty]="!item.total"
              [style.height.%]="item.height"
            >
              @if (item.outbound > 0) {
                <span class="trend-bar-out" [style.height.%]="item.outboundShare"></span>
              }
              @if (item.inbound > 0) {
                <span class="trend-bar-in" [style.height.%]="item.inboundShare"></span>
              }
            </div>
            <div class="trend-tooltip" role="tooltip" [style.bottom.%]="item.height">
              <strong>{{ item.label }}</strong>
              <span>总计 {{ formatBytes(item.total) }}</span>
              <span>入站 {{ formatBytes(item.inbound) }}</span>
              <span>出站 {{ formatBytes(item.outbound) }}</span>
            </div>
          </div>
        }
      </div>

      <div class="trend-axis">
        @for (label of axisLabels; track label) {
          <span>{{ label }}</span>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .trend-card {
        box-sizing: border-box;
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

      :host-context([data-theme='dark']) .trend-card {
        border-color: rgb(var(--nm-primary-rgb) / 18%);
        background: linear-gradient(180deg, rgb(18 26 41 / 96%) 0%, rgb(14 20 31 / 96%) 100%);
        box-shadow:
          0 18px 44px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .trend-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .trend-card-header > div:first-child {
        min-width: 0;
      }

      .trend-card-header h2 {
        margin: 0;
        color: #182334;
        font-size: 20px;
        font-weight: 800;
        line-height: 1.35;
      }

      :host-context([data-theme='dark']) .trend-card-header h2 {
        color: rgba(255, 255, 255, 0.92);
      }

      .trend-card-header p {
        margin: 5px 0 0;
        color: #697684;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
      }

      :host-context([data-theme='dark']) .trend-card-header p {
        color: rgba(255, 255, 255, 0.54);
      }

      .trend-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
        min-height: 34px;
      }

      .trend-legend,
      .trend-window-select {
        flex: 0 0 auto;
        color: var(--nm-primary);
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
      }

      .trend-legend {
        display: inline-flex;
        align-items: center;
        height: 34px;
        padding: 0 2px;
        white-space: nowrap;
      }

      .trend-legend::before {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 6px;
        border-radius: 999px;
        background: currentcolor;
        content: '';
        vertical-align: 1px;
      }

      .trend-legend-out {
        color: #65727f;
      }

      :host-context([data-theme='dark']) .trend-legend,
      :host-context([data-theme='dark']) .trend-window-select {
        color: var(--nm-primary-hover);
      }

      :host-context([data-theme='dark']) .trend-legend-out {
        color: rgba(255, 255, 255, 0.66);
      }

      .trend-chart {
        position: relative;
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        align-items: end;
        gap: 34px;
        height: 218px;
        margin-top: 34px;
        padding: 0 8px 0 10px;
      }

      .trend-chart::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 1px;
        background: rgb(var(--nm-primary-rgb) / 14%);
        content: '';
      }

      :host-context([data-theme='dark']) .trend-chart::after {
        background: rgb(var(--nm-primary-rgb) / 20%);
      }

      .trend-bar-wrap {
        position: relative;
        display: flex;
        align-items: end;
        justify-content: center;
        height: 100%;
        min-width: 0;
      }

      .trend-bar {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
        width: min(56px, 100%);
        min-height: 22px;
        border-radius: 9px 9px 0 0;
        background: rgb(var(--nm-primary-rgb) / 7%);
      }

      :host-context([data-theme='dark']) .trend-bar {
        background: rgb(var(--nm-primary-rgb) / 12%);
      }

      .trend-bar-active {
        box-shadow: 0 0 0 1px rgb(var(--nm-primary-rgb) / 12%);
      }

      .trend-bar-empty {
        background: rgb(var(--nm-primary-rgb) / 8%);
      }

      .trend-bar-in,
      .trend-bar-out {
        display: block;
        overflow: hidden;
        min-height: 8px;
      }

      .trend-bar-in {
        background: linear-gradient(180deg, var(--nm-primary-hover) 0%, var(--nm-primary) 100%);
      }

      .trend-bar-out {
        background: rgb(var(--nm-primary-rgb) / 34%);
      }

      .trend-axis {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding-top: 10px;
        color: #b0beb9;
        font-size: 14px;
        font-weight: 700;
      }

      :host-context([data-theme='dark']) .trend-axis {
        color: rgba(255, 255, 255, 0.42);
      }

      .trend-tooltip {
        position: absolute;
        left: 50%;
        z-index: 2;
        display: grid;
        gap: 4px;
        min-width: 132px;
        margin-bottom: 12px;
        padding: 10px 12px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 14%);
        border-radius: 10px;
        color: #253044;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        background: rgb(255 255 255 / 96%);
        box-shadow: 0 14px 32px rgb(15 23 42 / 14%);
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 8px);
        transition:
          opacity 0.16s ease,
          transform 0.16s ease;
      }

      .trend-tooltip::after {
        position: absolute;
        bottom: -6px;
        left: 50%;
        width: 10px;
        height: 10px;
        border-right: 1px solid rgb(var(--nm-primary-rgb) / 14%);
        border-bottom: 1px solid rgb(var(--nm-primary-rgb) / 14%);
        background: inherit;
        content: '';
        transform: translateX(-50%) rotate(45deg);
      }

      .trend-tooltip strong {
        color: var(--nm-primary);
        font-size: 13px;
      }

      .trend-tooltip span {
        color: #65727f;
        white-space: nowrap;
      }

      .trend-bar-wrap:hover .trend-tooltip,
      .trend-bar-wrap:focus-within .trend-tooltip {
        opacity: 1;
        transform: translate(-50%, 0);
      }

      :host-context([data-theme='dark']) .trend-tooltip {
        border-color: rgb(var(--nm-primary-rgb) / 24%);
        color: rgba(255, 255, 255, 0.88);
        background: rgb(20 29 44 / 98%);
        box-shadow: 0 14px 32px rgb(0 0 0 / 30%);
      }

      :host-context([data-theme='dark']) .trend-tooltip span {
        color: rgba(255, 255, 255, 0.62);
      }

      :host ::ng-deep .trend-window-select.ant-select {
        min-width: 116px;
        height: 34px;
      }

      :host ::ng-deep .trend-window-select .ant-select-selector {
        height: 34px;
        min-height: 34px;
        padding: 0 12px;
        border: 0;
        border-radius: 999px;
        background: rgb(var(--nm-primary-rgb) / 10%);
        box-shadow: none;
      }

      :host ::ng-deep .trend-window-select .ant-select-selection-item {
        color: var(--nm-primary);
        font-size: 14px;
        font-weight: 800;
        line-height: 34px;
      }

      :host ::ng-deep .trend-window-select .ant-select-arrow {
        color: var(--nm-primary);
      }

      :host-context([data-theme='dark']) ::ng-deep .trend-window-select .ant-select-selector {
        background: rgb(var(--nm-primary-rgb) / 16%);
      }

      :host-context([data-theme='dark']) ::ng-deep .trend-window-select .ant-select-selection-item,
      :host-context([data-theme='dark']) ::ng-deep .trend-window-select .ant-select-arrow {
        color: var(--nm-primary-hover);
      }

      @media (max-width: 767px) {
        .trend-card {
          padding: 22px 20px;
        }

        .trend-chart {
          gap: 14px;
          height: 180px;
          margin-top: 30px;
        }

        .trend-card-header {
          display: grid;
        }

        .trend-meta {
          justify-content: flex-start;
        }

        .trend-tooltip {
          min-width: 124px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzSelectModule],
})
export class DashboardTrafficTrendComponent {
  @Input() buckets: TrafficDistributionBucket[] = [];
  @Input() windowLabel = '过去 1 小时';
  @Input() windowValue = '1h';
  @Input() windowOptions: TrafficWindowOption[] = [];
  @Output() windowValueChange = new EventEmitter<string>();

  protected get bars(): TrafficDistributionBar[] {
    const buckets = this.buckets.length
      ? this.buckets
      : Array.from({ length: 8 }, (_, index) => ({ label: String(index), inbound: 0, outbound: 0 }));
    const totals = buckets.map((item) => item.inbound + item.outbound);
    const max = Math.max(...totals, 1);
    return buckets.map((item) => {
      const total = item.inbound + item.outbound;
      let inboundShare = total > 0 ? Math.round((item.inbound / total) * 100) : 0;
      if (item.inbound > 0 && item.outbound > 0) {
        inboundShare = Math.min(90, Math.max(10, inboundShare));
      } else if (item.inbound > 0) {
        inboundShare = 100;
      }
      return {
        ...item,
        total,
        height: total > 0 ? Math.max(14, Math.round((total / max) * 100)) : 8,
        inboundShare,
        outboundShare: total > 0 ? 100 - inboundShare : 0,
        active: total === max && max > 0,
      };
    });
  }

  protected get axisLabels(): string[] {
    const bars = this.bars;
    if (!bars.length) return [];
    return [bars[0], bars[2], bars[4], bars[6], bars[7]].filter(Boolean).map((item) => item.label);
  }

  protected get totalLabel(): string {
    const total = this.buckets.reduce((sum, item) => sum + item.inbound + item.outbound, 0);
    return `累计 ${this.formatBytes(total)}`;
  }

  protected changeWindow(value: string): void {
    this.windowValueChange.emit(value);
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
}
