import { Routes } from '@angular/router';

import { DeviceDetailComponent } from './detail/device-detail.component';
import { DeviceEditComponent } from './edit/device-edit.component';
import { DeviceGroupsComponent } from './groups/device-groups.component';
import { DeviceListComponent } from './list/device-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: DeviceListComponent,
    data: { title: '设备列表' },
  },
  { path: 'groups', component: DeviceGroupsComponent, data: { title: '设备类型' } },
  {
    path: 'edit/:guid',
    component: DeviceEditComponent,
    data: { title: '编辑设备' },
  },
  {
    path: 'detail/:guid',
    component: DeviceDetailComponent,
    data: { title: '设备详情' },
  },
  {
    path: ':guid',
    component: DeviceDetailComponent,
    data: { title: '设备详情' },
  },
];
