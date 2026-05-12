import { Routes } from '@angular/router';

import { PolicyListComponent } from './list/policy-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: PolicyListComponent, data: { title: '访问策略' } },
];
