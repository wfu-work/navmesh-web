import { Routes } from '@angular/router';

import { ReleaseCreateComponent } from './release-create/release-create.component';
import { ReleaseComponent } from './release/release.component';

export const routes: Routes = [
  { path: '', redirectTo: 'release', pathMatch: 'full' },
  {
    path: 'release/create',
    component: ReleaseCreateComponent,
    data: { title: '新建版本' },
  },
  {
    path: 'release/edit/:guid',
    component: ReleaseCreateComponent,
    data: { title: '编辑版本' },
  },
  {
    path: 'release',
    component: ReleaseComponent,
    data: { title: '版本管理' },
  },
];
