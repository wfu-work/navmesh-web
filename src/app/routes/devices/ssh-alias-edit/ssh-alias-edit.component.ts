import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { SSHAlias, SSHService } from '../ssh.service';

export interface SshAliasEditData {
  deviceGuid: string;
  alias?: SSHAlias;
  defaultAlias: string;
  defaultDomain: string;
  defaultEntrypointIp: string;
}

@Component({
  selector: 'app-ssh-alias-edit',
  templateUrl: './ssh-alias-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class SshAliasEditComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly sshService = inject(SSHService);
  private readonly data = inject<SshAliasEditData>(NZ_MODAL_DATA);

  protected readonly form = this.fb.group({
    alias: [this.data.alias?.alias || this.data.defaultAlias, [Validators.required]],
    domain: [this.data.alias?.domain || this.data.defaultDomain, [Validators.required]],
    entrypointIp: [this.data.alias?.entrypointIp || this.data.defaultEntrypointIp],
    status: [this.data.alias?.status ?? 1],
  });

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }

    const value = this.form.getRawValue();
    return this.sshService
      .saveAlias({
        deviceGuid: this.data.deviceGuid,
        alias: value.alias.trim(),
        domain: value.domain.trim(),
        entrypointIp: value.entrypointIp.trim(),
        status: value.status,
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
