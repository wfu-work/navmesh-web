import { HttpClient } from '@angular/common/http';
import {
  EnvironmentProviders,
  Injectable,
  Provider,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { ACLService } from '@delon/acl';
import { MenuService, SettingsService, TitleService } from '@delon/theme';
import type { NzSafeAny } from 'ng-zorro-antd/core/types';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Used for application startup
 * Generally used to get the basic data of the application, like: Menu Data, User Data, etc.
 */
export function provideStartup(): Array<Provider | EnvironmentProviders> {
  return [
    StartupService,
    provideAppInitializer(() => {
      const initializerFn = (
        (startupService: StartupService) => () =>
          startupService.load()
      )(inject(StartupService));
      return initializerFn();
    }),
  ];
}

@Injectable()
export class StartupService {
  private menuService = inject(MenuService);
  private settingService = inject(SettingsService);
  private aclService = inject(ACLService);
  private titleService = inject(TitleService);
  private httpClient = inject(HttpClient);

  private appData$ = this.httpClient.get('/user').pipe(
    catchError((res: NzSafeAny) => {
      console.warn(`StartupService.load: Network request failed`, res);
      return of({});
    }),
  );

  private handleAppData(res: NzSafeAny): void {
    const user = {
      ...res,
      name: res.username,
      avatar: res.avatar || 'assets/avatar.gif',
      roleCodeList: res.roleCodeList ?? ['SUPER_ADMIN'],
      abilities: res.abilities ?? [],
    };
    this.settingService.setUser(user);
    this.aclService.setFull(false);
    this.aclService.set({
      role: user.roleCodeList,
      ability: user.abilities,
      except: false,
      mode: 'oneOf',
    });
    this.settingService.setApp({
      title: 'NavMesh',
      copyright: '武汉小兮科技',
      version: 'V1.0.0',
    });
    this.titleService.suffix = 'NavMesh';
  }

  private viaHttp(): Observable<void> {
    return this.appData$.pipe(
      map((appData: NzSafeAny) => {
        this.handleAppData(appData);
      }),
    );
  }

  load(): Observable<void> {
    return this.viaHttp();
  }
}
