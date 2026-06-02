import { Routes } from '@angular/router';

import { AccountSecurityComponent } from './account/account-security.component';
import { RetentionSettingsComponent } from './retention/retention-settings.component';
import { SystemSettingsComponent } from './system/system-settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'system', pathMatch: 'full' },
  {
    path: 'system',
    component: SystemSettingsComponent,
    data: { title: '系统配置' },
  },
  {
    path: 'retention',
    component: RetentionSettingsComponent,
    data: { title: '数据保留' },
  },
  {
    path: 'account',
    component: AccountSecurityComponent,
    data: { title: '账号安全' },
  },
];
