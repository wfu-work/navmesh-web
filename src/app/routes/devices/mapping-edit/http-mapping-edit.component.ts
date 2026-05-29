import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { Device } from '../devices.service';
import { HttpAccessService, PortMapping } from '../http-access.service';

export interface HttpMappingEditData {
  deviceGuid: string;
  device?: Device;
  mapping?: PortMapping;
  defaultPublicHost?: string;
  defaultTargetPort?: number;
  defaultIsCustomDomain?: boolean;
}

@Component({
  selector: 'app-http-mapping-edit',
  templateUrl: './http-mapping-edit.component.html',
  styleUrls: ['./http-mapping-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class HttpMappingEditComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly data = inject<HttpMappingEditData>(NZ_MODAL_DATA);

  protected readonly form = this.fb.group({
    guid: [this.data.mapping?.guid ?? ''],
    name: [this.data.mapping?.name || this.data.device?.alias || this.data.device?.hostname || '', [Validators.required]],
    publicHost: [this.data.mapping?.publicHost || this.data.defaultPublicHost || this.data.device?.webDomain || '', [Validators.required]],
    targetHost: [this.data.mapping?.targetHost || '127.0.0.1', [Validators.required]],
    targetPort: [
      this.data.mapping?.targetPort || this.data.defaultTargetPort || this.data.device?.webPort || 80,
      [Validators.required, Validators.min(1), Validators.max(65535)],
    ],
    protocol: [this.data.mapping?.protocol || 'http', [Validators.required]],
    isCustomDomain: [this.data.mapping?.isCustomDomain ?? this.data.defaultIsCustomDomain ?? Boolean(this.data.device?.webDomain)],
  });

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }

    const value = this.form.getRawValue();
    return this.httpAccessService
      .save({
        guid: value.guid || undefined,
        deviceGuid: this.data.deviceGuid,
        name: value.name.trim(),
        publicHost: value.publicHost.trim(),
        targetHost: value.targetHost.trim(),
        targetPort: Number(value.targetPort),
        protocol: value.protocol,
        isCustomDomain: value.isCustomDomain,
        status: 1,
      })
      .pipe(map(() => true));
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
