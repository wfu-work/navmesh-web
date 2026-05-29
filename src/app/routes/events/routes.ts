import { Routes } from '@angular/router';

import { EventDetailComponent } from './detail/event-detail.component';
import { EventListComponent } from './list/event-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: EventListComponent,
    data: { title: '事件中心' },
  },
  {
    path: ':guid',
    component: EventDetailComponent,
    data: { title: '事件详情' },
  },
];
