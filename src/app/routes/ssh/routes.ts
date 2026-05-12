import { Routes } from '@angular/router';

import { SSHAliasesComponent } from './aliases/ssh-aliases.component';
import { SSHEntrypointsComponent } from './entrypoints/ssh-entrypoints.component';

export const routes: Routes = [
  { path: '', redirectTo: 'entrypoints', pathMatch: 'full' },
  {
    path: 'entrypoints',
    component: SSHEntrypointsComponent,
    data: { title: 'SSH 入口地址' },
  },
  {
    path: 'aliases',
    component: SSHAliasesComponent,
    data: { title: 'SSH 别名' },
  },
];
