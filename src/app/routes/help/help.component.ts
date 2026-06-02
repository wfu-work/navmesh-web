import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '@env/environment';
import { SHARED_IMPORTS } from '@shared';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

interface HelpLink {
  title: string;
  description: string;
  link: string;
  icon: string;
}

interface HelpStep {
  title: string;
  description: string;
}

interface DownloadLink {
  label: string;
  href: string;
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
      title: '版本管理',
      description: '上传并启用边缘客户端版本，安装包可按版本独立下载。',
      link: '/version/release',
      icon: 'cloud-upload',
    },
    {
      title: '设备列表',
      description: '查看在线状态、外网 IP、位置、系统版本，并进入设备配置。',
      link: '/devices/list',
      icon: 'mobile',
    },
    {
      title: '在线连接',
      description: '确认 navmesh-client 是否已经建立 QUIC 隧道连接。',
      link: '/tunnels/connections',
      icon: 'partition',
    },
    {
      title: '访问策略',
      description: '按全局、设备、分组或映射控制 SSH/HTTP 访问。',
      link: '/policies/list',
      icon: 'safety-certificate',
    },
    {
      title: '访问日志',
      description: '排查 HTTP 映射请求来源、状态码、耗时和返回结果。',
      link: '/devices/access-logs',
      icon: 'file-search',
    },
  ];

  protected readonly steps: HelpStep[] = [
    {
      title: '安装并启动客户端',
      description: '先在版本管理中启用边缘客户端版本，再使用后台下载地址安装。',
    },
    {
      title: '确认设备上线',
      description: '进入设备列表，确认设备状态、设备号和设备类型是否正确。',
    },
    {
      title: '检查在线连接',
      description: '进入在线连接，确认该设备已经建立 QUIC 隧道。',
    },
    {
      title: '配置 SSH 或 HTTP 映射',
      description: '在设备配置中维护 SSH 别名、HTTP 映射和默认端口域名。',
    },
    {
      title: '查看日志和事件',
      description: '访问失败时优先看访问日志、会话记录和事件中心。',
    },
  ];

  protected readonly downloadLinks: DownloadLink[] = [
    { label: 'linux amd64', os: 'linux', arch: 'amd64' },
    { label: 'linux arm64', os: 'linux', arch: 'arm64' },
    { label: 'darwin arm64', os: 'darwin', arch: 'arm64' },
    { label: 'windows amd64', os: 'windows', arch: 'amd64' },
  ].map((platform) => ({
    label: platform.label,
    href: `${this.downloadBase}/releases/latest?releaseType=navmesh&os=${platform.os}&arch=${platform.arch}`,
  }));

  protected readonly installCommand = [
    `curl -fsSL ${this.downloadBase}/install-client.sh | sudo sh -s -- \\`,
    `  --download-base ${this.downloadBase} \\`,
    '  --server navmesh.navfirst.com \\',
    '  --api https://navmesh.navfirst.com \\',
    '  --port 3008 \\',
    '  --token navfirst@2020',
  ].join('\n');

  protected readonly githubInstallCommand = [
    'curl -fsSL https://github.com/wfu-work/navmesh-go/releases/latest/download/install-client.sh | sudo sh -s -- \\',
    '  --server navmesh.navfirst.com \\',
    '  --api https://navmesh.navfirst.com \\',
    '  --port 3008 \\',
    '  --token navfirst@2020',
  ].join('\n');

  protected readonly manualCommand = [
    'navmesh-client',
    '-server navmesh.navfirst.com',
    '-api https://navmesh.navfirst.com',
    '-port 3008',
    '-token navfirst@2020',
    '-sshPort 22',
  ].join(' ');

  protected readonly installPaths = [
    '/opt/navmesh/navmesh-client',
    '/opt/navmesh/navmesh-client.json',
    '/usr/local/bin/navmesh-client',
    '/etc/systemd/system/navmesh-client.service',
  ];

  protected get downloadBase(): string {
    const baseUrl = `${environment.api.baseUrl || ''}`.replace(/\/$/, '');
    if (/^https?:\/\//.test(baseUrl)) return `${baseUrl}/downloads`;
    const origin = globalThis.location?.origin || '';
    return `${origin}${baseUrl}/downloads`;
  }
}
