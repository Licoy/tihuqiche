# 鹈鹕骑车 · Pelican Pedal Run

长嘴巴，小单车，还有一整座海岛

一个使用 **Vue 3 + Vite 8 + Three.js / WebGL** 制作的 3D 骑车游戏，包含闯关、无尽、电脑本地双人合作和道具闯关四种模式，自动向前骑行，通过变道、跳跃和低头躲开障碍，沿途收集小鱼，骑过海岸、雨林、神庙、荒漠、骷髅岛与上海滩

[在线游玩 · tihuqiche.com](https://tihuqiche.com/) · [Play in English](https://tihuqiche.com/en/) · [下载单文件 HTML](https://github.com/Licoy/tihuqiche/raw/refs/heads/main/dist/offline.html) · [构建与部署记录](https://github.com/Licoy/tihuqiche/actions/workflows/pages.yml)

> 在线地址在首次 Pages 部署成功后可用；下载 HTML 后使用浏览器打开，即可离线游玩

![鹈鹕骑车游戏画面](docs/preview.png)

## 游戏内容

- 真正的 3D 鹈鹕、单车、海岛赛道与追随镜头，自行车包含脚蹬、曲柄、前后链轮与闭合链条，踩踏和传动联动
- 三条赛道左右切换，矮木栏需要跳跃，高木箱需要绕开，蓝色横杆需要低头
- 小鱼收集、一次性护盾、三点体力、暂停、关卡重试与三星评价
- 普通、双人和道具闯关各自保存六关解锁、最高分与星级，无尽保存独立最高分
- 收集 10 条可用小鱼可冲刺一次，持续 2.5 秒、速度增加 50%，消耗不影响累计鱼量、分数和星级
- GG/MM 与皮肤、帽子、围巾、眼镜、衣服免费搭配，支持自行车、摩托车、电瓶车和滑板车，外观不改变性能
- PC 首页左侧游戏模块与右侧装扮模块垂直居中，右侧展示动态、可 360° 旋转的鹈鹕模型，下方按钮进入装扮；分类与款式选项配有对应真实模型缩略图
- 装扮页左侧展示更大的透明背景模型、右侧选择装扮，手机竖屏上模型下选项；拖动后暂停自动旋转，停止操作 10 秒后恢复；点击「预览效果」切换赛道场景，再次点击返回模型，预览与保存按钮同排
- 结算成绩卡支持系统截图、复制挑战文案和官网二维码，双人同时展示个人成绩与合作总分
- 支持键盘、触屏滑动与手机屏幕按钮
- 中英文界面、跟随系统语言与明暗主题，手动选择保存在当前浏览器中
- 在线版按资源文件加载，离线版内嵌 CSS、JavaScript、Logo、favicon 和 3D 引擎，一个 HTML 文件即可运行

| 关卡 | 路线 | 距离 |
| --- | --- | --- |
| 01 | 珊瑚海岸 | 600 米 |
| 02 | 雨林遗迹 | 850 米 |
| 03 | 落日神庙 | 1100 米 |
| 04 | 荒漠 | 1250 米 |
| 05 | 骷髅岛 | 1400 米 |
| 06 | 上海滩 | 1600 米 |

到达终点即可通关，保留 3 点体力并收集至少 25 条小鱼可获得三星；体力用尽可以重新挑战本关

## 如何游玩

直接用支持 WebGL 的浏览器打开 [`dist/offline.html`](dist/offline.html)，不需要启动服务器或安装依赖；也可以通过上方的在线地址游玩

| 操作 | 键盘 | 触屏 |
| --- | --- | --- |
| 左右变道 | `←` / `→` 或 `A` / `D` | 左右滑动，或点击方向按钮 |
| 跳跃 | `↑` 或 `W` | 向上滑动，或点击跳跃按钮 |
| 低头 | `↓` 或 `S` | 向下滑动，或点击低头按钮 |
| 冲刺 | 空格，需要至少 10 条可用小鱼 | 点击冲刺按钮 |
| 使用道具 | `E`，仅道具模式 | 点击道具按钮 |
| 暂停 / 继续 | `P` 或 `Esc` | 点击暂停 / 继续按钮 |
| 音效 | 点击右上角音效开关 | 点击右上角音效开关 |

音效默认开启，首次点击「出发，去兜风」后激活，可通过右上角开关静音；切换到其他标签页或窗口时会自动暂停

存档属于当前浏览器和访问地址，本地文件与在线网站的进度互相独立；浏览器禁止本地存储时，游戏会提示无法保存进度

进度使用 `pelican-pedal-run-v3`，按 v3 → v2 → v1 读取，只有键不存在才查旧版；旧成绩仅迁入普通闯关，三关旧档已通关落日神庙时解锁荒漠；加载不写盘，首次有效结算写入 v3，保留原 v1/v2 键

损坏进度会明确提示并禁止本次自动覆盖，不悄悄回退到旧档；存储失败时本局结果和分享仍可用，但不会提示保存成功；玩家可通过浏览器站点数据管理显式清除损坏存档后重新开始

P1/P2 装扮独立保存在 `pelican-pedal-appearance-v1`，只在主动保存时写入，与进度隔离；损坏外观会提示并使用默认造型，取消装扮恢复原配置，保存失败保留草稿以便重试

外观默认跟随设备的浅色或深色设置，右上角可以选择浅色、深色或重新跟随系统；首页默认使用设备语言（中文设备显示中文，其余显示英文），手动选择优先，直接访问 `/en/` 则显示英文

## 模式规则与双人键位

- 无尽模式初始 3 点体力，5000 米内速度从 18 增至 32 m/s、障碍间距从 36 缩至 28 米，每 1000 米循环切换六种主题；体力耗尽或暂停后选择结束时结算，无星级或通关体力奖励
- 双人共用三条车道，各自 3 点体力、鱼池和冲刺，彼此不碰撞；差距超过 10 米时落后者逐步获得追赶加成，18 米达到 50%，与冲刺合计倍率上限 1.75
- 双人各自完赛或倒下后停止操作，等待另一人结束；至少一人完赛即合作通关，两人均倒下则失败，本关不复活
- 道具箱只在空槽时拾取，四类等概率；护盾挡一次伤害，磁铁持续 8 秒吸前方 12 米三道鱼，双倍鱼分持续 8 秒每鱼额外加 25 分，清障波清除前方 30 米障碍
- 同类限时道具刷新至 8 秒，不叠加时长；双倍鱼分不增加可用鱼量，已有护盾时不消耗槽内护盾

| 操作 | P1 | P2 |
| --- | --- | --- |
| 左右变道 | A / D | 小键盘 4 / 6，或 ← / → |
| 跳跃、低头 | W / S | 小键盘 8 / 2，或 ↑ / ↓ |
| 冲刺 | 空格 | 小键盘 0，或右 Shift |
| 暂停 | P / Esc | P / Esc |

双人仅支持电脑和本地键盘，手机入口显示电脑支持提示；小键盘按物理键位识别，兼容 NumLock 开关，不需要联网或账号

单人得分为 `floor(距离) + 累计小鱼 × 25 + 道具额外分 + 完赛时剩余体力 × 150`，无尽不加体力奖励；双人分别计分后相加，倒下者无通关奖励

普通和道具闯关通关获得 1 星，满血加 1 星，累计至少 25 条鱼加 1 星；双人通关获得 1 星，两人均满血完赛加 1 星，团队累计至少 50 条鱼加 1 星

## 成绩分享

结算卡展示同一份冻结结果，落盘分数与复制文案保持一致；按钮在截图区域外，可直接使用系统截图；复制失败会显示错误和可手动选中的文本，不承诺所有浏览器离线剪贴板可用

二维码内联到离线包中，中文指向 `https://tihuqiche.com/`、英文指向 `https://tihuqiche.com/en/`，不会分享本地文件地址；离线可显示二维码，访问官网仍需要网络，链接不上传或还原个人成绩

二维码由开发依赖 `qrcode` 生成真实 SVG，运行时不加载二维码库或第三方资源；修改正式地址后运行 `pnpm share:qr`，重新生成 `src/share-qr.js` 并独立扫码核对

## 本地开发与构建

需要 **Node.js 22.12 或更高版本** 和 **pnpm 11.24.0**，CI 使用 Node.js 24

```bash
git clone https://github.com/Licoy/tihuqiche.git
cd tihuqiche
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器支持 Vue 单文件组件热更新；构建与预览命令如下

```bash
pnpm build
pnpm preview
```

基础 HTML 内置品牌加载界面，Vue 挂载期间保持显示；程序下载阶段展示加载动画，之后按实际完成的资源任务推进进度，等待图片解码、字体和 3D 首帧就绪再显示游戏；资源加载失败时保留错误与重试入口，离线版使用同一流程

构建首先生成在线资源，再用 Vue 服务端渲染输出中文 `dist/index.html` 和英文 `dist/en/index.html`，最后独立使用 `vite-plugin-singlefile` 生成完整内嵌的 `dist/offline.html`；在线版需通过 HTTP 服务访问，离线版可直接打开

标题、描述、关卡名称和 JSON-LD 与界面共享 `src/locales.js`、`src/levels.js`；两种语言的静态 HTML 都包含实际页面内容、canonical、hreflang、Open Graph 与 Twitter Card，不依赖执行 JavaScript 才能抓取；`public/` 提供 favicon、1200×630 分享图片、robots.txt 和 sitemap.xml

构建会检查预渲染内容与离线资源引用，并保留项目和 Three.js 的 MIT 许可证；`dist/` 随仓库保留，提交代码前请同步构建产物

场景、角色和游戏工厂保留原有模型与物理步骤，因此整体初始化函数超过 50 行，内部操作仍独立分组；这些工厂统一管理动画、事件和 GPU 资源的销毁，避免为一次性模型构造增加额外接口

## 本地测试

`pnpm test:unit` 只运行 Node 模块测试，不写入 dist；`pnpm test` 按模块测试 → 构建 → 浏览器测试顺序执行，GitHub Actions 仅负责构建与部署，不安装 Chromium 或运行浏览器测试

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
```

首次安装依赖和 Chromium 需要联网，测试分别验证本地 HTTP 在线资源与离线文件；Linux 环境可以使用 `pnpm exec playwright install --with-deps chromium` 安装浏览器及系统依赖

如果本机已安装 Google Chrome，也可使用已有浏览器运行测试

```bash
PLAYWRIGHT_CHANNEL=chrome pnpm test
```

模块测试覆盖规则、外观、进度迁移与损坏保护、不可变更新和分享错误处理；浏览器测试覆盖在线与离线加载、六关流程、存档迁移、键盘与触屏、主题和语言切换、预渲染 SEO、favicon 与分享资源，以及手机竖屏和横屏布局；关卡检查推进真实物理逻辑，触屏和设备主题检查由浏览器模拟完成

更换 Logo 后可运行 `pnpm assets` 重新生成 favicon 和分享图片，需要已安装 Playwright Chromium；使用本机 Chrome 时运行 `PLAYWRIGHT_CHANNEL=chrome pnpm assets`

界面使用从原 Logo 缩小得到的 128px 图片，内嵌后约 21KB，原图保留用于生成分享卡片

装扮缩略图使用当前 Three.js 程序化角色模型生成，22 张透明底 128px PNG 位于 `src/assets/outfits/`，总计约 159 KiB；`src/outfit-thumbnails.js` 通过 `?inline` 导入，离线页面无需请求额外图片，七个分类复用对应代表款式

修改模型或装扮目录后，按需运行 `pnpm assets:outfits`，也可直接运行 `node scripts/generate-outfit-thumbnails.mjs`；脚本只使用现有 Vite、Three.js、Playwright 依赖和已安装的 Google Chrome，在隔离的无头上下文中用一个渲染器生成素材，不读取用户浏览器资料

生成脚本会检查全部选项 ID、图片尺寸、非空像素与内联映射，并将视觉合集写至 `/private/tmp/tihuqiche-outfit-contact-sheet.png` 供检查；帽子、围巾、眼镜采用部件近景，载具单独展示，未穿戴选项展示真实身体部位；该命令不挂接构建、CI 或测试流程，更新后提交生成的 PNG 与映射文件

真实键盘多键同时按下、双人手感和手机截图扫码需要人工验收，浏览器模拟不能代替这些结论

测试报告和截图写入 `test-results/`，不提交到 Git；测试使用独立浏览器上下文，不修改玩家实际存档

## GitHub Pages 自动部署

工作流位于 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)，使用 GitHub 官方 Pages Actions

