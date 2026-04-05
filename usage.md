# Kiro 账户管理器 - 使用说明

> 本文档详细介绍了 Kiro 账户管理器的安装、配置与使用方法喵～ ฅωฅ
>
> 应用版本：v1.2.9

---

## 目录

- [1. 简介](#1-简介)
- [2. 安装](#2-安装)
- [3. 核心概念](#3-核心概念)
- [4. 账号管理](#4-账号管理)
- [5. 临时邮箱注册](#5-临时邮箱注册)
- [6. 自动换号](#6-自动换号)
- [7. 机器码管理](#7-机器码管理)
- [8. 代理设置](#8-代理设置)
- [9. 批量导入导出](#9-批量导入导出)
- [10. 设置与主题](#10-设置与主题)
- [11. 快捷键](#11-快捷键)
- [12. 数据存储](#12-数据存储)
- [13. 常见问题](#13-常见问题)

---

## 1. 简介

Kiro 账户管理器是一款基于 Electron 构建的桌面应用，用于集中管理多个 Kiro 账号、监控用量、自动化注册及切换。以下是主要功能喵～：

| 功能 | 说明 |
|------|------|
| **多账号管理** | 支持同时管理数百个账号，分组、标签、筛选一应俱全 |
| **临时邮箱注册** | 内置临时邮箱 API 集成，支持自动创建邮箱、接收验证码 |
| **自动化注册** | 使用 Playwright 浏览器自动化，批量注册 Kiro 账号 |
| **自动换号** | 账号余额低于阈值时，自动切换到其他可用账号 |
| **机器码管理** | 支持修改/随机生成机器码，绑定机器码到指定账号 |
| **代理支持** | 支持 HTTP/HTTPS/SOCKS5 代理，可配用户名密码认证 |
| **Token 自动刷新** | 自动刷新即将过期的账号凭证 |
| **隐私模式** | 一键隐藏所有账号的敏感信息 |
| **主题定制** | 支持深色模式及多种主题色 |
| **跨平台** | 支持 Windows、macOS、Linux |

---

## 2. 安装

### 2.1 从源码构建

```bash
# 克隆仓库
git clone <仓库地址>
cd kiro-account-manager

# 安装依赖（推荐使用 pnpm）
pnpm install

# 安装 Chromium（用于自动化注册）
pnpm run install-browser

# 开发模式运行
pnpm dev

# 构建 Windows 安装包
pnpm run build:win

# 构建 macOS 安装包
pnpm run build:mac

# 构建 Linux 安装包
pnpm run build:linux
```

### 2.2 使用预编译版本

前往 [GitHub Releases](https://github.com/你的仓库/releases) 下载对应平台的安装包，双击安装即可喵～

### 2.3 前置要求

- **Node.js** v18 或更高
- **pnpm** 或 **npm** 包管理器
- **Chromium**（仅自动化注册功能需要，通过 `pnpm run install-browser` 安装）

---

## 3. 核心概念

### 3.1 账号结构

每个账号包含以下关键信息：

```typescript
interface Account {
  id: string              // 唯一标识符（UUID）
  email: string            // 邮箱地址
  nickname?: string        // 昵称
  idp: 'Google' | 'Github' | 'BuilderId' | 'AWSIdC' | 'Internal'  // 认证方式
  credentials: {
    accessToken: string   // 访问令牌
    refreshToken: string  // 刷新令牌（核心凭证）
    clientId?: string     // OAuth 客户端 ID
    clientSecret?: string  // OAuth 客户端密钥
    region?: string       // 区域（默认 us-east-1）
    authMethod?: string   // 认证方法
    expiresAt: number     // Token 过期时间戳
  }
  subscription: {
    type: 'Free' | 'Pro' | 'Pro_Plus' | 'Enterprise' | 'Teams'
    daysRemaining?: number
    expiresAt?: string
  }
  usage: {
    current: number        // 当前使用量
    limit: number          // 用量上限
    percentUsed: number    // 使用百分比
    bonuses?: BonusInfo[]  // 额外赠送额度
  }
  status: 'active' | 'expired' | 'error' | 'refreshing' | 'unknown'
  isActive: boolean        // 是否为当前激活账号
  groupId?: string         // 分组 ID
  tags: string[]           // 标签 ID 列表
}
```

### 3.2 账号状态

| 状态 | 含义 |
|------|------|
| `active` | 账号正常可用 |
| `expired` | Token 已过期，需要刷新 |
| `error` | 账号异常（如被封禁） |
| `refreshing` | 正在刷新 Token |
| `unknown` | 尚未检查状态 |

### 3.3 认证方式（IDP）

| IDP | 说明 | 适用场景 |
|-----|------|---------|
| `BuilderId` | Kiro 自有账号系统 | 默认方式 |
| `Google` | Google 账号登录 | Google 联合登录 |
| `Github` | GitHub 账号登录 | GitHub 联合登录 |
| `AWSIdC` | AWS Identity Center | 企业 SSO |
| `Internal` | 内部账号 | 特殊渠道 |

---

## 4. 账号管理

### 4.1 添加账号

有两种方式添加账号喵～

**方式一：单个添加**

1. 点击左侧菜单 **"账号管理"**
2. 点击右上角 **"添加账号"** 按钮
3. 填写邮箱、密码、刷新令牌等信息
4. 点击 **"保存"**

**方式二：批量导入**

支持从 JSON 文件批量导入账号，格式如下：

```json
[
  {
    "emailHint": "account-1@example.com",
    "refreshToken": "<paste full refresh token here>",
    "clientId": "<paste client id here>",
    "clientSecret": "<paste client secret here>",
    "region": "us-east-1",
    "authMethod": "IdC",
    "provider": "BuilderId"
  },
  {
    "refreshToken": "xxx",
    "provider": "Github"
  },
  {
    "refreshToken": "yyy",
    "provider": "Google"
  }
]
```

> **提示**：`provider` 字段会自动设置正确的 `authMethod`（`BuilderId` → `IdC`，`Github`/`Google` → `social`）。

### 4.2 切换账号

在账号列表中，点击目标账号卡片上的 **"激活"** 按钮，即可将该账号设为当前使用账号喵～

切换时会自动：
- 取消之前账号的激活状态
- 启动 Kiro 应用（如果已配置路径）
- 更新机器码（如果启用了自动切换）

### 4.3 分组与标签

**分组管理：**
- 创建分组：设置页面 → 分组 → 新建分组
- 将账号移入分组：选中账号 → 右键 → 移动到分组
- 支持按分组筛选账号

**标签管理：**
- 创建标签：设置页面 → 标签 → 新建标签（可自定义颜色）
- 为账号添加标签：选中账号 → 右键 → 添加标签
- 支持多标签筛选

### 4.4 筛选与排序

支持按以下条件筛选账号：
- 搜索关键词（邮箱/昵称）
- 订阅类型（Free / Pro / Pro_Plus / Enterprise / Teams）
- 账号状态（活跃 / 过期 / 异常）
- 认证方式（Google / GitHub / BuilderId）
- 用量范围
- 剩余天数范围
- 分组 / 标签

支持按以下字段排序：
- 邮箱、昵称、订阅类型、用量百分比、剩余天数、最后使用时间、创建时间、状态

### 4.5 Token 自动刷新

应用会在 Token 过期前 **5 分钟**自动刷新，无需手动操作喵～

可在 **设置 → 账号刷新** 中调整：
- **启用/禁用**自动刷新
- **刷新间隔**（默认 5 分钟）
- **刷新并发数**（默认 100）

---

## 5. 临时邮箱注册

### 5.1 概述

临时邮箱功能允许用户自动创建一次性邮箱地址并接收验证码，用于自动化注册 Kiro 账号喵～

需要搭配外部临时邮箱服务器使用，API 文档详见 [API使用文档.md](API使用文档.md)。

### 5.2 配置临时邮箱服务器

1. 进入 **设置 → Kiro 设置**
2. 找到 **"临时邮箱服务器"** 配置项
3. 填写服务器地址，例如：`http://localhost:8080`
4. 点击 **"测试连接"** 验证连接

### 5.3 自动化注册流程

自动化注册（Auto Register）功能使用 Playwright 浏览器自动化完成以下步骤：

```
1. 连接临时邮箱服务器
2. 创建临时邮箱（随机前缀 + 可选域名）
3. 使用临时邮箱注册 Kiro 账号
4. 轮询邮箱等待验证码邮件
5. 自动提取 6 位验证码
6. 完成账号激活
7. 保存账号凭证到本地
```

### 5.4 注册配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **并发数** | 同时注册的账号数量 | 3 |
| **跳过 Outlook 激活** | 跳过微软账号激活步骤 | false |
| **手动输入验证码** | 验证码需手动输入（非自动提取） | false |
| **无头模式** | 浏览器无窗口运行 | false |

### 5.5 验证码提取规则

应用会自动从邮件正文中识别 6 位数字验证码，支持以下模式：

```
- "Your code is 123456"
- "验证码：123456"
- "验证码: 123456"
- 纯数字 123456
```

支持的发件人过滤（默认 AWS 相关）：
- `no-reply@signin.aws`
- `no-reply@login.awsapps.com`
- `noreply@amazon.com`
- 等

### 5.6 查看注册日志

注册过程中的所有步骤都会实时输出到日志面板，包括：
- 临时邮箱创建结果
- 验证码邮件接收状态
- 验证码提取结果
- 注册成功/失败详情

---

## 6. 自动换号

### 6.1 功能说明

当当前激活账号的**剩余额度**低于设定阈值时，应用自动切换到下一个可用账号喵～

### 6.2 配置步骤

1. 进入 **设置 → 自动换号**
2. 启用 **"自动换号"** 开关
3. 设置 **额度阈值**（例如：设置为 100，当余额低于 100 时触发切换）
4. 设置 **检查间隔**（分钟）

### 6.3 切换逻辑

```
1. 检查当前激活账号的剩余额度（limit - current）
2. 如果 remaining <= 阈值：
   a. 从账号列表中查找下一个可用账号（排除当前账号和封禁账号）
   b. 激活该账号
   c. 更新 Kiro 应用的使用凭证
3. 如果没有可用账号，输出警告日志
```

### 6.4 注意事项

- 被封禁（`UnauthorizedException` / `AccountSuspendedException`）的账号会被自动跳过
- 切换后会自动启动 Kiro（如果已配置路径且 Kiro 未运行）
- 建议配合代理使用，避免同一 IP 频繁切换账号

---

## 7. 机器码管理

### 7.1 功能说明

Kiro 应用会检测机器码，机器码管理功能允许：
- 查看当前机器码
- 随机生成新机器码
- 将机器码绑定到特定账号
- 切换账号时自动更换机器码
- 备份和恢复原始机器码

### 7.2 配置步骤

1. 进入 **设置 → 机器码**
2. 可配置选项：
   - **切换账号时自动更换机器码**：开启后每次切换账号都会生成新机器码
   - **绑定机器码到账号**：开启后每个账号有专属机器码，切换时使用绑定码
   - **使用绑定的机器码**：否则随机生成
3. 点击 **"生成新机器码"** 手动刷新
4. 点击 **"恢复原始机器码"** 恢复备份

### 7.3 机器码历史

所有机器码变更操作都会记录在历史中，包括：
- 变更时间
- 操作类型（初始 / 手动 / 自动切换 / 恢复 / 绑定）
- 关联的账号（如果是绑定或切换操作）

---

## 8. 代理设置

### 8.1 功能说明

支持通过代理服务器访问 Kiro API，适用于：
- 避免 IP 封禁
- 多账号隔离（每个账号使用不同代理）
- 特定地区访问

### 8.2 支持的协议

- HTTP
- HTTPS
- SOCKS5

### 8.3 代理格式

支持多种代理格式喵～：

```
# 标准格式
http://host:port
https://host:port
socks5://host:port

# 带认证
http://user:password@host:port
socks5://user:password@host:port

# 简写格式（自动识别协议）
host:port
host:port:username:password
```

### 8.4 测试代理

配置代理后，点击 **"测试连接"** 验证：
- 代理是否可达
- 当前出口 IP
- 延迟

---

## 9. 批量导入导出

### 9.1 导出账号

1. 进入 **账号管理** 页面
2. 选中要导出的账号（或全选）
3. 点击 **"导出"** 按钮
4. 选择导出格式（JSON）
5. 保存文件

导出的 JSON 包含账号完整信息及分组、标签数据喵～

### 9.2 导入账号

**方式一：导入 JSON 导出文件**
- 点击 **"导入"** → 选择 JSON 文件
- 自动识别并导入账号、分组、标签

**方式二：导入 OIDC 凭证**

支持从 `credentials-template.json` 格式导入，支持三种类型：

```json
[
  {
    "provider": "BuilderId",
    "refreshToken": "xxx",
    "clientId": "xxx",
    "clientSecret": "xxx"
  },
  {
    "provider": "Github",
    "refreshToken": "yyy"
  },
  {
    "provider": "Google",
    "refreshToken": "zzz"
  }
]
```

> **注意**：导入时自动去重（通过 email 或 userId 判断），已存在的账号会被跳过。

### 9.3 批量导入并发数

可在 **设置 → 高级** 中调整批量导入的并发数（默认 100）。

---

## 10. 设置与主题

### 10.1 主题设置

进入 **设置 → 主题**，支持：

**深色模式：**
- 跟随系统
- 强制开启
- 强制关闭

**主题色：**
| 主题 | 色系 |
|------|------|
| 默认 | 蓝色 |
| 紫色 | Purple |
| 翠绿 | Emerald |
| 橙色 | Orange |
| 玫瑰 | Rose |
| 青色 | Cyan |
| 琥珀 | Amber |

### 10.2 隐私模式

开启隐私模式后，所有账号的敏感信息会被遮蔽喵～：
- 邮箱：`user12345@***.com`
- 昵称：`用户12345`
- Token 信息完全隐藏

### 10.3 其他设置

| 设置项 | 说明 |
|--------|------|
| **自动启动 Kiro** | 切换账号后自动启动 Kiro 应用 |
| **Kiro 路径** | Kiro 可执行文件路径 |
| **Kiro 服务器** | 无限续杯服务器地址及密码 |
| **检查更新** | 自动检查应用更新 |

---

## 11. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + A` | 全选所有账号 |
| `Ctrl + I` | 导入账号 |
| `Ctrl + E` | 导出选中账号 |
| `Delete` | 删除选中的账号 |
| `F5` | 刷新当前账号状态 |
| `Ctrl + F` | 聚焦搜索框 |
| `Escape` | 取消选择 / 关闭弹窗 |

---

## 12. 数据存储

### 12.1 存储位置

应用数据存储在用户数据目录下喵～：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%/kiro-account-manager/` |
| macOS | `~/Library/Application Support/kiro-account-manager/` |
| Linux | `~/.config/kiro-account-manager/` |

### 12.2 存储文件

| 文件 | 内容 |
|------|------|
| `accounts.json` | 账号、分组、标签数据 |
| `auto-register.json` | 自动化注册配置及状态 |
| `machine-id-history.json` | 机器码变更历史 |

### 12.3 备份建议

建议定期备份 `accounts.json` 文件，以防止数据丢失喵～

---

## 13. 常见问题

### Q1: 批量注册时验证码获取失败怎么办？

**A:** 尝试以下方法喵～
- 延长验证码获取超时时间（默认 120 秒）
- 切换到手动输入验证码模式
- 检查临时邮箱服务器是否正常运行
- 确认发件人过滤列表是否包含目标发件人

### Q2: 账号显示"error"状态是什么情况？

**A:** 常见原因包括喵～
- Token 已过期（会自动刷新）
- 账号被封禁（`UnauthorizedException` / `AccountSuspendedException`）
- 网络连接问题
- Kiro API 服务不可用

### Q3: 机器码修改需要管理员权限？

**A:** 是的，修改机器码需要管理员权限喵～。Windows 上应用会自动请求管理员权限，macOS 上需要输入 sudo 密码。

### Q4: 代理测试显示成功但实际不生效？

**A:** 请检查喵～
- 代理格式是否正确
- 代理是否支持目标协议（HTTPS）
- 是否需要认证信息
- 尝试重启应用

### Q5: 如何彻底删除一个账号？

**A:** 在账号列表中选中目标账号，点击 **"删除"** 按钮喵～。支持批量删除。删除后账号数据会从 `accounts.json` 中移除。

### Q6: 自动换号不生效？

**A:** 请检查喵～
- 自动换号开关是否已开启
- 阈值设置是否合理
- 是否有其他可用账号（余额充足且未被封禁）
- 检查间隔是否太长

### Q7: 应用无法检查更新？

**A:** 请检查喵～
- 网络连接是否正常
- 防火墙是否阻止了更新服务器
- 尝试手动下载最新版本

---

## 附录：命令行参数

```bash
# 开发模式
pnpm dev

# 生产预览
pnpm start

# 类型检查
pnpm run typecheck

# 代码格式化
pnpm run format

# 代码检查
pnpm run lint

# 构建（所有平台）
pnpm run build

# 构建 unpacked（解压版）
pnpm run build:unpack
```

---

*本文档最后更新于 2026-04-05 | 应用版本 v1.2.9* ヽ(✿ﾟ▽ﾟ)ノ
