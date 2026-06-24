import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { Device, DevicesService } from '../../devices/devices.service';
import { MESSAGE_TYPE_OPTIONS, normalizeMessageTypes } from '../message-type-options';
import { MessageRecipient, MessagesService } from '../messages.service';

@Component({
  selector: 'app-message-recipient-edit',
  templateUrl: './recipient-edit.component.html',
  styleUrls: ['./recipient-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class RecipientEditComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messagesService = inject(MessagesService);
  private readonly devicesService = inject(DevicesService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly row = inject<MessageRecipient | undefined>(NZ_MODAL_DATA);
  protected readonly messageTypeOptions = MESSAGE_TYPE_OPTIONS;
  protected devices: Device[] = [];
  protected devicesLoading = false;

  protected readonly form = this.fb.group({
    name: [this.row?.name ?? '', [Validators.required]],
    email: [this.row?.email ?? '', [Validators.required, Validators.email]],
    messageTypes: [this.initialMessageTypes(), [Validators.required]],
    deviceGuids: [this.initialDeviceGuids()],
    tags: [this.row?.tags ?? ''],
    remark: [this.row?.remark ?? ''],
    status: [this.row?.status ?? 1],
  });

  ngOnInit(): void {
    this.loadDevices();
  }

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }
    const value = this.form.getRawValue();
    return this.messagesService
      .saveRecipient({
        guid: this.row?.guid,
        name: value.name.trim(),
        email: value.email.trim(),
        messageTypes: value.messageTypes.join(','),
        deviceGuids: value.deviceGuids.join(','),
        tags: value.tags.trim(),
        remark: value.remark.trim(),
        status: Number(value.status),
      })
      .pipe(map(() => true));
  }

  private initialMessageTypes(): string[] {
    if (!this.row) {
      return normalizeMessageTypes();
    }
    return normalizeMessageTypes(this.row.messageTypes || this.row.message_types);
  }

  protected deviceOptionLabel(item: Device): string {
    return this.firstText(item.sncode, item.alias, item.name, item.hostname, item.guid);
  }

  private loadDevices(): void {
    this.devicesLoading = true;
    this.devicesService.list({ page: 1, size: 500 }).subscribe({
      next: (res) => {
        this.devices = res.data ?? [];
        this.devicesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.devicesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private initialDeviceGuids(): string[] {
    return this.parseCSV(this.row?.deviceGuids || this.row?.device_guids);
  }

  private parseCSV(value: string | undefined): string[] {
    return (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private firstText(...values: Array<string | undefined | null>): string {
    return values.find((value) => value !== undefined && value !== null && value !== '') ?? '';
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
