import { Routes } from '@angular/router';

import { TunnelConnectionsComponent } from './connections/tunnel-connections.component';

export const routes: Routes = [
  { path: '', redirectTo: 'connections', pathMatch: 'full' },
  { path: 'connections', component: TunnelConnectionsComponent, data: { title: '在线连接' } },
];
