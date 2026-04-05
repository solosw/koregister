# 临时邮箱 API 使用文档

> 面向外部调用方，基于当前后端实现整理。
>
> 路由来源：`cmd/server/main.go:55-64`

---

## 1. 基础说明

- **Base URL**：`http://<你的域名或IP>:<端口>/api`
- **数据格式**：
  - 请求：`application/json`（仅 POST/PATCH/DELETE 需要时）
  - 响应：`application/json`
- **鉴权**：当前接口默认**无鉴权**（`access_token` 已返回但暂未用于校验）
- **分页默认值**：`page=1`，`limit=20`（见 `internal/handlers/mailbox_handler.go:148-149`）

---

## 2. 统一响应格式

响应结构定义：`internal/common/result.go:3-8`

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {}
}
```

### 字段说明

- `code`：业务状态码（不是 HTTP 状态码）
- `success`：是否成功
- `message`：错误或提示信息
- `data`：实际数据

> 注意：当前实现很多错误场景依然返回 HTTP 200，但 `success=false` 且 `code` 为 4xx/5xx（见 `internal/handlers/mailbox_handler.go` 各处理函数）。

---

## 3. 接口总览

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 邮箱管理 | POST | `/mailbox/create` | 创建临时邮箱 |
| 邮箱管理 | GET | `/mailbox/:address` | 查询邮箱信息 |
| 邮箱管理 | DELETE | `/mailbox/:address` | 删除邮箱 |
| 邮箱管理 | GET | `/mailbox/domains` | 获取可用域名 |
| 邮件查询 | GET | `/emails/:address` | 查询邮件列表（分页） |
| 邮件查询 | GET | `/emails/:address/latest` | 查询指定邮箱最新一封邮件 |
| 邮件查询 | GET | `/email/:id` | 查询邮件详情 |
| 邮件查询 | DELETE | `/email/:id` | 删除邮件 |
| 邮件查询 | PATCH | `/email/:id/read` | 标记邮件已读 |

路由注册位置：`cmd/server/main.go:55-64`

---

## 4. 接口详情

## 4.1 创建临时邮箱

- **URL**：`POST /api/mailbox/create`
- **代码位置**：
  - 请求结构体：`internal/handlers/mailbox_handler.go:24-28`
  - 处理函数：`internal/handlers/mailbox_handler.go:38-56`

### 请求体

```json
{
  "domain": "example.com",
  "local_part": "myname",
  "expire_hours": 2
}
```

### 参数说明

- `domain`：邮箱域名（可选，空时使用默认域名）
- `local_part`：邮箱前缀（可选，空时后端随机生成）
- `expire_hours`：过期小时数（可选，<=0 使用默认值，超过上限会被截断）

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {
    "address": "myname@example.com",
    "expire_at": "2026-03-09T12:00:00+08:00",
    "access_token": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

### 失败响应示例

```json
{
  "code": 500,
  "success": false,
  "message": "invalid domain",
  "data": null
}
```

### cURL

```bash
curl -X POST "http://localhost:8080/api/mailbox/create" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","local_part":"myname","expire_hours":2}'
```

---

## 4.2 获取可用域名

- **URL**：`GET /api/mailbox/domains`
- **代码位置**：`internal/handlers/mailbox_handler.go:126-129`

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": ["example.com", "temp.example.com"]
}
```

### cURL

```bash
curl "http://localhost:8080/api/mailbox/domains"
```

---

## 4.3 获取邮箱信息

- **URL**：`GET /api/mailbox/:address`
- **代码位置**：`internal/handlers/mailbox_handler.go:65-83`

### 路径参数

- `address`：完整邮箱地址（需 URL 编码）

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {
    "address": "myname@example.com",
    "expire_at": "2026-03-09T12:00:00+08:00",
    "is_active": true,
    "created_at": "2026-03-09T10:00:00+08:00"
  }
}
```

### cURL

```bash
curl "http://localhost:8080/api/mailbox/myname%40example.com"
```

---

## 4.4 删除邮箱

- **URL**：`DELETE /api/mailbox/:address`
- **代码位置**：`internal/handlers/mailbox_handler.go:92-109`

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": true
}
```

### cURL

```bash
curl -X DELETE "http://localhost:8080/api/mailbox/myname%40example.com"
```

---

## 4.5 查询邮件列表（分页）

- **URL**：`GET /api/emails/:address?page=1&limit=20`
- **代码位置**：`internal/handlers/mailbox_handler.go:140-163`

### 路径参数

- `address`：完整邮箱地址（需 URL 编码）

### Query 参数

