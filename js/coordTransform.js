/**
 * 坐标系转换模块（从 hnbus.py 移植）
 * WGS84 ↔ GCJ02（火星坐标系）
 * 纯数学运算，无外部依赖
 */
(function () {
    var HNBus = window.HNBus || {};
    var CoordTransform = {};

    var PI = Math.PI;
    var A = 6378245.0;           // 长半轴
    var EE = 0.00669342162296594323; // 偏心率平方

    function isOutOfChina(lat, lng) {
        return (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271);
    }

    function transformLat(x, y) {
        var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    function transformLng(x, y) {
        var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
        return ret;
    }

    /**
     * WGS84 → GCJ02（火星坐标系）
     * @param {number} lat - 纬度
     * @param {number} lng - 经度
     * @returns {{lat: number, lng: number}}
     */
    CoordTransform.wgs84ToGcj02 = function (lat, lng) {
        if (lat == null || lng == null) return { lat: null, lng: null };
        if (isOutOfChina(lat, lng)) return { lat: lat, lng: lng };

        var dlat = transformLat(lng - 105.0, lat - 35.0);
        var dlng = transformLng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - EE * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (A / sqrtmagic * Math.cos(radlat) * PI);

        return {
            lat: lat + dlat,
            lng: lng + dlng
        };
    };

    /**
     * GCJ02 → WGS84（逆转换）
     * @param {number} lat - GCJ02 纬度
     * @param {number} lng - GCJ02 经度
     * @returns {{lat: number, lng: number}}
     */
    CoordTransform.gcj02ToWgs84 = function (lat, lng) {
        if (lat == null || lng == null) return { lat: null, lng: null };
        if (isOutOfChina(lat, lng)) return { lat: lat, lng: lng };

        var dlat = transformLat(lng - 105.0, lat - 35.0);
        var dlng = transformLng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - EE * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (A / sqrtmagic * Math.cos(radlat) * PI);

        return {
            lat: lat - dlat,
            lng: lng - dlng
        };
    };

    // 导出
    HNBus.CoordTransform = CoordTransform;
    window.HNBus = HNBus;
})();
