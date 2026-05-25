import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

interface HelpLink {
  title: string;
  description: string;
  link: string;
}

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class HelpComponent {
  protected readonly links: HelpLink[] = [
    {
      title: '设备接入凭证',
      description: '创建设备 Token，并在客户端注册或心跳时使用。',
      link: '/devices/tokens',
    },
    {
      title: 'SSH 入口地址',
      description: '维护 SSH Gateway 对外入口 IP 和设备别名。',
      link: '/ssh/entrypoints',
    },
    {
      title: 'HTTP 映射',
      description: '把公网 Host 转发到设备侧本地 HTTP 服务。',
      link: '/mappings/list',
    },
    {
      title: '访问策略',
      description: '按全局、设备、分组或映射控制 SSH/HTTP 访问。',
      link: '/policies/list',
    },
  ];

  protected readonly command = [
    'navmesh-client',
    '-server tunnel.navfirst.com',
    '-port 3008',
    '-token <device-token>',
    '-sncode test01',
    '-type rain',
    '-sshPort 22',
    '-webPort 7090',
  ].join(' ');
}
