# Easy Game — 简易 FPS 射击游戏

[![CI](https://github.com/LYouC/easy_web_fps/actions/workflows/ci.yml/badge.svg)](https://github.com/LYouC/easy_web_fps/actions/workflows/ci.yml)

一款基于 Three.js 的波次制第一人称射击游戏，使用 TypeScript + Vite 构建。

**在线游玩：[GitHub Pages](https://lyouc.github.io/easy_web_fps/)**（建议使用桌面浏览器，点击开始后锁定鼠标）。

## 游戏内容

- **武器系统**：科幻风格步枪（30 发弹匣 / 90 备弹），支持开镜瞄准（右键）、后坐力、换弹动画、抛壳效果；战术匕首（2 号位），近战挥砍
- **角色模型**：积木人风格主角，第一人称低头可见身体和双腿，带行走动画和完整阴影
- **敌人类型**：绿色步兵、红色厚甲重装、黄色贝雷帽精英，拥有不同的身形与装备，波次递增
- **AI 行为**：追逐、保持射程、侧向走位、寻找掩体、记忆玩家最后位置
- **弹药补给**：地图随机刷新弹药箱 + 击杀敌人概率掉落
- **场景**：工业加工厂风格竞技场，含建筑掩体、工厂设施、远景山丘与海岸，以及带碰撞的外围围墙
- **难度选择**：简单 / 普通 / 困难，影响敌人数量、血量、伤害、射速、补给频率
- **HUD**：准星、血条、弹药、分数、波次、雷达小地图
- **操作**：WASD 移动、Shift 冲刺、空格跳跃、左键射击、右键开镜、R 换弹、1/2/Q 切换武器、ESC 暂停

## 快速开始

### 环境要求

- Node.js 22+
- npm

### 安装与启动

```bash
npm install
npm run dev
```

浏览器打开 Vite 显示的地址（默认 `http://localhost:5173`），点击画面锁定鼠标即可开始游戏。

### 构建生产版本

```bash
npm run build
npm run preview
```

### 质量检查

```bash
npm test
```

GitHub Actions 会在提交到 `main`、面向 `main` 的 Pull Request 以及 `v*` 标签推送时，使用 Node.js 22 执行 `npm ci`、生产构建和 P4–P8 全部烟雾测试。通过后保存 `web-dist` 构建产物，保留 30 天，可在 Actions 运行详情中下载。

## 发布版本

当前版本为 `v1.0.1`：在已有完整战斗玩法基础上优化积木人物模型、增加竞技场外围围墙，并加入自动打包与 GitHub Pages 发布。

推送 `v*` 标签后，CI 使用同一份通过验证的构建：

- 创建 [GitHub Release](https://github.com/LYouC/easy_web_fps/releases)，附带 `easy-web-fps-<tag>.zip`；重新运行任务会更新同名附件。
- 部署到 [GitHub Pages](https://lyouc.github.io/easy_web_fps/)，无需额外服务器。普通 `main` 提交只构建和测试，不覆盖在线版本。
- 如需手动部署 `main`，在 Actions → CI → Run workflow 中选择 `main`。

仓库 Settings → Pages 的 Source 使用 **GitHub Actions**。首次配置仓库或迁移到其他仓库时，需要管理员启用该设置，并确保 `github-pages` 环境允许发布标签部署。

Vite 使用相对资源路径，构建包可用于仓库子路径或其他静态托管。下载的 ZIP 解压后通过 HTTP 静态服务器访问，不要直接双击 `index.html`；游戏不依赖后端。角色开发预览页位于 `scripts/character-preview.html`，仅供本地 Vite 开发预览，不包含在生产包中。

## 技术栈

| 项目 | 技术 |
|------|------|
| 语言 | TypeScript（strict） |
| 构建 | Vite |
| 3D 渲染 | Three.js |
| 物理 | 自实现 AABB 碰撞 + 重力 |
| 架构 | EventBus 模块解耦 |

## 项目结构

```
src/
├── core/        # 引擎、事件总线、输入管理
├── scene/       # 场景管理
├── player/      # 玩家、FPS 相机、移动
├── weapons/     # 武器模型、动画、抛壳
├── combat/      # 射线检测、伤害、掩体
├── enemies/     # 敌人 AI、波次管理
├── pickups/     # 弹药拾取
├── world/       # 地图构建、碰撞管理
├── ui/          # HUD、菜单界面
├── audio/       # 音效、环境音
└── config/      # 游戏配置、难度配置
```

## 胡思乱想

如果放在2023年以前，为了做出它，我需要了解很多技术知识，脑海里面构建游戏的整个玩法，一行一行敲出（或者复制粘贴）所有代码，不断踩坑最终实现，这个过程或许需要超过一个月，但最终实现时必然是一件很值得开心和骄傲的事情。

但现在它完全使用AI-Coding而来的，初始版本只用了3个多小时，此前我从未接触过网页游戏开发，甚至连一行代码都没看过。

从一个创作者的角度来看，我自然可以更好的利用AI来实现我的想法。
但对于从事相关职业的人来说，AI是否会稀释掉大部分人的价值而突出少部分人的价值（资深技术人员，优秀的创意工作者）呢？是否会导致一个行业从原先20%的人获得奖励，到10%，5%，3%？
