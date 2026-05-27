import { AsyncPipe, JsonPipe, NgTemplateOutlet } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { DatePipe, I18nPipe } from '@delon/theme';

import { SHARED_DELON_MODULES } from './shared-delon.module';
import { SHARED_ZORRO_MODULES } from './shared-zorro.module';
import { ConsLogsComponent } from './components/cons-logs/cons-logs.component';
import { PasswordInputComponent } from './components/password-input/password-input.component';

export const SHARED_IMPORTS = [
  FormsModule,
  ReactiveFormsModule,
  ClipboardModule,
  RouterLink,
  RouterOutlet,
  NgTemplateOutlet,
  I18nPipe,
  JsonPipe,
  DatePipe,
  AsyncPipe,
  ConsLogsComponent,
  PasswordInputComponent,
  ...SHARED_DELON_MODULES,
  ...SHARED_ZORRO_MODULES,
];
