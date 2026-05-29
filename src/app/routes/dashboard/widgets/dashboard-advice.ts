import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

export interface DashboardInsight {
  title: string;
  content: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}

@Component({
  selector: 'dashboard-advice',
  template: `
    <section class="advice-card">
      <div class="advice-section-head">
        <div>
          <h2>运行建议</h2>
          <p>根据当前设备、访问日志和事件数据生成的处理提示。</p>
        </div>
        <nz-tag nzColor="green">{{ windowLabel }}</nz-tag>
      </div>

      <div class="advice-insights">
        @for (item of insights; track item.title) {
          <article class="advice-insight advice-insight-{{ item.tone }}">
            <span></span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.content }}</p>
            </div>
          </article>
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

      .advice-card {
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

      :host-context([data-theme='dark']) .advice-card {
        border-color: rgb(var(--nm-primary-rgb) / 18%);
        background: linear-gradient(180deg, rgb(18 26 41 / 96%) 0%, rgb(14 20 31 / 96%) 100%);
        box-shadow:
          0 18px 44px rgb(0 0 0 / 24%),
          inset 0 1px 0 rgb(255 255 255 / 6%);
      }

      .advice-section-head {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 22px;
      }

      .advice-section-head h2,
      .advice-section-head p {
        margin: 0;
      }

      .advice-section-head h2 {
        color: #182334;
        font-size: 20px;
        font-weight: 850;
        line-height: 1.35;
      }

      .advice-section-head p {
        margin-top: 4px;
        color: #697684;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      .advice-section-head nz-tag {
        flex: 0 0 auto;
        margin: 2px 0 0;
        border-radius: 999px;
        font-weight: 850;
      }

      :host-context([data-theme='dark']) .advice-section-head h2,
      :host-context([data-theme='dark']) .advice-insight strong {
        color: rgba(255, 255, 255, 0.92);
      }

      :host-context([data-theme='dark']) .advice-section-head p,
      :host-context([data-theme='dark']) .advice-insight p {
        color: rgba(255, 255, 255, 0.56);
      }

      .advice-insights {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .advice-insight {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr);
        gap: 12px;
        min-width: 0;
        padding: 15px 16px;
        border: 1px solid #edf2ef;
        border-radius: 8px;
        background: #fbfdfc;
      }

      .advice-insight > span {
        width: 9px;
        height: 9px;
        margin-top: 6px;
        border-radius: 50%;
        background: #94a3b8;
        box-shadow: 0 0 0 5px rgb(148 163 184 / 10%);
      }

      .advice-insight strong,
      .advice-insight p {
        display: block;
        min-width: 0;
      }

      .advice-insight strong {
        color: #26344a;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.45;
      }

      .advice-insight p {
        margin: 4px 0 0;
        color: #697684;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.65;
      }

      :host-context([data-theme='dark']) .advice-insight {
        border-color: rgb(255 255 255 / 8%);
        background: rgb(255 255 255 / 4%);
      }

      .advice-insight-success > span {
        background: var(--nm-primary);
        box-shadow: 0 0 0 5px rgb(var(--nm-primary-rgb) / 12%);
      }

      .advice-insight-warning > span {
        background: #d99a21;
        box-shadow: 0 0 0 5px rgb(217 154 33 / 12%);
      }

      .advice-insight-danger > span {
        background: #ef6b6b;
        box-shadow: 0 0 0 5px rgb(239 107 107 / 12%);
      }

      @media (max-width: 767px) {
        .advice-card {
          padding: 22px 20px;
          border-radius: 18px;
        }

        .advice-section-head,
        .advice-insights {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzTagModule],
})
export class DashboardAdviceComponent {
  @Input() insights: DashboardInsight[] = [];
  @Input() windowLabel = '';
}