- 推送到 `main`：安装依赖 → 执行 `pnpm build` → 上传 `dist/` → 部署到 Pages
- 向 `main` 提交 Pull Request：仅构建，不部署
- 需要重新部署时，可在 Actions 中选择 **Build and deploy Pages → Run workflow**，使用 `main` 分支运行

首次配置或 Fork 仓库后，进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**；不需要创建 `gh-pages` 分支，也不需要配置个人访问令牌

正式访问地址为 **[https://tihuqiche.com](https://tihuqiche.com/)**，通过 GitHub Pages 托管

在 **Settings → Pages → Custom domain** 中填写 `tihuqiche.com`，DNS 校验和证书准备完成后开启 **Enforce HTTPS**；使用 Actions 自定义工作流时，域名由 Pages 设置管理，无需在源码或 `dist/` 中添加 `CNAME` 文件

中文规范地址为 `https://tihuqiche.com/`，英文为 `https://tihuqiche.com/en/`；分享图片使用可直接抓取的 `https://tihuqiche.com/share-image.png`，这些元信息不会使离线包发起资源请求

每次部署都会从 `src/` 重新构建，只发布 `dist/` 内的静态产物；构建失败时停止部署，线上版本保持不变

配置方式参考 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)与[自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 项目结构

```text
.
├── src/
│   ├── App.vue / main.js   # Vue 应用与浏览器入口
│   ├── components/        # 菜单、HUD、操作和弹窗
│   ├── styles/            # 明暗主题与响应式布局
│   ├── assets/pelican-logo.png # 鹈鹕骑车透明 Logo
│   ├── entry-server.js    # 中英文页面预渲染入口
│   ├── seo.js / locales.js # 共享元信息与双语文案
│   ├── levels.js / scenery.js # 六关配置与场景主题
│   ├── world.js / rider.js # 场景与角色模型工厂
│   └── game.js / input.js # 物理、游戏状态与输入
├── public/                # favicon、分享图、robots 和 sitemap
├── index.html / vite.config.js # Vite 页面与构建配置
├── vendor/three/           # 固定版本的 Three.js 与原始许可证
├── scripts/build.mjs      # 在线、预渲染与离线构建
├── scripts/generate-social-assets.mjs # 从现有 Logo 生成静态分享资源
├── tests/game.cjs          # Playwright 游戏检查
├── docs/preview.png        # 游戏预览
├── dist/                  # 中文首页、en/、在线资源与 offline.html
├── .github/workflows/
│   └── pages.yml           # 构建和部署
├── package.json
├── pnpm-lock.yaml
└── LICENSE
```

## 社区支持
- [LinuxDO](https://linux.do)

## 许可证

项目使用 [MIT License](LICENSE)，Three.js `0.160.1` 使用其原始 [MIT License](vendor/three/LICENSE)
