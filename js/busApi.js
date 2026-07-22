/**
 * 实时公交 API 模块（从 hnbus.py 移植）
 * 通过本地代理 /api/bus/ 访问 zjdyx.cn，绕过 CORS 限制
 * 使用 python server.py 启动本地代理服务器
 */
(function () {
    var HNBus = window.HNBus || {};
    var BusApi = {};

    function getConfig() {
        return (window.APP_CONFIG && window.APP_CONFIG.busApi) ? window.APP_CONFIG.busApi : {};
    }

    function getSessionID() {
        var cfg = getConfig();
        return cfg.sessionID || '';
    }

    /**
     * 通用 fetch 封装：先尝试直接请求，失败则走本地代理
     */
    function _fetchWithFallback(directUrl, proxyPath, body) {
        var proxyUrl = window.location.origin + proxyPath;

        // 直接请求（适用于服务器部署场景）
        function tryDirect() {
            return fetch(directUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
        }

        // 本地代理请求
        function tryProxy() {
            var url = proxyUrl + '?gprsId=' + body.gprsId + '&sessionID=' + getSessionID();
            return fetch(url, { method: 'POST' }).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
        }

        // 有本地代理时直接走代理
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return tryProxy().catch(function () { return null; });
        }

        // 否则尝试直连，失败走代理
        return tryDirect().catch(function () {
            return tryProxy().catch(function () { return null; });
        });
    }

    /**
     * 获取线路详情（站点列表、首末班、票价等）
     * @param {string|number} gprsId
     * @returns {Promise<object|null>}
     */
    BusApi.fetchBusLineInfo = function (gprsId) {
        var cfg = getConfig();
        var directUrl = cfg.baseUrl + '/WXMP_BusInfo/GetLineDetialByGprsid?sessionID=' + (cfg.sessionID || '');

        return _fetchWithFallback(directUrl, '/api/bus/line', {
            gprsId: String(gprsId),
            dir: 'true'
        }).then(function (data) {
            if (data && data.Item && data.Item.LineName) return data;
            return null;
        });
    };

    /**
     * 获取发车时刻表
     * @param {string|number} gprsId
     * @returns {Promise<Array>}
     */
    BusApi.fetchBusShiftTimes = function (gprsId) {
        var cfg = getConfig();
        var directUrl = cfg.baseUrl + '/WXMP_BusInfo/GetLineShiftListByGprsid?sessionID=' + (cfg.sessionID || '');

        return _fetchWithFallback(directUrl, '/api/bus/shift', {
            gprsId: String(gprsId),
            dir: 'false'
        }).then(function (data) {
            if (Array.isArray(data) && data.length > 0) return data;
            return [];
        });
    };

    /**
     * 轮询获取多条线路数据（带延时控制）
     */
    BusApi.fetchMultipleLines = function (lineNumbers, onProgress, delayMs) {
        delayMs = delayMs || 500;
        onProgress = onProgress || function () {};

        var results = [];
        var index = 0;
        var cancelled = false;

        function fetchNext() {
            if (cancelled || index >= lineNumbers.length) {
                return Promise.resolve(results);
            }

            var lineNum = lineNumbers[index];
            var gprsId = parseInt(lineNum + '1', 10);

            return BusApi.fetchBusLineInfo(gprsId).then(function (data) {
                if (data) {
                    results.push({ lineNumber: lineNum, data: data });
                    onProgress(index + 1, lineNumbers.length, data);
                }
                index++;
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve(fetchNext()); }, delayMs);
                });
            });
        }

        var promise = fetchNext();

        return {
            promise: promise,
            cancel: function () { cancelled = true; }
        };
    };

    // 导出
    HNBus.BusApi = BusApi;
    window.HNBus = HNBus;
})();
