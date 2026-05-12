import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StartupService } from '@core';
import { ReuseTabService } from '@delon/abc/reuse-tab';
import { DA_SERVICE_TOKEN, SocialOpenType, SocialService } from '@delon/auth';
import { SettingsService, _HttpClient } from '@delon/theme';
import { environment } from '@env/environment';
import { PasswordInputComponent } from '@shared';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabChangeEvent, NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { finalize } from 'rxjs';

@Component({
  selector: 'passport-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  providers: [SocialService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    NzCheckboxModule,
    NzTabsModule,
    NzAlertModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzTooltipModule,
    NzIconModule,
    PasswordInputComponent,
  ],
})
export class UserLoginComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);
  private readonly socialService = inject(SocialService);
  private readonly reuseTabService = inject(ReuseTabService, { optional: true });
  private readonly tokenService = inject(DA_SERVICE_TOKEN);
  private readonly startupSrv = inject(StartupService);
  private readonly http = inject(_HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly messageService = inject(NzMessageService);

  form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    captcha: ['', [Validators.required]],
    remember: [true],
  });
  error = '';
  type = 0;
  loading = false;

  count = 0;
  interval$?: ReturnType<typeof setInterval>;

  switch({ index }: NzTabChangeEvent): void {
    this.type = index!;
  }

  getCaptcha(): void {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsDirty({ onlySelf: true });
      email.updateValueAndValidity({ onlySelf: true });
      return;
    }
    this.count = 59;
    this.interval$ = setInterval(() => {
      this.count -= 1;
      this.cdr.detectChanges();
      if (this.count <= 0) {
        clearInterval(this.interval$);
      }
    }, 1000);
  }

  submit(): void {
    this.error = '';
    if (this.type === 0) {
      const { username, password } = this.form.controls;
      username.markAsDirty();
      username.updateValueAndValidity();
      password.markAsDirty();
      password.updateValueAndValidity();
      if (username.invalid || password.invalid) {
        return;
      }
    } else {
      const { email, captcha } = this.form.controls;
      email.markAsDirty();
      email.updateValueAndValidity();
      captcha.markAsDirty();
      captcha.updateValueAndValidity();
      if (email.invalid || captcha.invalid) {
        return;
      }
    }

    this.loading = true;
    this.cdr.detectChanges();
    if (this.type === 1) {
      this.loginWithEmail();
      return;
    }
    this.loginWithPassword();
  }

  private loginWithPassword(): void {
    this.http.post('/secret/encrypt', this.form.value.password).subscribe({
      next: (res) => {
        this.http
          .post('/login/in', {
            username: this.form.value.username,
            password: res,
          })
          .pipe(
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }),
          )
          .subscribe({
            next: (r) => {
              {
                if (!r) {
                  this.error = '登录失败，请检查管理员账号或密码';
                  this.cdr.detectChanges();
                  return;
                }
                this.loading = false;
                this.reuseTabService?.clear();
                this.tokenService.set({
                  token: r.token,
                  refresh_token: r.refreshToken,
                  expired: new Date().getSeconds() + r.expired,
                  username: this.form.value.username,
                  password: res,
                  remember: true,
                });
                this.startupSrv.load().subscribe({
                  next: () => {
                    let url = this.tokenService.referrer?.url || '/';
                    if (url.includes('/passport')) {
                      url = '/';
                    }
                    this.router.navigateByUrl(url);
                    this.messageService.success('已进入 NavMesh 控制台');
                    this.loading = false;
                    this.cdr.detectChanges();
                  },
                  error: (e) => {
                    this.loading = false;
                    this.messageService.error(e || '暂时无法登录，请稍后重试');
                    this.cdr.detectChanges();
                  },
                });
                this.cdr.detectChanges();
              }
            },
            error: (e) => {
              this.loading = false;
              this.cdr.detectChanges();
            },
            complete: () => {
              this.loading = false;
              this.cdr.detectChanges();
            },
          });
      },
      error: (e) => {
        this.messageService.error(e.error?.msg || '登录安全校验异常，请稍后重试');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loginWithEmail(): void {
    this.http
      .post('/login/in', {
        username: this.form.value.email,
        captcha: this.form.value.captcha,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (r) => {
          if (!r) {
            this.error = '登录失败，请检查管理员邮箱或验证码';
            this.cdr.detectChanges();
            return;
          }
          this.reuseTabService?.clear();
          this.tokenService.set({
            token: r.token,
            refresh_token: r.refreshToken,
            expired: new Date().getSeconds() + r.expired,
            username: this.form.value.email,
            remember: true,
          });
          this.startupSrv.load().subscribe({
            next: () => {
              let url = this.tokenService.referrer?.url || '/';
              if (url.includes('/passport')) {
                url = '/';
              }
              this.router.navigateByUrl(url);
              this.messageService.success('已进入 NavMesh 控制台');
              this.cdr.detectChanges();
            },
            error: (e) => {
              this.messageService.error(e || '暂时无法登录，请稍后重试');
              this.cdr.detectChanges();
            },
          });
        },
        error: (e) => {
          this.messageService.error(e?.msg || '系统异常，请稍后重试');
          this.cdr.detectChanges();
        },
      });
  }

  open(type: string, openType: SocialOpenType = 'href'): void {
    let url = ``;
    let callback = ``;
    if (environment.production) {
      callback = `https://ng-alain.github.io/ng-alain/#/passport/callback/${type}`;
    } else {
      callback = `http://localhost:4200/#/passport/callback/${type}`;
    }
    switch (type) {
      case 'auth0':
        url = `//cipchk.auth0.com/login?client=8gcNydIDzGBYxzqV0Vm1CX_RXH-wsWo5&redirect_uri=${decodeURIComponent(callback)}`;
        break;
      case 'github':
        url = `//github.com/login/oauth/authorize?client_id=9d6baae4b04a23fcafa2&response_type=code&redirect_uri=${decodeURIComponent(
          callback,
        )}`;
        break;
      case 'weibo':
        url = `https://api.weibo.com/oauth2/authorize?client_id=1239507802&response_type=code&redirect_uri=${decodeURIComponent(callback)}`;
        break;
    }
    if (openType === 'window') {
      this.socialService
        .login(url, '/', {
          type: 'window',
        })
        .subscribe((res) => {
          if (res) {
            this.settingsService.setUser(res);
            this.router.navigateByUrl('/');
          }
        });
    } else {
      this.socialService.login(url, '/', {
        type: 'href',
      });
    }
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }
}
