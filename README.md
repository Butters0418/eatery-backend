# 餐飲點餐系統 API 說明文件

## 📋 專案概述

這是一個餐飲點餐系統後端 API，支援內用與外帶點餐、即時通知、訂單管理等功能。系統分為三種角色：**顧客**、**店員(Staff)**、**管理員(Admin)**，每個角色具有不同的權限與功能。

## 🏗 技術架構

- **後端框架**: Node.js + Express + TypeScript
- **資料庫**: MongoDB + Mongoose
- **即時通訊**: WebSocket
- **檔案上傳**: Firebase Storage
- **認證機制**: JWT Token
- **資料驗證**: Joi
- **密碼加密**: bcryptjs

## 🔐 認證機制

### Token 類型

- **JWT Token**: 用於 Admin/Staff 身份驗證
- **Table Token**: 用於顧客內用點餐驗證

### 權限層級

1. **無認證**: 顧客瀏覽商品、使用 Table Token 點餐
2. **Staff**: 店員操作訂單、管理出餐狀態
3. **Admin**: 管理員擁有所有權限，可管理商品、使用者、桌位

## 👥 使用者角色與功能

### 🛍 顧客 (Customer)

#### 核心流程

1. **掃描 QR Code** → 取得桌號 Token
2. **瀏覽商品** → 查看菜單與商品詳情
3. **加入購物車** → 選擇商品與加料
4. **確認點餐** → 送出訂單
5. **追蹤訂單** → 查看點餐明細

#### 主要功能

- ✅ 掃描桌號 QR Code 取得 Table Token
- ✅ 瀏覽所有上架商品（無需登入）
- ✅ 查看商品詳細資訊與加料選項
- ✅ 內用點餐（需 Table Token 驗證）
- ✅ 加點功能（同桌追加餐點）
- ✅ 查看目前桌號的訂單狀態

---

### 👨‍💼 店員 (Staff)

#### 核心流程

1. **登入系統** → 使用帳號密碼登入
2. **接收訂單** → 即時收到新訂單通知
3. **管理出餐** → 標記餐點出餐狀態
4. **處理結帳** → 標記訂單結帳狀態
5. **重置桌位** → 完成訂單後重置桌位

#### 主要功能

- ✅ 帳號登入/登出
- ✅ 查看所有進行中訂單
- ✅ 新增外帶訂單
- ✅ 編輯未出餐的訂單項目
- ✅ 刪除未出餐的訂單項目
- ✅ 標記餐點出餐狀態
- ✅ 處理訂單結帳
- ✅ 完成訂單並重置桌位
- ✅ 即時接收 WebSocket 通知

---

### 👑 管理員 (Admin)

#### 核心流程

1. **系統登入** → 使用管理員帳號登入
2. **商品管理** → 新增/編輯/刪除商品
3. **員工管理** → 新增/編輯店員帳號
4. **桌位管理** → 管理桌位資訊
5. **訂單管理** → 查看所有訂單記錄
6. **密碼重置** → 忘記密碼功能

#### 主要功能

- ✅ 管理員登入/忘記密碼/密碼重置
- ✅ 含 staff 所有點餐、訂單管理功能
- ✅ 商品管理 (CRUD + 上架狀態 + 圖片上傳功能)
- ✅ 店員帳號管理 (新增/編輯/刪除/解鎖)
- ✅ Admin 帳號管理 (修改密碼)
- ✅ 桌位管理 (新增/刪除)
- ✅ 收發 WebSocket 通知

## 📡 API 端點總覽

### 🔐 認證相關 (User)

```
POST   /api/login                    # 使用者登入
GET    /api/me                       # 取得目前使用者資訊



# Admin 專用
GET    /api/users                    # 取得所有使用者
POST   /api/users                    # 新增店員帳號
PATCH  /api/users/:id/unlock         # 解鎖員工帳號
PATCH  /api/users/:id                # 更新店員資訊
DELETE /api/users/:id                # 刪除店員帳號
POST   /api/verify-reset-code        # 驗證重設密碼驗證碼
POST   /api/resend-verification-code # 重發驗證碼
POST   /api/reset-password           # 重設密碼
PUT    /api/change-password          # 已登錄修改密碼
```

### 🍔 商品管理 (Product)

