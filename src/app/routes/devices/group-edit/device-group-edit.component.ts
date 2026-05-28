import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { DeviceGroup, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-group-edit',
  templateUrl: './device-group-edit.component.html',
  styleUrls: ['./device-group-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class DeviceGroupEditComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly devicesService = inject(DevicesService);
  protected readonly row = inject<DeviceGroup | undefined>(NZ_MODAL_DATA);

  protected readonly iconOptions = [
    { value: 'appstore' },
    { value: 'code' },
    { value: 'radar-chart' },
    { value: 'dot-chart' },
    { value: 'cloud' },
    { value: 'database' },
    { value: 'experiment' },
    { value: 'deployment-unit' },
    { value: 'control' },
    { value: 'global' },
    { value: 'api' },
    { value: 'dashboard' },
    { value: 'desktop' },
    { value: 'laptop' },
    { value: 'mobile' },
    { value: 'tablet' },
    { value: 'hdd' },
    { value: 'cloud-server' },
    { value: 'cluster' },
    { value: 'partition' },
    { value: 'apartment' },
    { value: 'branches' },
    { value: 'node-index' },
    { value: 'gateway' },
    { value: 'wifi' },
    { value: 'usb' },
    { value: 'monitor' },
    { value: 'container' },
    { value: 'line-chart' },
    { value: 'bar-chart' },
    { value: 'area-chart' },
    { value: 'box-plot' },
    { value: 'fund' },
    { value: 'fund-projection-screen' },
    { value: 'tool' },
    { value: 'setting' },
    { value: 'sliders' },
    { value: 'rocket' },
    { value: 'thunderbolt' },
    { value: 'bug' },
    { value: 'build' },
    { value: 'security-scan' },
    { value: 'safety-certificate' },
    { value: 'key' },
    { value: 'lock' },
    { value: 'printer' },
    { value: 'scan' },
    { value: 'barcode' },
    { value: 'qrcode' },
    { value: 'environment' },
    { value: 'compass' },
    { value: 'pushpin' },
    { value: 'fire' },
    { value: 'apple' },
    { value: 'windows' },
    { value: 'android' },
  ];

  protected readonly form = this.fb.group({
    key: [{ value: this.groupKey(this.row), disabled: Boolean(this.row) }, [Validators.required]],
    name: [this.row?.name ?? '', [Validators.required]],
    icon: [this.iconLabel(this.row?.icon)],
    defaultWebPort: [this.row?.defaultWebPort ?? 0],
    defaultDomain: [this.row?.defaultDomain ?? ''],
    sort: [this.row?.sort ?? 0],
    remark: [this.row?.remark ?? ''],
    status: [this.row?.status ?? 1],
  });

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }

    const value = this.form.getRawValue();
    return this.devicesService
      .saveGroup({
        guid: this.row?.guid || undefined,
        key: value.key.trim(),
        name: value.name.trim(),
        icon: value.icon,
        defaultWebPort: Number(value.defaultWebPort || 0),
        defaultDomain: value.defaultDomain.trim(),
        sort: Number(value.sort || 0),
        remark: value.remark.trim(),
        status: value.status,
      })
      .pipe(map(() => true));
  }

  protected selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
    this.form.controls.icon.markAsDirty();
  }

  private groupKey(item: DeviceGroup | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid);
  }

  private iconLabel(icon: string | undefined): string {
    if (icon === 'terminal') return 'code';
    return icon || 'appstore';
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }
}
