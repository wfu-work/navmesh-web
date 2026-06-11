import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, catchError, map, of } from 'rxjs';

import { Device } from '../devices.service';
import { HttpAccessService, TCPMapping, TCPPortRange } from '../http-access.service';

export interface TcpMappingEditData {
  deviceGuid: string;
  device?: Device;
  mapping?: TCPMapping;
  defaultPublicHost?: string;
  defaultTargetPort?: number;
}

@Component({
  selector: 'app-tcp-mapping-edit',
  templateUrl: './tcp-mapping-edit.component.html',
  styleUrls: ['./http-mapping-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class TcpMappingEditComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly data = inject<TcpMappingEditData>(NZ_MODAL_DATA);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly publicPortValidator = (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    const port = Number(raw);
    if (!Number.isFinite(port) || port < 0 || port > 65535) {
      return { port: true };
    }
    if (port === 0 || !this.portRange) {
      return null;
    }
    if (port < this.portRange.min || port > this.portRange.max) {
      return { portRange: true };
    }
    return null;
  };

  protected portRange?: TCPPortRange;

  protected readonly form = this.fb.group({
    guid: [this.data.mapping?.guid ?? ''],
    name: [
      this.data.mapping?.name || this.data.device?.alias || this.data.device?.hostname || '',
      [Validators.required],
    ],
    publicHost: [this.data.mapping?.publicHost || this.data.defaultPublicHost || ''],
    publicPort: [this.data.mapping?.publicPort || undefined, [this.publicPortValidator]],
    targetHost: [this.data.mapping?.targetHost || '127.0.0.1', [Validators.required]],
    targetPort: [
      this.data.mapping?.targetPort ||
        this.data.defaultTargetPort ||
        this.data.device?.webPort ||
        80,
      [Validators.required, Validators.min(1), Validators.max(65535)],
    ],
    remark: [this.data.mapping?.remark || ''],
  });

  ngOnInit(): void {
    this.httpAccessService
      .tcpPortRange()
      .pipe(catchError(() => of(undefined)))
      .subscribe((range) => {
        this.portRange = range;
        this.form.controls.publicPort.updateValueAndValidity({ emitEvent: false });
        this.cdr.markForCheck();
      });
  }

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }

    const value = this.form.getRawValue();
    const publicPort = Number(value.publicPort ?? 0);
    return this.httpAccessService
      .saveTcp({
        guid: value.guid || undefined,
        deviceGuid: this.data.deviceGuid,
        name: value.name.trim(),
        publicHost: value.publicHost.trim() || undefined,
        publicPort: Number.isFinite(publicPort) && publicPort > 0 ? publicPort : undefined,
        targetHost: value.targetHost.trim(),
        targetPort: Number(value.targetPort),
        remark: value.remark.trim() || undefined,
        status: 1,
      })
      .pipe(map(() => true));
  }

  protected publicPortMin(): number {
    return this.portRange?.min ?? 1;
  }

  protected publicPortMax(): number {
    return this.portRange?.max ?? 65535;
  }

  protected publicPortHint(): string {
    if (this.portRange) {
      return `留空自动分配公网端口，可用范围 ${this.portRange.min}-${this.portRange.max}`;
    }
    return '留空时服务端会自动分配公网端口';
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
