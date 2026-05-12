import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DevicesService, DeviceTypeDefault } from '../devices.service';

@Component({
  selector: 'app-device-type-defaults',
  template: `
    <section class="device-page">
      <div class="device-header">
        <title-label
          title="设备类型"
          description="查看不同设备类型的默认 Web 端口、默认映射域名和接入说明。"
        />
      </div>

      <nz-card class="card-border" [nzBordered]="false">
        <st
          [data]="data"
          [columns]="columns"
          [loading]="loading"
          bordered="false"
          [page]="{ show: false }"
        >
          <ng-template st-row="portRender" let-item>
            @if (item.webPort) {
              <code class="type-code">{{ item.webPort }}</code>
            } @else {
              <span class="text-grey">无默认 Web 端口</span>
            }
          </ng-template>

          <ng-template st-row="domainRender" let-item>
            @if (item.webDomain) {
              <code class="type-code">{{ item.webDomain }}</code>
            } @else {
              <span class="text-grey">仅 SSH 接入</span>
            }
          </ng-template>
        </st>
      </nz-card>
    </section>
  `,
  styles: [
    `
      .type-code {
        padding: 2px 8px;
        border-radius: 6px;
        color: #405165;
        background: #f1f5f4;
      }
    `,
  ],
  styleUrls: ['../list/device-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceTypeDefaultsComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected data: DeviceTypeDefault[] = [];
  protected loading = false;

  protected readonly columns: STColumn<DeviceTypeDefault>[] = [
    { title: '设备类型', index: 'type' },
    { title: '默认 Web 端口', index: 'webPort', render: 'portRender' },
    { title: '默认映射域名', index: 'webDomain', render: 'domainRender' },
    { title: '说明', index: 'remark', default: '-' },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.devicesService
      .typeDefaults()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = res ?? [];
        },
        error: () => this.message.error('设备类型默认值加载失败'),
      });
  }
}
