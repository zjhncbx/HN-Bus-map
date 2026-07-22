/**
 * HNbus 主入口
 * 初始化顺序：配置校验 → UI 创建 → 加载 SDK → 初始化地图 → 绑定事件
 */
(function () {
    var HNBus = window.HNBus || {};
    var App = {};

    App.init = function () {
        var cfg = window.APP_CONFIG;

        // 1. 校验配置
        if (!cfg) {
            App._showError('配置加载失败，请检查 js/config.js 是否存在。' +
                '请复制 config.example.js 为 config.js 并填入高德 API Key。');
            return;
        }

        if (!cfg.amapKey || cfg.amapKey === 'YOUR_AMAP_KEY_HERE') {
            App._showError(
                '请先配置高德地图 API Key。<br>' +
                '1. 编辑 js/config.js 文件<br>' +
                '2. 将 amapKey 替换为你的 Key<br>' +
                '3. <a href="https://console.amap.com/dev/key/app" target="_blank" style="color:#fff">' +
                '点击这里申请 Key</a>'
            );
            return;
        }

        // 2. 初始化 UI（先渲染面板，让用户有交互感）
        try {
            HNBus.UI.init(function () {
                HNBus.Search.execute();
            });
        } catch (e) {
            console.error('UI 初始化失败:', e);
            HNBus.Utils.showToast('界面初始化失败', 'error');
            return;
        }

        // 3. 加载高德地图 SDK
        HNBus.UI.showLoading('正在加载地图...');
        HNBus.Map.loadSDK(cfg.amapKey)
            .then(function () {
                HNBus.UI.hideLoading();

                // 4. 初始化地图
                var map = HNBus.Map.init('container');
                if (!map) {
                    HNBus.Utils.showToast('地图初始化失败', 'error');
                    return;
                }

                // 5. 绘制海宁市边界
                HNBus.Map.drawDistrict('海宁市');

                // 6. URL 参数自动查询
                App._checkUrlParams();

                HNBus.Utils.showToast('地图加载完成，请选择线路查询', 'success', 2000);
            })
            .catch(function (err) {
                HNBus.UI.hideLoading();
                App._showError(
                    '地图加载失败：' + (err.message || '未知错误') + '<br>' +
                    '请确认：<br>' +
                    '① API Key 是否正确<br>' +
                    '② 网络连接是否正常<br>' +
                    '③ Key 是否已开通「Web端(JS API)」平台'
                );
                console.error('SDK 加载失败:', err);
            });
    };

    /**
     * 检查 URL 参数自动查询
     * 支持：?line=101 （自动选中并查询）
     */
    App._checkUrlParams = function () {
        try {
            var params = new URLSearchParams(window.location.search);
            var lineParam = params.get('line');
            if (lineParam) {
                // 自动选中匹配的复选框
                var lines = lineParam.split(',');
                lines.forEach(function (line) {
                    line = line.trim();
                    var checkboxes = document.querySelectorAll(
                        'input[type="checkbox"][value="' + line + '"]'
                    );
                    if (checkboxes.length === 0) {
                        // 模糊匹配
                        checkboxes = document.querySelectorAll(
                            'input[type="checkbox"][data-display="' + line + '"]'
                        );
                    }
                    checkboxes.forEach(function (cb) { cb.checked = true; });
                });

                // 自动查询
                if (lines.length > 0) {
                    setTimeout(function () {
                        HNBus.Search.execute();
                    }, 500);
                }
            }
        } catch (e) {
            // URLSearchParams 不支持时静默忽略
        }
    };

    /**
     * 显示全屏错误
     */
    App._showError = function (message) {
        var banner = document.getElementById('error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'error-banner';
            banner.className = 'error-banner';
            document.body.appendChild(banner);

            banner.addEventListener('click', function (e) {
                if (e.target.classList.contains('retry-btn')) {
                    banner.classList.remove('show');
                    window.location.reload();
                }
            });
        }
        banner.innerHTML = message +
            ' <button class="retry-btn">重试</button>';
        banner.classList.add('show');
    };

    // 导出
    HNBus.App = App;
    window.HNBus = HNBus;

    // DOM 加载完成后自动启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', App.init);
    } else {
        App.init();
    }
})();
