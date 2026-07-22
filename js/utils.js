/**
 * HNbus 工具函数模块
 * 提供：debounce/throttle、hash、设备检测、Toast 通知、数组去重
 */
(function () {
    var HNBus = window.HNBus || {};
    var Utils = {};

    // ---- 防抖 ----
    Utils.debounce = function (fn, delay) {
        delay = delay || 300;
        var timer = null;
        return function () {
            var context = this;
            var args = arguments;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                timer = null;
                fn.apply(context, args);
            }, delay);
        };
    };

    // ---- 节流 ----
    Utils.throttle = function (fn, delay) {
        delay = delay || 300;
        var last = 0;
        return function () {
            var now = Date.now();
            if (now - last >= delay) {
                last = now;
                fn.apply(this, arguments);
            }
        };
    };

    // ---- 数组去重 ----
    Utils.removeDuplicates = function (arr) {
        if (!arr || !arr.length) return [];
        return arr.filter(function (item, index) {
            return arr.indexOf(item) === index;
        });
    };

    // ---- 字符串 hash（用于颜色微调）----
    Utils.hashString = function (str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    // ---- 设备检测 ----
    Utils.isMobile = function () {
        // 双重检测：UA + 屏幕宽度
        var ua = navigator.userAgent.toLowerCase();
        var uaMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        var widthMobile = window.innerWidth <= 768;
        return uaMobile || widthMobile;
    };

    // ---- Toast 通知 ----
    var _toastEl = null;
    var _toastTimer = null;

    Utils.showToast = function (message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        // 创建 toast 元素（单例）
        if (!_toastEl) {
            _toastEl = document.createElement('div');
            _toastEl.className = 'native-toast native-toast-bottom';
            document.body.appendChild(_toastEl);
        }

        // 清除之前的定时器
        if (_toastTimer) {
            clearTimeout(_toastTimer);
            _toastTimer = null;
        }

        // 重置 class
        _toastEl.className = 'native-toast native-toast-bottom';
        _toastEl.textContent = message;

        // 设置类型样式
        if (type === 'error')      _toastEl.classList.add('native-toast-error');
        else if (type === 'success') _toastEl.classList.add('native-toast-success');
        else if (type === 'warning') _toastEl.classList.add('native-toast-warning');
        else                        _toastEl.classList.add('native-toast-info');

        // 触发显示（需要 reflow 才能触发动画）
        void _toastEl.offsetWidth;
        _toastEl.classList.add('native-toast-shown');

        // 自动隐藏
        _toastTimer = setTimeout(function () {
            _toastEl.classList.remove('native-toast-shown');
            _toastTimer = null;
        }, duration);
    };

    // ---- 提取线路编号（用于配色查找）----
    Utils.extractLineNumber = function (lineName) {
        if (!lineName) return null;
        // 尝试匹配数字
        var match = lineName.match(/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
        // 特殊匹配：游X
        var tourMatch = lineName.match(/游(\d+)/);
        if (tourMatch) {
            return 800 + parseInt(tourMatch[1], 10); // 游1→801, 游2→802
        }
        return null;
    };

    // ---- 转义 HTML（防止 XSS）----
    Utils.escapeHtml = function (str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    // ---- 从 localStorage 读写 ----
    Utils.storage = {
        get: function (key, defaultValue) {
            try {
                var val = localStorage.getItem('hnbus_' + key);
                return val !== null ? JSON.parse(val) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        set: function (key, value) {
            try {
                localStorage.setItem('hnbus_' + key, JSON.stringify(value));
            } catch (e) {
                // storage full or disabled
            }
        },
        remove: function (key) {
            try {
                localStorage.removeItem('hnbus_' + key);
            } catch (e) {}
        }
    };

    // 导出
    HNBus.Utils = Utils;
    window.HNBus = HNBus;
})();
