import { Routes } from '@angular/router';

import { SessionListComponent } from './list/session-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: SessionListComponent, data: { title: '会话记录' } },
];
