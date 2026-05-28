import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface TrafficDistributionBucket {
  label: string;
  inbound: number;
  outbound: number;
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
          <span class="trend-window">过去 1 小时</span>
        </div>
      </div>

      <div class="trend-chart" aria-label="过去 1 小时流量统计分布柱状图">
        @for (item of bars; track item.label) {
          <div class="trend-bar-wrap">
            <div
              class="trend-bar"
              [class.trend-bar-active]="item.active"
              [class.trend-bar-empty]="!item.total"
              [style.height.%]="item.height"
              [title]="item.label + ' 入站 ' + formatBytes(item.inbound) + '，出站 ' + formatBytes(item.outbound)"
            >
              @if (item.total) {
                <span class="trend-bar-out" [style.height.%]="item.outboundShare"></span>
                <span class="trend-bar-in" [style.height.%]="item.inboundShare"></span>
              }
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
        gap: 8px;
        justify-content: flex-end;
      }

      .trend-legend,
      .trend-window {
        flex: 0 0 auto;
        padding: 7px 14px;
        border-radius: 999px;
        color: var(--nm-primary);
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
        background: rgb(var(--nm-primary-rgb) / 10%);
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
        background: rgb(var(--nm-primary-rgb) / 6%);
      }

      :host-context([data-theme='dark']) .trend-legend,
      :host-context([data-theme='dark']) .trend-window {
        color: var(--nm-primary-hover);
        background: rgb(var(--nm-primary-rgb) / 16%);
      }

      :host-context([data-theme='dark']) .trend-legend-out {
        color: rgba(255, 255, 255, 0.66);
        background: rgb(var(--nm-primary-rgb) / 10%);
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
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTrafficTrendComponent {
  @Input() buckets: TrafficDistributionBucket[] = [];

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

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
}
