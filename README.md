# 海宁公交线路查询 (HNbus)

海宁市公共交通线路查询网页应用，支持城市公交、城乡城际、社区巴士、轨道交通的可视化查询。

## 功能特性

- 🗺️ 高德地图可视化展示公交线路和站点
- 🔍 支持线路复选框选择 / 关键词搜索
- 🎨 分类配色方案（城市公交红、城乡城际紫、社区巴士粉…）
- 📱 响应式设计，桌面端和移动端均可使用
- 🏷️ 交互图例，点击切换类别显示/隐藏
- 📋 信息窗体展示线路详情（站点、运营时间、票价）
- 🔗 URL 参数支持（`?line=101` 自动查询）
- 🌐 纯前端项目，无需后端，可部署到任意静态服务器

## 快速开始

### 1. 获取高德 API Key

前往 [高德开放平台](https://console.amap.com/dev/key/app) 申请 Key：
- 服务平台选择「**Web端(JS API)**」
- 将 Key 复制备用

### 2. 配置

```bash
# 复制配置模板
cp js/config.example.js js/config.js

# 编辑 js/config.js，将 YOUR_AMAP_KEY_HERE 替换为你的 Key
```

### 3. 运行

使用任意 HTTP 服务器打开（直接用浏览器打开 `file://` 协议可能被高德拒绝）：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# VS Code
# 安装 Live Server 插件后右键 → Open with Live Server
```

打开浏览器访问 `http://localhost:8080`。

## 项目结构

```
HNBus/
├── index.html                    # 入口页面
├── css/
│   └── style.css                 # 样式表（变量/组件/响应式）
├── js/
│   ├── config.example.js         # 配置模板（可提交到 Git）
│   ├── config.js                 # 实际配置（gitignore）
│   ├── utils.js                  # 工具函数（debounce/Toast/hash）
│   ├── coordTransform.js         # WGS84↔GCJ02 坐标转换
│   ├── busData.js                # 公交线路数据 + 分类配色
│   ├── busApi.js                 # 实时公交 API（可选）
│   ├── map.js                    # 地图初始化/线路绘制/图例
│   ├── ui.js                     # UI 面板/事件/移动端适配
│   ├── search.js                 # 搜索编排/回调处理
│   └── app.js                    # 主入口/初始化
├── hnbus.py                      # Python 数据采集工具（独立）
├── .gitignore
└── README.md
```

## 使用说明

### 桌面端
1. 勾选要查询的公交线路复选框
2. 可使用顶部搜索框筛选线路
3. 点击类别标题可全选/取消全选该类别
4. 点击「查询」按钮在地图上显示线路

### 移动端
1. 在输入框中输入线路号码（如 `101`、`海宁2路`）
2. 点击「查询」或按回车键
3. 点击「展开全部线路」可浏览所有线路复选框

### URL 参数
- `?line=101` — 自动查询 101 路
- `?line=101,102,杭海城际` — 自动查询多条线路

## 技术栈

- 高德地图 JS API v2.0
- 原生 JavaScript（无框架依赖）
- CSS3（变量 + Flexbox + 响应式）
- WGS84 ↔ GCJ02 坐标转换算法

## License

© HNMRXZ
