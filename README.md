# NavMesh Web

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![ng-zorro](https://img.shields.io/badge/ng--zorro-21-1890ff)](https://ng.ant.design/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

NavMesh Web 是 [NavMesh Go](https://github.com/wfu-work/navmesh-go) 的管理控制台。NavMesh Go 是一个面向边缘设备的远程接入网关，适用于处在 NAT、内网、4G/5G 路由器或客户现场网络后的设备。

管理端用于完成设备接入、SSH 入口、HTTP 映射、隧道会话、访问策略、事件、审计日志和运行期配置等日常运维工作。

## 功能特性

- 设备列表：展示在线状态、设备身份、系统信息、外网 IP 和位置。
- 设备详情：管理设备资料、Token、SSH、HTTP 映射、会话和事件。
- 设备 Token：支持创建、轮换、启用和禁用。
- 设备分组和设备类型默认值管理。
- SSH 入口地址和 SSH 别名管理。
- HTTP 映射和自定义域名管理。
- HTTP 访问日志查询和故障排查。
- 在线隧道连接和会话记录查看。
- 事件中心：展示设备离线和连接失败等事件。
- 访问策略：控制 SSH 和 HTTP 映射访问权限。
- 运行期设置：管理网关端口、域名、保留策略和限流参数。
- 内置使用指南：展示 `navmesh-client` 安装和启动方式。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端框架 | Angular 21 |
| UI 组件 | ng-zorro-antd、ng-alain、@delon |
| 图表 | ECharts、@delon/chart |
| 认证 | @delon/auth |
| 样式 | Less |
| 包管理 | pnpm 或 npm |
| 后端 | NavMesh Go REST API，默认前缀 `/api` |

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm start
```

项目使用 Angular CLI，并通过 `proxy.conf.js` 代理后端请求。

默认代理目标：

```text
/api -> https://navmesh.navfirst.com/api/
/dev -> http://127.0.0.1:3007/api/
```

如果本地 NavMesh Go 服务端使用其他端口，请修改 `proxy.conf.js` 中的 `/dev` 目标地址。

## 常用脚本

```bash
npm start
npm run build
npm run lint
npm run test
npm run analyze
```

## 客户端安装指南

控制台内置使用指南页面，用于展示 `navmesh-client` 的安装和启动命令。

推荐 Linux 一键安装命令：

```bash
curl -fsSL https://github.com/wfu-work/navmesh-go/releases/latest/download/install-client.sh | sudo sh -s -- \
  --server navmesh.navfirst.com \
  --api https://navmesh.navfirst.com \
  --port 3008 \
  --token xxxxxx
```

如果设备无法稳定访问 GitHub，可以把 `install-client.sh` 和对应平台二进制，例如 `navmesh-client-linux-arm64`，同步到自己的下载域名：

```bash
curl -fsSL https://navmesh.navfirst.com/download/install-client.sh | sudo sh -s -- \
  --download-base https://navmesh.navfirst.com/download \
  --server navmesh.navfirst.com \
  --api https://navmesh.navfirst.com \
  --port 3008 \
  --token xxxxxx
```

设备默认安装路径：

```text
/opt/navmesh/navmesh-client
/opt/navmesh/navmesh-client.json
/usr/local/bin/navmesh-client
/etc/systemd/system/navmesh-client.service
```

## 构建

构建生产资源：

```bash
npm run build
```

构建产物目录：

```text
dist/navmesh-web
```

NavMesh Go 后端通过 `webs/navmesh-web.zip` 内嵌前端构建产物。

## 目录结构

```text
.
├── src/app/layout/       # 应用布局和导航
├── src/app/routes/       # 功能页面
├── src/app/core/         # 核心服务和启动逻辑
├── src/app/shared/       # 共享组件和工具
├── public/               # 公共静态资源
├── proxy.conf.js         # 开发代理配置
├── angular.json
├── package.json
└── README.md
```

## 后端兼容性

NavMesh Web 默认对接 NavMesh Go 的 `/api` 前缀。

主要 API 分组：

| 模块 | API |
| --- | --- |
| 设备 | `/api/devices/*` |
| 设备 Token | `/api/devices/:guid/tokens` |
| 设备分组 | `/api/device-groups/*` |
| SSH 入口地址 | `/api/ssh-entrypoints/*` |
| SSH 别名 | `/api/ssh-aliases/*` |
| HTTP 映射 | `/api/port-mappings/*` |
| 自定义域名 | `/api/custom-domains/*` |
| 隧道连接 | `/api/tunnel/connections` |
| 会话记录 | `/api/tunnel-sessions/*` |
| 事件中心 | `/api/events/*` |
| 访问策略 | `/api/access-policies/*` |
| 审计日志 | `/api/audit-logs/*` |
| 系统设置 | `/api/settings/*` |

## 安全建议

- 不要在缺少后端认证的情况下暴露管理控制台。
- 生产环境请修改 NavMesh 默认设备注册 Token。
- 生产环境请修改后端 JWT 签名密钥。
- 生产环境请在入口网关或反向代理层启用 HTTPS。
- 建议通过网络策略限制管理端访问来源。

## 贡献

欢迎提交 Issue 和 Pull Request。

推荐本地检查：

```bash
npm run lint
npm run test
npm run build
```

## 许可证

NavMesh Web 基于 [MIT License](LICENSE) 开源。
