import { Routes } from '@angular/router';

import { AccessLogsComponent } from './access-logs/access-logs.component';
import { CustomDomainsComponent } from './custom-domains/custom-domains.component';
import { MappingListComponent } from './list/mapping-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: MappingListComponent, data: { title: '映射列表' } },
  { path: 'access-logs', component: AccessLogsComponent, data: { title: '访问日志' } },
  { path: 'custom-domains', component: CustomDomainsComponent, data: { title: '自定义域名' } },
];
