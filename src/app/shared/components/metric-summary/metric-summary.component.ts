import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type MetricSummaryTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export interface MetricSummaryItem {
  label: string;
  value: string | number;
  tone?: MetricSummaryTone;
  hint?: string;
}

@Component({
  selector: 'app-metric-summary',
  template: `
    <section class="metric-summary" [style.--metric-summary-columns]="columns">
      @for (item of items; track item.label) {
        <article class="metric-summary__item metric-summary__item-{{ item.tone || 'default' }}">
          <div class="metric-summary__head">
            <span class="metric-summary__label">{{ item.label }}</span>
          </div>
          <strong class="metric-summary__value" [title]="item.value + ''">{{ item.value }}</strong>
          @if (item.hint) {
            <small class="metric-summary__hint">{{ item.hint }}</small>
          }
        </article>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .metric-summary {
        display: grid;
        grid-template-columns: repeat(var(--metric-summary-columns, 4), minmax(0, 1fr));
        gap: 16px;
        min-width: 0;
      }

      .metric-summary__item {
        --metric-color: #64748b;
        --metric-rgb: 100 116 139;
        --metric-wash-angle: 135deg;
        --metric-wash-width: 48%;
        position: relative;
        overflow: hidden;
        min-width: 0;
        padding: 18px 20px;
        border: 1px solid #dde7e3;
        border-radius: 8px;
        background: #fff;
        box-shadow:
          0 8px 20px rgb(31 45 61 / 4%),
          inset 0 1px 0 rgb(255 255 255 / 86%);
        transition:
          border-color 0.16s ease,
          box-shadow 0.16s ease;
      }

      .metric-summary__item::before {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: var(--metric-wash-width);
        background:
          linear-gradient(var(--metric-wash-angle), rgb(var(--metric-rgb) / 0%) 10%, rgb(var(--metric-rgb) / 12%) 100%),
          linear-gradient(180deg, rgb(255 255 255 / 34%), rgb(255 255 255 / 0%));
        clip-path: polygon(18% 0, 100% 0, 100% 100%, 0 100%);
        content: '';
        pointer-events: none;
      }

      .metric-summary__item:nth-child(4n + 2) {
        --metric-wash-angle: 150deg;
        --metric-wash-width: 44%;
      }

      .metric-summary__item:nth-child(4n + 3) {
        --metric-wash-angle: 122deg;
        --metric-wash-width: 50%;
      }

      .metric-summary__item:nth-child(4n) {
        --metric-wash-angle: 160deg;
        --metric-wash-width: 42%;
      }

      .metric-summary__item:hover {
        border-color: rgb(var(--metric-rgb) / 24%);
        box-shadow:
          0 12px 26px rgb(var(--metric-rgb) / 7%),
          inset 0 1px 0 rgb(255 255 255 / 92%);
      }

      :host-context([data-theme='dark']) .metric-summary__item {
        border-color: rgb(255 255 255 / 8%);
        background: rgb(17 24 39 / 94%);
        box-shadow:
          0 10px 24px rgb(0 0 0 / 18%),
          inset 0 1px 0 rgb(255 255 255 / 5%);
      }

      :host-context([data-theme='dark']) .metric-summary__item::before {
        background: linear-gradient(var(--metric-wash-angle), rgb(var(--metric-rgb) / 0%) 8%, rgb(var(--metric-rgb) / 16%) 100%);
      }

      :host-context([data-theme='dark']) .metric-summary__item:hover {
        border-color: rgb(var(--metric-rgb) / 26%);
        box-shadow:
          0 14px 30px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .metric-summary__head {
        position: relative;
        z-index: 1;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
      }

      .metric-summary__label,
      .metric-summary__value,
      .metric-summary__hint {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .metric-summary__label {
        color: #667586;
        font-size: 13px;
        font-weight: 760;
        line-height: 1.5;
      }

      :host-context([data-theme='dark']) .metric-summary__label,
      :host-context([data-theme='dark']) .metric-summary__hint {
        color: rgba(255, 255, 255, 0.56);
      }

      .metric-summary__value {
        position: relative;
        z-index: 1;
        margin-top: 10px;
        color: var(--metric-color);
        font-size: 21px;
        font-weight: 850;
        line-height: 1.18;
        letter-spacing: 0;
      }

      :host-context([data-theme='dark']) .metric-summary__value {
        color: rgba(255, 255, 255, 0.9);
      }

      .metric-summary__hint {
        position: relative;
        z-index: 1;
        margin-top: 7px;
        color: #7a8794;
        font-size: 12px;
        font-weight: 650;
        line-height: 1.5;
      }

      .metric-summary__item-primary {
        --metric-color: var(--nm-primary);
        --metric-rgb: var(--nm-primary-rgb);
      }

      .metric-summary__item-success {
        --metric-color: #0d8f5d;
        --metric-rgb: 13 143 93;
      }

      .metric-summary__item-warning {
        --metric-color: #b56a00;
        --metric-rgb: 181 106 0;
      }

      .metric-summary__item-danger {
        --metric-color: #c53a3a;
        --metric-rgb: 197 58 58;
      }

      .metric-summary__item-muted {
        --metric-color: #64748b;
        --metric-rgb: 100 116 139;
      }

      :host-context([data-theme='dark']) .metric-summary__item-primary {
        --metric-color: var(--nm-primary-hover);
      }

      :host-context([data-theme='dark']) .metric-summary__item-success {
        --metric-color: #67d5c4;
      }

      :host-context([data-theme='dark']) .metric-summary__item-warning {
        --metric-color: #f4c26b;
      }

      :host-context([data-theme='dark']) .metric-summary__item-danger {
        --metric-color: #ff8e8e;
      }

      :host-context([data-theme='dark']) .metric-summary__item-muted {
        --metric-color: rgba(255, 255, 255, 0.64);
      }

      @media (max-width: 1199px) {
        .metric-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 767px) {
        .metric-summary {
          grid-template-columns: 1fr;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .metric-summary__item {
          transition: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricSummaryComponent {
  @Input() items: MetricSummaryItem[] = [];
  @Input() columns = 4;
}
