# 海宁公交线路查询 (HNbus)

海宁市公共交通线路查询网页应用，基于高德地图可视化展示公交线路、站点、时刻表等实时数据，仅供教学科研学习使用。

## 功能特性

- 🚌 **5 大分类** — 城市公交 / 城乡公交 / 社区巴士 / 城际公交 / 轨道交通
- 🎨 **独立线路配色** — 114 条线路全色轮分布，每条颜色不同
- 🔍 **多选查询** — 复选框批量选择，搜索框实时筛选
- 🖱️ **点击线路看详情** — 首末班时间、完整发车时刻表、站点列表
- 📡 **实时数据** — 通过 busApi 获取公交数据（首末班/时刻表/站点坐标）
- 🔄 **双源兜底** — 高德 LineSearch 失败时自动切换 busApi 获取站点并绘制
- 🏷️ **交互图例** — 地图上图例，点击切换类别显示/隐藏
- 📦 **分类折叠** — 每个类别可独立折叠，面板整体可收起至侧边
- 📱 **响应式设计** — 桌面浮动面板 / 移动端底部弹出
- 🔗 **URL 参数** — `?line=101,海宁2路` 自动查询

## 快速开始

### 1. 获取高德 API Key

前往 [高德开放平台](https://console.amap.com/dev/key/app) 申请 Key：
- 服务平台选择「**Web端(JS API)**」

### 2. 配置

```bash
# 复制配置模板
cp js/config.example.js js/config.js
```

编辑 `js/config.js`：
```js
window.APP_CONFIG = {
    amapKey: "你的高德Key",           // 必填
    busApi: {
        baseUrl: "https://www.zjdyx.cn",
        sessionID: "你的SessionID"     // 可选，留空则仅用高德数据
    }
};
```

### 3. 启动

```bash
# 推荐：使用自带代理服务器（绕过 CORS，支持 busApi 实时数据）
python server.py

# 或：仅静态文件（无 busApi 实时数据）
python -m http.server 8080
```

打开 `http://localhost:8080`

## 项目结构

```
HNBus/
├── index.html                    # 入口页面（仅 HTML 结构）
├── server.py                     # 本地代理服务器（静态+API转发）
├── css/
│   └── style.css                 # 样式表（变量/组件/响应式/动画）
├── js/
│   ├── config.example.js         # 配置模板 ✅ 提交 Git
│   ├── config.js                 # 实际配置 🔒 gitignore
│   ├── utils.js                  # 工具（debounce/Toast/hash/设备检测）
│   ├── coordTransform.js         # WGS84↔GCJ02 坐标转换
│   ├── busData.js                # 线路数据 + 分类规则 + 配色 + gprsId
│   ├── busApi.js                 # 实时公交 API（自动代理/直连切换）
│   ├── map.js                    # 地图/SDK加载/线路绘制/图例/详情窗
│   ├── ui.js                     # UI面板/事件委托/分类折叠/移动端
│   ├── search.js                 # 搜索编排/双源兜底/busApi富化
│   └── app.js                    # 主入口/错误处理/URL参数
├── .gitignore
└── README.md
```

## 模块职责

| 文件 | 职责 |
|------|------|
| `config.js` | 高德 Key、地图参数、busApi 配置 |
| `busData.js` | 5 大分类线路数据、gprsId 映射、HSL 配色算法 |
| `utils.js` | debounce、Toast 通知、设备检测、HTML 转义 |
| `coordTransform.js` | WGS84 ↔ GCJ02 火星坐标互转 |
| `busApi.js` | zjdyx.cn API 调用，localhost 自动走代理 |
| `map.js` | 动态加载 SDK、地图初始化、边界绘制、线路点击详情 |
| `ui.js` | 面板创建、分类复选框、折叠/展开、搜索筛选 |
| `search.js` | 高德 LineSearch + busApi 兜底、时刻表异步富化 |
| `app.js` | 启动编排、SDK 加载超时、URL 参数自动查询 |

## 使用说明

### 桌面端
1. 勾选线路复选框（可搜索筛选）
2. 点击类别标题 **文字** → 全选/取消该类别
3. 点击类别标题 **▼** → 折叠该类别
4. 点击面板顶部 **−** → 折叠面板内容
5. 点击侧边 **◀** → 面板滑出屏幕
6. 点击「查询」→ 地图显示线路
7. **点击线路** → 弹出详情（首末班/时刻表/站点）

### 移动端
1. 输入线路号码 → 点击「查询」或回车
2. 点击「展开全部线路」→ 浏览复选框
3. 面板可上下滑动

### 数据来源优先级

| 数据 | 优先 | 兜底 |
|------|------|------|
| 线路路径 | 高德 LineSearch | busApi 站点坐标 → GCJ02 转换 → 手动绘制 |
| 首末班/票价 | busApi `FirstShift/LastShift` | 高德 `stime/etime` |
| 发车时刻表 | busApi `ShiftList` | — |
| 站点列表 | AMap `via_stops` | busApi `StationList` |
| 轨道交通 | 仅高德数据（无 busApi） | — |

### 线路配色

每条线路通过名称 hash 映射到 HSL 色轮 0~360°，类别仅微调饱和度/亮度：

| 类别 | 饱和度 | 亮度 | 说明 |
|------|--------|------|------|
| 城市公交 | 78% | 52% | 红-橙-黄区域为主 |
| 城乡公交 | 82% | 50% | 紫-蓝区域为主 |
| 社区巴士 | 75% | 54% | 粉-紫区域为主 |
| 城际公交 | 85% | 48% | 蓝-青区域为主 |
| 轨道交通 | 90% | 55% | 橙-金区域为主 |

### URL 参数

| 参数 | 示例 | 说明 |
|------|------|------|
| `?line=101` | 自动查询 101 路 | 单个线路 |
| `?line=101,海宁2路,杭海城际` | 批量查询 | 逗号分隔 |

## 数据更新

更新线路数据：
```bash
python quick_scan.py          # 扫描全部线路 → bus_lines_found.json
# 手动更新 js/busData.js 中的线路数组
```

## 技术栈

- 高德地图 JS API v2.0（LineSearch + DistrictSearch）
- 原生 JavaScript（IIFE 模块，无框架依赖）
- CSS3（变量 + Flexbox + 响应式 + 动画）
- WGS84 ↔ GCJ02 坐标转换算法
- Python http.server + API 代理

## License

© MIT
