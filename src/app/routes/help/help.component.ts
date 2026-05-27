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
      title: '设备接入配置',
      description: '从设备详情进入激活凭证、SSH 别名和 HTTP 映射配置。',
      link: '/devices/list',
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
