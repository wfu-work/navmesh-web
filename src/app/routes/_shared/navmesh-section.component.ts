import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface SectionAction {
  label: string;
  link: string;
}

interface SectionItem {
  label: string;
  value: string;
  tone?: 'normal' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-navmesh-section',
  template: `
    <section class="section-page">
      <div class="section-heading">
        <div>
          <h1>{{ title }}</h1>
          <p class="section-description">{{ description }}</p>
        </div>

        @if (primaryAction) {
          <a class="section-action" [routerLink]="primaryAction.link">
            <nz-icon nzType="plus" />
            <span>{{ primaryAction.label }}</span>
          </a>
        }
      </div>

      <div class="section-grid">
        @for (item of items; track item.label) {
          <article class="section-metric" [class]="'section-metric-' + (item.tone ?? 'normal')">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        }
      </div>

      <div class="section-board">
        <div class="section-board-icon">
          <nz-icon [nzType]="icon" />
        </div>
        <div>
          <h2>{{ boardTitle }}</h2>
          <p>{{ boardDescription }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .section-page {
        min-width: 0;
      }

      .section-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        min-width: 0;
      }

      h1 {
        margin: 0;
        color: #172235;
        font-size: 26px;
        font-weight: 800;
        line-height: 1.28;
        letter-spacing: 0;
      }

      .section-description {
        max-width: 720px;
        margin: 8px 0 0;
        color: #65727f;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.7;
      }

      .section-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 0 0 auto;
        min-height: 40px;
        padding: 0 16px;
        border-radius: 10px;
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        background: #0d8f5d;
        box-shadow: 0 10px 22px rgb(13 143 93 / 18%);
      }

      .section-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 26px;
      }

      .section-metric {
        min-width: 0;
        padding: 20px;
        border: 1px solid #dde7e3;
        border-radius: 8px;
        background: #fff;
      }

      .section-metric span,
      .section-metric strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .section-metric span {
        color: #6a7785;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      .section-metric strong {
        margin-top: 8px;
        color: #223047;
        font-size: 21px;
        font-weight: 850;
        line-height: 1.25;
      }

      .section-metric-success strong {
        color: #0d8f5d;
      }

      .section-metric-warning strong {
        color: #b56a00;
      }

      .section-metric-danger strong {
        color: #c53a3a;
      }

      .section-board {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
        margin-top: 18px;
        padding: 22px;
        border: 1px dashed #cbd9d4;
        border-radius: 8px;
        background: #f8fbfa;
      }

      .section-board-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 54px;
        border-radius: 8px;
        color: #0d8f5d;
        font-size: 24px;
        background: #e7f5f0;
      }

      .section-board h2 {
        margin: 0;
        color: #223047;
        font-size: 17px;
        font-weight: 850;
        line-height: 1.45;
      }

      .section-board p {
        margin: 6px 0 0;
        color: #687685;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.7;
      }

      @media (max-width: 1199px) {
        .section-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 767px) {
        .section-heading {
          display: block;
        }

        .section-action {
          margin-top: 16px;
        }

        .section-grid {
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 20px;
        }

        .section-board {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NzIconModule],
})
export class NavMeshSectionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = this.route.snapshot.data;

  protected readonly title = String(this.data['title'] ?? 'NavMesh');
  protected readonly description = String(this.data['description'] ?? '');
  protected readonly icon = String(this.data['icon'] ?? 'apartment');
  protected readonly boardTitle = String(this.data['boardTitle'] ?? '待接入接口');
  protected readonly boardDescription = String(this.data['boardDescription'] ?? '');
  protected readonly primaryAction = this.data['primaryAction'] as SectionAction | undefined;
  protected readonly items = (this.data['items'] ?? []) as SectionItem[];
}
