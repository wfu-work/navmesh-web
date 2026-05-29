import { Routes } from '@angular/router';

import { AuditLogsComponent } from './logs/audit-logs.component';

export const routes: Routes = [
  { path: '', redirectTo: 'logs', pathMatch: 'full' },
  { path: 'logs', component: AuditLogsComponent, data: { title: '审计日志' } },
];
