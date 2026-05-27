import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DeviceDetailComponent } from '../detail/device-detail.component';

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['../list/device-list.component.less', '../detail/device-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class DeviceConfigComponent extends DeviceDetailComponent {}
