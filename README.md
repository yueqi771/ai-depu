# AI德州扑克游戏

基于Phaser3和TypeScript开发的德州扑克游戏，实现了PRD文档中的MVP阶段功能。

## 功能特性

### 已实现功能
- ✅ 用户系统（游客登录、用户信息管理）
- ✅ 游戏大厅（游戏模式选择、快速开始）
- ✅ 基础游戏场景（6人桌布局、玩家座位、公共牌区域）
- ✅ 资源预加载（图片、音效、图集）
- ✅ 响应式UI设计
- ✅ 本地数据存储

### 待开发功能
- 🚧 完整游戏逻辑（发牌、下注、比牌）
- 🚧 实时对战系统
- 🚧 社交功能（好友、聊天）
- 🚧 赛事系统
- 🚧 商城系统
- 🚧 反作弊系统

## 技术栈

- **游戏引擎**: Phaser 3.90.0
- **开发语言**: TypeScript (严格模式，禁用any)
- **构建工具**: Vite
- **代码规范**: 严格的TypeScript配置

## 项目结构

```
ai-depu3-cursor/
├── ai-texas-holdem/
│   ├── resources/         # 游戏资源文件
│   │   ├── audio/        # 音效文件
│   │   ├── *.png         # 图片资源
│   │   └── *.plist       # 图集配置
│   └── doc/              # 文档
├── src/
│   ├── config/           # 游戏配置
│   ├── scenes/           # 游戏场景
│   ├── services/         # 服务层
│   ├── types/            # TypeScript类型定义
│   └── main.ts           # 入口文件
├── index.html            # HTML入口
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript配置
└── vite.config.ts        # Vite配置
```

## 运行说明

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
npm run dev
```

游戏将在 http://localhost:3000 自动打开

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 游戏流程

1. **启动画面** - 显示游戏Logo和加载进度
2. **登录界面** - 支持游客登录、手机号登录（开发中）、第三方登录（开发中）
3. **游戏大厅** - 选择游戏模式：
   - 常规局：经典德州扑克
   - 快速局：节奏更快
   - 锦标赛：赢取大奖
   - 私人房：与好友对战
4. **游戏场景** - 6人桌德州扑克游戏

## 开发指南

### 添加新场景

1. 在 `src/scenes/` 创建新场景类
2. 在 `src/config/GameConfig.ts` 添加场景键值
3. 在 `src/main.ts` 注册场景

### 添加新资源

1. 将资源文件放入 `ai-texas-holdem/resources/`
2. 在 `PreloadScene.ts` 中添加加载逻辑

### TypeScript规范

- 所有变量必须有明确类型
- 禁止使用 `any` 类型
- 启用严格的null检查
- 未使用的变量和参数会报错

## 注意事项

1. 游戏使用本地存储保存用户数据
2. 音效文件支持多种格式以兼容不同浏览器
3. 游戏画面自适应不同屏幕尺寸
4. 使用1920x1080作为设计分辨率

## 许可证

本项目仅供学习交流使用。 