import { Routes } from '@angular/router';

import { NavMeshSectionComponent } from '../_shared/navmesh-section.component';
import { AccountSecurityComponent } from './account/account-security.component';

export const routes: Routes = [
  { path: '', redirectTo: 'system', pathMatch: 'full' },
  {
    path: 'system',
    component: NavMeshSectionComponent,
    data: {
      title: '系统配置',
      description: '维护公网域名、SSH/HTTP 网关、隧道连接和运行参数。',
      icon: 'setting',
      boardTitle: '下一步接入系统配置 API',
      boardDescription: '将对接 GET /api/settings/list 和 PUT /api/settings/:key。',
      items: [
        { label: '配置项', value: '--' },
        { label: '已启用', value: '--', tone: 'success' },
        { label: '待配置', value: '--', tone: 'warning' },
        { label: '最近更新', value: '--' },
      ],
    },
  },
  {
    path: 'retention',
    component: NavMeshSectionComponent,
    data: {
      title: '数据保留',
      description: '配置会话、HTTP 访问日志、审计日志和心跳历史的数据保留策略。',
      icon: 'database',
      boardTitle: '下一步补充保留策略表单',
      boardDescription: '第一版建议先支持会话保留天数、HTTP 日志保留天数和审计日志清理周期。',
      items: [
        { label: '会话保留', value: '3 天' },
        { label: 'HTTP 日志', value: '--' },
        { label: '审计日志', value: '--' },
        { label: '清理任务', value: '--' },
      ],
    },
  },
  {
    path: 'account',
    component: AccountSecurityComponent,
    data: { title: '账号安全' },
  },
];
