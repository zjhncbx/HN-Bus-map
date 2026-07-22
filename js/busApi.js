/**
 * 实时公交 API 模块（从 hnbus.py 移植）
 * 从 www.zjdyx.cn 获取公交线路详情和发车时刻表
 * 注意：直接从前端调用可能存在跨域限制，浏览器需支持 CORS 或使用代理
 */
(function () {
    var HNBus = window.HNBus || {};
    var BusApi = {};

    var config = null;

    function getConfig() {
        if (!config && window.APP_CONFIG) {
            config = window.APP_CONFIG.busApi || {};
        }
        return config;
    }

    /**
     * 获取线路详情（包含站点列表、首末班、票价等）
     * 对应 hnbus.py 的 get_bus_line_info()
     * @param {string|number} gprsId - 线路 GPRS ID（如 "11" 表示主线，"12" 表示支线）
     * @returns {Promise<object|null>}
     */
    BusApi.fetchBusLineInfo = function (gprsId) {
        var cfg = getConfig();
        var url = cfg.baseUrl + '/WXMP_BusInfo/GetLineDetialByGprsid?sessionID=' + (cfg.sessionID || '');

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                              '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'xweb_xhr': '1',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://servicewechat.com/wx2c04dce60bfff2cb/33/page-frame.html'
            },
            body: JSON.stringify({
                gprsId: String(gprsId),
                dir: 'true'
            })
        })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            if (data.Item && data.Item.LineName) {
                return data;
            }
            return null;
        })
        .catch(function (err) {
            console.warn('获取线路 ' + gprsId + ' 数据失败:', err.message);
            return null;
        });
    };

    /**
     * 获取发车时刻表
     * 对应 hnbus.py 的 get_bus_shift_times()
     * @param {string|number} gprsId
     * @returns {Promise<Array>}
     */
    BusApi.fetchBusShiftTimes = function (gprsId) {
        var cfg = getConfig();
        var url = cfg.baseUrl + '/WXMP_BusInfo/GetLineShiftListByGprsid?sessionID=' + (cfg.sessionID || '');

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                              '(KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
                'xweb_xhr': '1',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://servicewechat.com/wx2c04dce60bfff2cb/67/page-frame.html'
            },
            body: JSON.stringify({
                gprsId: String(gprsId),
                dir: 'false'
            })
        })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
            return [];
        })
        .catch(function (err) {
            console.warn('获取线路 ' + gprsId + ' 发车时间失败:', err.message);
            return [];
        });
    };

    /**
     * 轮询获取多条线路数据（带延时控制）
     * @param {Array<number>} lineNumbers - 线路编号列表
     * @param {function} onProgress - 进度回调 (current, total, lineData)
     * @param {number} delayMs - 请求间隔（毫秒）
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

                // 延时后进行下一个请求
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(fetchNext());
                    }, delayMs);
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