- `page`：页码（可选，默认 1）
- `limit`：每页数量（可选，默认 20）

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {
    "emails": [
      {
        "id": 1,
        "mailbox_id": 10,
        "message_id": "<abc@example.com>",
        "from": "sender@example.org",
        "to": "myname@example.com",
        "subject": "验证码",
        "text_body": "Your code is 123456",
        "html_body": "<p>Your code is <b>123456</b></p>",
        "attachments": "",
        "size": 1024,
        "is_read": false,
        "received_at": "2026-03-09T10:30:00+08:00",
        "created_at": "2026-03-09T10:30:00+08:00"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### cURL

```bash
curl "http://localhost:8080/api/emails/myname%40example.com?page=1&limit=20"
```

---

## 4.6 查询指定邮箱最新一封邮件

- **URL**：`GET /api/emails/:address/latest`
- **代码位置**：`internal/handlers/mailbox_handler.go:166-189`

### 路径参数

- `address`：完整邮箱地址（需 URL 编码）

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {
    "id": 1,
    "mailbox_id": 10,
    "message_id": "<abc@example.com>",
    "from": "sender@example.org",
    "to": "myname@example.com",
    "subject": "验证码",
    "text_body": "Your code is 123456",
    "html_body": "<p>Your code is <b>123456</b></p>",
    "attachments": "",
    "size": 1024,
    "is_read": false,
    "received_at": "2026-03-09T10:30:00+08:00",
    "created_at": "2026-03-09T10:30:00+08:00"
  }
}
```

### 失败响应示例

```json
{
  "code": 404,
  "success": false,
  "message": "暂无邮件或邮箱不存在",
  "data": null
}
```

### cURL

```bash
curl "http://localhost:8080/api/emails/myname%40example.com/latest"
```

---

## 4.7 查询邮件详情

- **URL**：`GET /api/email/:id`
- **代码位置**：`internal/handlers/mailbox_handler.go:192-209`

### 路径参数

- `id`：邮件 ID（整数）

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": {
    "id": 1,
    "from": "sender@example.org",
    "to": "myname@example.com",
    "subject": "验证码",
    "text_body": "Your code is 123456",
    "html_body": "<p>Your code is <b>123456</b></p>",
    "is_read": false,
    "received_at": "2026-03-09T10:30:00+08:00"
  }
}
```

### cURL

```bash
curl "http://localhost:8080/api/email/1"
```

---

## 4.8 删除邮件

- **URL**：`DELETE /api/email/:id`
- **代码位置**：`internal/handlers/mailbox_handler.go:195-212`

### cURL

```bash
curl -X DELETE "http://localhost:8080/api/email/1"
```

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": true
}
```

---

## 4.9 标记邮件为已读

- **URL**：`PATCH /api/email/:id/read`
- **代码位置**：`internal/handlers/mailbox_handler.go:219-236`

### cURL

```bash
curl -X PATCH "http://localhost:8080/api/email/1/read"
```

### 成功响应示例

```json
{
  "code": 200,
  "success": true,
  "message": "",
  "data": true
}
```

---

## 5. 外部调用建议

1. **务必判断 `success` 字段**，不要只看 HTTP 状态码。
2. 路径参数 `address` 必须 URL 编码（`@` -> `%40`）。
3. 建议调用方统一封装错误处理：
   - `success=false` 时读取 `code` 与 `message`
4. 当前 `access_token` 未参与接口鉴权，如要对外开放公网，建议尽快加鉴权。

---

## 6. Postman 导入建议

可按以下目录组织：
- Mailbox
  - Create Mailbox
  - Get Mailbox
  - Delete Mailbox
  - Get Domains
- Email
  - Get Emails
  - Get Email Detail
  - Delete Email
  - Mark Email As Read

公共变量建议：
- `{{baseUrl}}`：如 `http://localhost:8080`
- `{{address}}`：如 `myname@example.com`
- `{{emailId}}`：如 `1`

---

## 7. 前端应用集成（Electron）

### 7.1 临时邮箱 API 集成

前端应用（Electron）通过 IPC 调用主进程暴露的 API：

#### 测试连接

```typescript
// 调用 testTempMailConnection
const result = await window.api.testTempMailConnection('http://localhost:8080')
// 返回: { success: true, domains: ['example.com', 'temp.example.com'] }
```

#### 创建临时邮箱

```typescript
const result = await window.api.createTempMailbox({
  serverUrl: 'http://localhost:8080',
  domain: 'example.com',       // 可选
  localPart: 'myname',          // 可选，空时随机生成
  expireHours: 2                 // 可选，默认 2 小时
})
// 返回: { success: true, data: { address, expireAt, accessToken } }
```

#### 获取验证码

```typescript
const result = await window.api.getTempMailVerificationCode({
  serverUrl: 'http://localhost:8080',
  email: 'myname@example.com',
  senderFilter: [                 // 可选，默认 AWS 相关发件人
    'no-reply@signin.aws',
    'no-reply@login.awsapps.com'
  ],
  timeout: 120,                  // 可选，默认 120 秒
  checkInterval: 5000            // 可选，默认 5000 毫秒
})
// 返回: { success: true, code: '123456' }
```

### 7.2 API 映射表

| 前端 API | 底层 HTTP 调用 | 说明 |
|---|---|---|
| `testTempMailConnection` | `GET /api/mailbox/domains` | 测试服务器连接 |
| `createTempMailbox` | `POST /api/mailbox/create` | 创建临时邮箱 |
| `getTempMailVerificationCode` | `GET /api/emails/:address/latest` (轮询) | 获取验证码 |

### 7.3 使用示例

```typescript
// 1. 测试服务器连接
const conn = await window.api.testTempMailConnection('http://localhost:8080')
if (!conn.success) {
  console.error('连接失败:', conn.error)
  return
}
console.log('可用域名:', conn.domains)

// 2. 创建临时邮箱
const mailbox = await window.api.createTempMailbox({
  serverUrl: 'http://localhost:8080',
  expireHours: 2
})
if (!mailbox.success) {
  console.error('创建失败:', mailbox.error)
  return
}
console.log('邮箱地址:', mailbox.data.address)

// 3. 获取验证码（轮询）
const code = await window.api.getTempMailVerificationCode({
  serverUrl: 'http://localhost:8080',
  email: mailbox.data.address,
  timeout: 120
})
if (code.success && code.code) {
  console.log('验证码:', code.code)
} else {
  console.error('获取失败:', code.error)
}
```

---

如需，下一步浮浮酱可以继续帮你生成：
1) 一份可直接导入的 Postman Collection（JSON）
2) 一份 OpenAPI 3.0 `openapi.yaml`（可用于 Swagger UI / SDK 自动生成）
