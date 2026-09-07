# Three.js

- 版本：`0.160.1`
- 文件：`three.min.js`，浏览器全局变量构建，导出 `THREE`
- 来源：[npm 分发文件](https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js)
- 许可证：[MIT](LICENSE)

构建时将引擎与许可证原样内嵌到 `dist/index.html`，游玩时不访问 CDN；固定使用该版本的全局变量构建，以保持单文件直接打开的运行方式

更新引擎时需要同时核对构建格式、全局变量接口和许可证，再运行游戏测试
