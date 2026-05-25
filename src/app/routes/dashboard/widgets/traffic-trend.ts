import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

interface TrafficBar {
  time: string;
  value: number;
  active?: boolean;
}

@Component({
  selector: 'dashboard-traffic-trend',
  template: `
    <section class="trend-card">
      <div class="trend-card-header">
        <h2>事件趋势</h2>
        <span>过去 1 小时</span>
      </div>

      <div class="trend-chart" aria-label="过去 1 小时事件趋势柱状图">
        @for (item of bars; track item.time) {
          <div class="trend-bar-wrap">
            <div
              class="trend-bar"
              [class.trend-bar-active]="item.active"
              [style.height.%]="item.value"
            ></div>
          </div>
        }
      </div>

      <div class="trend-axis">
        <span>10:00</span>
        <span>10:15</span>
        <span>10:30</span>
        <span>10:45</span>
        <span>11:00</span>
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
        border: 1px solid rgb(218 231 225 / 88%);
        border-radius: 22px;
        background: rgb(255 255 255 / 88%);
        box-shadow:
          0 18px 44px rgb(55 105 119 / 8%),
          inset 0 1px 0 rgb(255 255 255 / 90%);
      }

      .trend-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .trend-card-header h2 {
        margin: 0;
        color: #182334;
        font-size: 20px;
        font-weight: 800;
        line-height: 1.35;
      }

      .trend-card-header span {
        flex: 0 0 auto;
        padding: 7px 14px;
        border-radius: 999px;
        color: #4cc7b7;
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
        background: rgb(221 250 244 / 72%);
      }

      .trend-chart {
        position: relative;
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        align-items: end;
        gap: 34px;
        height: 218px;
        margin-top: 42px;
        padding: 0 8px 0 10px;
      }

      .trend-chart::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 1px;
        background: rgb(214 226 222 / 88%);
        content: '';
      }

      .trend-bar-wrap {
        display: flex;
        align-items: end;
        justify-content: center;
        height: 100%;
        min-width: 0;
      }

      .trend-bar {
        width: min(56px, 100%);
        min-height: 22px;
        border-radius: 9px 9px 0 0;
        background: rgb(226 234 231 / 84%);
      }

      .trend-bar-active {
        background: linear-gradient(180deg, #69cebf 0%, #78cdbc 100%);
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

      @media (max-width: 767px) {
        .trend-card {
          padding: 22px 20px;
        }

        .trend-chart {
          gap: 14px;
          height: 180px;
          margin-top: 30px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTrafficTrendComponent {
  @Input() values: number[] = [];

  protected get bars(): TrafficBar[] {
    const values = this.values.length ? this.values : Array.from({ length: 8 }, () => 0);
    const max = Math.max(...values, 1);
    return values.map((value, index) => ({
      time: String(index),
      value: value > 0 ? Math.max(12, Math.round((value / max) * 100)) : 8,
      active: value === max && max > 0,
    }));
  }
}
