# 鹈鹕出逃记 · Pelican Pedal Run

长嘴巴，小单车，还有一整座海岛

一个使用 **Three.js + HTML Canvas/WebGL** 制作的 3D 骑车闯关游戏，自动向前骑行，通过变道、跳跃和低头躲开障碍，沿途收集小鱼，骑过海岸、雨林和落日神庙

[在线游玩 · tihuqiche.com](https://tihuqiche.com/) · [下载单文件 HTML](https://github.com/Licoy/tihuqiche/raw/refs/heads/main/dist/index.html) · [构建与部署记录](https://github.com/Licoy/tihuqiche/actions/workflows/pages.yml)

> 在线地址在首次 Pages 部署成功后可用；下载 HTML 后使用浏览器打开，即可离线游玩

![鹈鹕出逃记游戏画面](docs/preview.png)

## 游戏内容

- 真正的 3D 鹈鹕、单车、海岛赛道与追随镜头，包含踩踏、车轮、围巾和跳跃动画
- 三条赛道左右切换，矮木栏需要跳跃，高木箱需要绕开，蓝色横杆需要低头
- 小鱼收集、一次性护盾、三点体力、暂停、关卡重试与三星评价
- 通关后解锁下一关，最高分、星级和解锁进度保存在当前浏览器中
- 支持键盘、触屏滑动与手机屏幕按钮
- CSS、JavaScript、3D 引擎和程序生成的模型全部内嵌，一个 HTML 文件即可运行

| 关卡 | 路线 | 距离 |
| --- | --- | --- |
| 01 | 珊瑚海岸 | 600 米 |
| 02 | 雨林遗迹 | 850 米 |
| 03 | 落日神庙 | 1100 米 |

到达终点即可通关，保留 3 点体力并收集至少 25 条小鱼可获得三星；体力用尽可以重新挑战本关

## 如何游玩

直接用支持 WebGL 的浏览器打开 [`dist/index.html`](dist/index.html)，不需要启动服务器或安装依赖；也可以通过上方的在线地址游玩

| 操作 | 键盘 | 触屏 |
| --- | --- | --- |
| 左右变道 | `←` / `→` 或 `A` / `D` | 左右滑动，或点击方向按钮 |
| 跳跃 | `↑`、`W` 或空格 | 向上滑动，或点击跳跃按钮 |
| 低头 | `↓` 或 `S` | 向下滑动，或点击低头按钮 |
| 暂停 / 继续 | `P` 或 `Esc` | 点击暂停 / 继续按钮 |
| 音效 | 点击右上角音效开关 | 点击右上角音效开关 |

音效默认关闭，可在游戏中开启；切换到其他标签页或窗口时会自动暂停

存档属于当前浏览器和访问地址，本地文件与在线网站的进度互相独立；浏览器禁止本地存储时，游戏会提示无法保存进度

## 本地开发与构建

需要 **Node.js 22 或更高版本**，CI 使用 Node.js 24

```bash
git clone https://github.com/Licoy/tihuqiche.git
cd tihuqiche
npm run build
```

构建使用 Node.js 标准库，不依赖 npm 包，也不联网下载引擎；执行后生成 `dist/index.html`，直接用浏览器打开即可

日常修改 `src/` 内的源码，再运行 `npm run build` 刷新产物；`dist/index.html` 随仓库保留，方便直接下载离线版，提交代码前请同步构建产物

构建会检查 JavaScript 语法、模板占位符和资源内嵌情况，并将项目与 Three.js 的 MIT 许可证一同保留在 HTML 中

## 测试

```bash
npm ci
npx playwright install chromium
npm test
```

首次安装测试依赖和 Chromium 需要联网，浏览器运行游戏时会设置为离线模式；Linux 环境可以使用 `npx playwright install --with-deps chromium` 安装浏览器及系统依赖

如果本机已安装 Google Chrome，也可使用已有浏览器运行测试

```bash
PLAYWRIGHT_CHANNEL=chrome npm test
```

测试包含离线文件加载、键盘与触屏操作、碰撞、跳跃、低头、护盾、失败重试、三关通关与刷新后存档恢复，共 43 项检查；测试通过推进真实物理逻辑验证关卡路径，触屏检查由浏览器模拟完成

测试报告和截图写入 `test-results/`，不提交到 Git；测试使用独立浏览器上下文，不修改玩家实际存档

## GitHub Pages 自动部署

工作流位于 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)，使用 GitHub 官方 Pages Actions

- 推送到 `main`：安装测试依赖 → 从源码构建 → 运行游戏测试 → 上传 `dist/` → 部署到 Pages
- 向 `main` 提交 Pull Request：仅构建和测试，通过后才适合合并
- 需要重新部署时，可在 Actions 中选择 **Build and deploy Pages → Run workflow**，使用 `main` 分支运行

首次配置或 Fork 仓库后，进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**；不需要创建 `gh-pages` 分支，也不需要配置个人访问令牌

正式访问地址为 **[https://tihuqiche.com](https://tihuqiche.com/)**，通过 GitHub Pages 托管

在 **Settings → Pages → Custom domain** 中填写 `tihuqiche.com`，DNS 校验和证书准备完成后开启 **Enforce HTTPS**；使用 Actions 自定义工作流时，域名由 Pages 设置管理，无需在源码或 `dist/` 中添加 `CNAME` 文件

页面的规范地址（canonical）与分享地址均使用 `https://tihuqiche.com/`，这些元信息不会发起资源请求，下载后的单文件仍可离线运行

每次部署都会从 `src/` 重新构建，只发布 `dist/` 内的静态产物；构建或测试失败时停止部署，线上版本保持不变

配置方式参考 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)与[自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 项目结构

```text
.
├── src/
│   ├── index.html          # 页面、样式和构建占位符
│   ├── world.js            # 渲染、场景与关卡配置
│   ├── rider.js            # 鹈鹕、单车模型与动画
│   ├── course.js           # 障碍、拾取物与粒子
│   ├── game.js             # 游戏状态、物理、存档和镜头
│   └── input.js            # 键盘、触屏和启动入口
├── vendor/three/           # 固定版本的 Three.js 与原始许可证
├── scripts/build.mjs      # 无依赖的单文件构建脚本
├── tests/game.cjs          # Playwright 游戏检查
├── docs/preview.png        # 游戏预览
├── dist/index.html         # 构建后的离线游戏与 Pages 首页
├── .github/workflows/
│   └── pages.yml           # 构建、测试和部署
├── package.json
├── package-lock.json
└── LICENSE
```

## 许可证

项目使用 [MIT License](LICENSE)，Three.js `0.160.1` 使用其原始 [MIT License](vendor/three/LICENSE)
