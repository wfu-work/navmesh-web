import { Routes } from '@angular/router';

import { EmailConfigsComponent } from './email-configs/email-configs.component';
import { MessageRecipientsComponent } from './recipients/message-recipients.component';
import { MessageSendRecordsComponent } from './send-records/message-send-records.component';
import { MessageTemplateEditComponent } from './templates-edit/message-template-edit.component';
import { MessageTemplatesComponent } from './templates/message-templates.component';

export const routes: Routes = [
  { path: '', redirectTo: 'email-configs', pathMatch: 'full' },
  {
    path: 'email-configs',
    component: EmailConfigsComponent,
    data: { title: '邮件配置' },
  },
  {
    path: 'templates/create',
    component: MessageTemplateEditComponent,
    data: { title: '新增消息模板' },
  },
  {
    path: 'templates/edit/:identity',
    component: MessageTemplateEditComponent,
    data: { title: '编辑消息模板' },
  },
  {
    path: 'templates',
    component: MessageTemplatesComponent,
    data: { title: '消息模板' },
  },
  {
    path: 'recipients',
    component: MessageRecipientsComponent,
    data: { title: '通知人员' },
  },
  {
    path: 'send-records',
    component: MessageSendRecordsComponent,
    data: { title: '发送记录' },
  },
];
