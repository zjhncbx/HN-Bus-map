/**
 * HNbus 配置模板
 * 复制此文件为 config.js 并填入实际值（config.js 已被 .gitignore 忽略）
 */
window.APP_CONFIG = {
    // 高德地图 JS API Key（必填）
    // 申请地址：https://console.amap.com/dev/key/app
    amapKey: "YOUR_AMAP_KEY_HERE",

    // 高德 API 版本
    amapVersion: "2.0",

    // 需要加载的插件
    amapPlugins: ["AMap.LineSearch", "AMap.DistrictSearch"],

    // 地图初始中心点（海宁市）
    mapCenter: [120.6803, 30.5115],

    // 地图初始缩放级别
    mapZoom: 13,

    // 地图样式
    mapStyle: "amap://styles/blue",

    // 公交实时数据 API 配置（来自 hnbus.py）
    busApi: {
        baseUrl: "https://www.zjdyx.cn",
        sessionID: ""  // 可选：实时公交数据的 Session ID
    }
};