```
GET    /api/products                 # 取得商品列表
GET    /api/products/:id             # 取得單一商品詳情

# Admin 專用
POST   /api/products                 # 新增商品
PATCH  /api/products/:id             # 更新商品
DELETE /api/products/:id             # 刪除商品
PATCH  /api/products/:id/popular     # 更新熱門狀態
PATCH  /api/products/:id/available   # 更新上架狀態
```

### 🏪 桌位管理 (Table)

```
GET    /api/table/qr-token           # 取得桌號 Token (顧客用)

# Staff/Admin 專用
GET    /api/tables                   # 取得所有桌位
GET    /api/tables/:id               # 取得單一桌位

# Admin 專用
POST   /api/tables                   # 新增桌位
DELETE /api/tables/:id               # 刪除桌位
```

### 📋 訂單管理 (Order)

```
GET    /api/orders                                  # 取得訂單列表 (支援多種篩選)
POST   /api/orders                                  # 建立訂單 (內用/外帶)

# Staff/Admin 專用
GET    /api/orders/:id                              # 取得單一訂單詳情
PATCH  /api/orders/:id/item/:itemCode               # 編輯訂單項目
PATCH  /api/orders/:id/item/:itemCode/delete        # 刪除訂單項目
PATCH  /api/orders/:id/item/:itemCode/served        # 標記出餐狀態
PATCH  /api/orders/:id/paid                         # 標記結帳狀態
PATCH  /api/orders/:id/complete                     # 完成訂單
PATCH  /api/orders/:id/delete                       # 軟刪除訂單
```

### 📤 檔案上傳 (Upload)

```
# Admin 專用
POST   /api/upload/image             # 圖片上傳
```

## 🔄 業務流程圖

### 內用點餐流程

```
顧客掃描 QR Code
    ↓
取得 Table Token
    ↓
瀏覽商品並加入購物車
    ↓
確認點餐 (附帶 Table ID 與 Token)
    ↓
系統驗證 Token 並建立訂單
    ↓
WebSocket 通知所有 Staff & Admin
    ↓
Staff 標記出餐狀態
    ↓
全部出餐後可結帳
    ↓
結帳完成後為桌位整理中
    ↓
點選訂單完成，重整桌位與 token
    ↓
訂單完成
```

### 外帶點餐流程

```
Staff 登入系統
    ↓
選擇商品建立外帶訂單預設已結帳
    ↓
WebSocket 通知其他 Staff & Admin
    ↓
製作完成後標記出餐
    ↓
顧客取餐後點完成訂單
    ↓
訂單完成
```

### 加點流程

```
同桌顧客再次點餐
    ↓
系統檢查桌位是否有進行中訂單
    ↓
有訂單且未結帳 → 執行加點
    ↓
更新原訂單項目清單
    ↓
WebSocket 通知 Staff 有新加點
```

## ⚠️ 重要注意事項

### 權限控制

- 顧客只能操作自己桌號的訂單
- Staff 可操作所有訂單但不能管理商品
- Admin 擁有完整權限

### 狀態限制

- 已出餐的餐點不能編輯或刪除
- 內用已結帳的訂單不能刪除
- 內用訂單需全部出餐才能結帳
- 外帶訂單成立時預設已結帳

### 安全機制

- JWT Token 7 天有效期
- 密碼錯誤 3 次鎖定帳號
- Admin 忘記密碼有驗證碼機制
- Table Token 動態產生，每次內用清空桌位會重新生成

### 檔案上傳

- 支援 JPG, PNG 格式
- 檔案大小限制 2MB
- 使用 Firebase Storage 存儲

## 🚀 快速開始

### 環境變數設定

```bash
# .env
MONGO_URI=mongodb://localhost:27017/eatery
JWT_SECRET=your-secret-key
FIREBASE_STORAGE_BUCKET=your-bucket-name
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASS=your-app-password
PORT=3000
```

### 啟動專案

```bash
# 安裝套件
npm install

# 開發模式
npm run dev

# 生產模式
npm run build
npm start
```

### 後台預設 Admin 帳號

```
帳號: butters.test.demo@gmail.com
密碼: 1234567
```

### 後台預設 Staff 帳號

```
帳號: staff001
密碼: 1234567

帳號: staff002
密碼: 1234567
```
