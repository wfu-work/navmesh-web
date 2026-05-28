import { Routes } from '@angular/router';
import { startPageGuard } from '@core';
import { authSimpleCanActivate, authSimpleCanActivateChild } from '@delon/auth';

import { LayoutBasic } from '../layout';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HelpComponent } from './help/help.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBasic,
    canActivate: [startPageGuard, authSimpleCanActivate],
    canActivateChild: [authSimpleCanActivateChild],
    data: {},
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: '工作台' } },
      { path: 'devices', loadChildren: () => import('./devices/routes').then((m) => m.routes) },
      { path: 'events', loadChildren: () => import('./events/routes').then((m) => m.routes) },
      { path: 'tunnels', loadChildren: () => import('./tunnels/routes').then((m) => m.routes) },
      { path: 'sessions', loadChildren: () => import('./sessions/routes').then((m) => m.routes) },
      { path: 'policies', loadChildren: () => import('./policies/routes').then((m) => m.routes) },
      { path: 'audit', loadChildren: () => import('./audit/routes').then((m) => m.routes) },
      { path: 'settings', loadChildren: () => import('./settings/routes').then((m) => m.routes) },
      { path: 'help', component: HelpComponent, data: { title: '帮助' } },
    ],
  },
  { path: '', loadChildren: () => import('./passport/routes').then((m) => m.routes) },
  { path: 'exception', loadChildren: () => import('./exception/routes').then((m) => m.routes) },
  { path: '**', redirectTo: 'exception/404' },
];
