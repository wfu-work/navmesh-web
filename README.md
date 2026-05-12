# NavMesh Web

NavMesh Web 是 NavMesh 远程接入网关的管理端前端，面向设备接入、SSH 网关、HTTP 映射、隧道会话、权限策略和审计运维。后台项目位于：

```text
/Users/wfu/Documents/works/xiaoxi/code/navmesh/navmesh-go
```

后端定位不是传统主机监控系统，而是类似 frp/ngrok/Cloudflare Tunnel 的远程接入控制面：设备侧主动连接中心，用户通过统一 SSH/HTTP 入口访问内网设备和设备本地服务。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端框架 | Angular 21 |
| UI 组件 | ng-zorro-antd、ng-alain、@delon |
| 图表 | ECharts、@delon/chart |
| 权限认证 | @delon/auth |
| 样式 | Less |
| 后端 API | NavMesh Go REST API，默认前缀 `/api` |

## 本地开发

```bash
npm install
npm start
```

常用脚本：

```bash
npm run build
npm run lint
npm run test
```

当前前端代理配置在 `proxy.conf.js`：

```text
/api -> http://127.0.0.1:3006/api/
```

后端 README 规划的默认管理 API 地址是 `http://127.0.0.1:3007`。联调前需要统一端口：要么调整 `proxy.conf.js` 到 `3007`，要么以后端实际启动端口为准。

## 产品定位

管理端的核心目标是把“设备远程接入”变成可配置、可观察、可审计的控制台：

- 设备接入：查看设备注册、在线状态、心跳、Token 和设备类型默认映射。
- SSH 接入：管理 SSH 入口 IP、设备别名和域名绑定。
- HTTP 映射：管理外部域名到设备本地服务端口的映射。
- 隧道状态：查看设备长连接、活跃会话、流量和断开原因。
- 访问控制：配置设备、分组、映射的 SSH/HTTP 访问策略。
- 审计追踪：查询登录、配置变更、会话和 HTTP 访问日志。
- 系统配置：维护公网域名、网关监听、默认端口、保留策略等运行配置。

## 页面菜单规划

第一版建议围绕 NavMesh 后端已经具备或规划清晰的 API 设计菜单，避免继续沿用“探针管理 / 主机监控 / 安全巡检”等 Aegis 监控语义。

| 一级菜单 | 二级页面 | 推荐路由 | 后端接口 | 说明 |
| --- | --- | --- | --- | --- |
| 工作台 | 接入总览 | `/dashboard` | 多接口聚合 | 展示在线设备、活跃隧道、SSH/HTTP 会话、近 24 小时事件和失败连接 |
| 设备管理 | 设备列表 | `/devices/list` | `GET /api/devices/list` | 设备基础信息、在线状态、别名、类型、来源 IP、最近心跳 |
| 设备管理 | 设备详情 | `/devices/:guid` | `GET /api/devices/:guid` | 设备资料、Token、SSH 别名、HTTP 映射、会话、事件 |
| 设备管理 | 设备 Token | `/devices/tokens` | `GET /api/devices/:guid`、`DELETE /api/devices/:guid/tokens/:tokenGuid` | Token 启停、轮换、过期时间 |
| 设备管理 | 设备类型默认值 | `/devices/type-defaults` | `GET /api/devices/types/defaults` | 展示不同设备类型的默认 Web 端口和映射域 |
| SSH 接入 | SSH 入口地址 | `/ssh/entrypoints` | `GET /api/ssh-entrypoints/list`、`POST /api/ssh-entrypoints` | 管理 IPv4/IPv6 入口 IP 池及绑定状态 |
| SSH 接入 | SSH 别名 | `/ssh/aliases` | `GET /api/ssh-aliases/list`、`POST /api/ssh-aliases`、`DELETE /api/ssh-aliases/:id` | 管理 `test01.navfirst.com -> 入口 IP -> 设备` 的绑定 |
| HTTP 映射 | 映射列表 | `/mappings/list` | `GET /api/port-mappings/list` | 管理外部 Host 到设备本地 `host:port` 的映射 |
| HTTP 映射 | 新建/编辑映射 | `/mappings/edit/:guid` | `POST /api/port-mappings` | 配置设备、目标端口、协议、系统域名或自定义域名 |
| HTTP 映射 | 访问日志 | `/mappings/access-logs` | `GET /api/http-access-logs/list` | 查询 Host、路径、状态码、耗时、流量和错误信息 |
| 隧道会话 | 在线连接 | `/tunnels/connections` | `GET /api/tunnel/connections` | 查看设备侧长连接、协议、远端地址和最后活动时间 |
| 隧道会话 | 会话记录 | `/sessions/list` | `GET /api/tunnel-sessions/list` | SSH/HTTP 会话查询，展示来源 IP、目标设备、流量、结果 |
| 事件中心 | 事件列表 | `/events/list` | 后端规划 `/api/events/*` | 设备离线、连接失败、认证失败、映射失败等事件 |
| 权限策略 | 访问策略 | `/policies/list` | `GET /api/access-policies/list`、`POST /api/access-policies`、`DELETE /api/access-policies/:guid` | 控制设备或分组是否允许 SSH/HTTP 访问 |
| 审计日志 | 操作审计 | `/audit/logs` | `GET /api/audit-logs/list` | 登录、密码修改、配置保存、禁用资源等管理操作 |
| 系统设置 | 基础配置 | `/settings/system` | `GET /api/settings/list`、`PUT /api/settings/:key` | 主域名、SSH 域名、HTTP 映射域、网关监听等 |
| 系统设置 | 数据保留 | `/settings/retention` | `POST /api/maintenance/retention-cleanup`、`GET /api/settings/list` | 会话、HTTP 日志、审计日志保留天数和手动清理 |
| 系统设置 | 账号安全 | `/settings/account` | `GET /api/navmesh-auth/profile`、`PUT /api/navmesh-auth/password` | 当前管理员资料和密码修改 |

### 推荐菜单结构

```text
工作台
设备管理
  设备列表
  设备 Token
  设备类型默认值
SSH 接入
  SSH 入口地址
  SSH 别名
HTTP 映射
  映射列表
  访问日志
隧道会话
  在线连接
  会话记录
事件中心
  事件列表
权限策略
  访问策略
审计日志
  操作审计
系统设置
  基础配置
  数据保留
  账号安全
```

## 当前前端状态

现有代码已经具备 ng-alain 基础布局、登录页、工作台和若干列表页雏形，但命名还偏 Aegis 监控产品：

| 当前模块 | 当前路由 | 建议处理 |
| --- | --- | --- |
| 探针管理 | `/agents/*` | 重命名为设备管理 `/devices/*`，对接 `/api/devices/*` |
| 主机监控 | `/metrics/*` | 第一版可降级为工作台统计，后续如有指标 API 再恢复 |
| 服务探测 | `/probes/*` | 不属于 NavMesh 第一版核心，可移到后续扩展 |
| 事件告警 | `/events/*` | 保留，改名事件中心，承接连接和设备事件 |
| 安全巡检 | `/security/*` | 第一版改为权限策略 `/policies/*` |
| 系统设置 | `/settings/*` | 保留，补充 NavMesh 网关配置和账号安全 |
| 主机资产 | `/assets/*` | 不属于远程接入第一版核心，可暂时隐藏 |

## API 对齐清单

后端当前路由分组主要包括：

| API 分组 | 前端页面 |
| --- | --- |
| `/api/navmesh-auth/login` | 登录 |
| `/api/navmesh-auth/profile` | 账号资料 |
| `/api/navmesh-auth/password` | 修改密码 |
| `/api/device/register` | 设备侧注册，不直接作为管理菜单 |
| `/api/device/heartbeat` | 设备侧心跳，不直接作为管理菜单 |
| `/api/devices/list` | 设备列表 |
| `/api/devices/types/defaults` | 设备类型默认值 |
| `/api/devices/:guid` | 设备详情 |
| `/api/ssh-entrypoints/list` | SSH 入口地址 |
| `/api/ssh-aliases/list` | SSH 别名 |
| `/api/port-mappings/list` | HTTP 映射列表 |
| `/api/http-access-logs/list` | HTTP 访问日志 |
| `/api/tunnel/connections` | 在线连接 |
| `/api/tunnel-sessions/list` | 会话记录 |
| `/api/access-policies/list` | 访问策略 |
| `/api/audit-logs/list` | 操作审计 |
| `/api/settings/list` | 系统配置 |
| `/api/maintenance/retention-cleanup` | 数据清理 |

## 实施顺序建议

1. 菜单和路由重命名：把前端信息架构先从 Aegis 监控台调整为 NavMesh 远程接入控制台。
2. 登录联调：确认 `/api/navmesh-auth/login` 返回结构与 @delon/auth 存储字段。
3. 设备管理：优先完成设备列表、详情、Token 禁用和设备类型默认值。
4. SSH 接入：完成入口地址池和 SSH 别名绑定页面。
5. HTTP 映射：完成映射列表、新建编辑和访问日志。
6. 隧道会话：接入在线连接和会话记录，只读展示即可形成运维闭环。
7. 权限与审计：补齐访问策略、操作审计和账号安全。
8. 工作台聚合：在各模块数据稳定后补总览卡片和趋势图。

## 命名建议

- 产品名统一为 `NavMesh`。
- “探针”统一改为“设备”或“边缘设备”。
- “端口映射”在菜单里使用“HTTP 映射”，在表单字段里保留“本地目标端口”。
- “隧道连接”表示设备到中心的长连接；“会话”表示用户 SSH/HTTP 访问产生的一次连接记录。
- “事件”用于设备离线、连接失败、认证失败等运行状态；“审计”用于管理员操作。
