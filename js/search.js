/**
 * 搜索编排模块
 * 并行搜索多类别线路、处理回调、修复原有 bug
 */
(function () {
    var HNBus = window.HNBus || {};
    var Search = {};

    var _pendingCount = 0;
    var _totalCount = 0;
    var _failedLines = [];   // 收集失败的线路名称
    var _filteredLines = []; // 在海宁境外被过滤的线路

    /**
     * 主查询入口
     */
    Search.execute = function () {
        var checkedLines = HNBus.UI.getCheckedLines();

        if (!checkedLines || !checkedLines.length) {
            HNBus.Utils.showToast('请先选择要查询的公交线路', 'warning');
            return;
        }

        // 去重
        var seen = {};
        var unique = [];
        checkedLines.forEach(function (item) {
            if (!seen[item.value]) {
                seen[item.value] = true;
                unique.push(item);
            }
        });
        checkedLines = unique;

        // 开始查询
        HNBus.UI.setSearchLoading(true);
        HNBus.UI.showLoading('正在查询公交线路...');
        HNBus.Map.clearLines();

        // 确保边界绘制
        HNBus.Map.drawDistrict('海宁市');

        _pendingCount = 0;
        _totalCount = checkedLines.length;
        _failedLines = [];
        _filteredLines = [];

        // 按城市分组
        var groupedByCity = {};
        checkedLines.forEach(function (item) {
            var city = item.category.searchCity || '嘉兴';
            if (!groupedByCity[city]) {
                groupedByCity[city] = [];
            }
            groupedByCity[city].push(item);
        });

        // 为每个城市组创建 LineSearch 实例并并行搜索
        var cityKeys = Object.keys(groupedByCity);
        cityKeys.forEach(function (city) {
            var lines = groupedByCity[city];
            Search._searchCityGroup(city, lines);
        });
    };

    /**
     * 搜索某个城市下的线路组
     */
    Search._searchCityGroup = function (city, lines) {
        try {
            var searcher = new AMap.LineSearch({
                pageIndex: 1,
                city: city,
                pageSize: 100,
                extensions: 'all'
            });

            lines.forEach(function (item) {
                _pendingCount++;

                var searchName = item.value;
                // 城市公交前缀处理
                if (item.category.id === 'city' && item.category.searchPrefix) {
                    // 特殊处理：319路
                    if (item.value === '319路' || item.display === '319') {
                        searchName = '319路';
                    } else if (item.value.indexOf('路') === -1 && item.value.indexOf(item.category.searchPrefix) === -1) {
                        searchName = item.category.searchPrefix + item.value;
                    }
                }

                searcher.search(searchName, function (status, result) {
                    if (status === 'complete' && result.info === 'OK') {
                        Search._handleResult(result, item);
                    } else {
                        _failedLines.push(item.display);
                        console.warn('查询失败: ' + item.display);
                    }
                    _pendingCount--;
                    Search._checkComplete();
                });
            });
        } catch (e) {
            console.error('创建搜索失败:', e);
            lines.forEach(function (item) { _failedLines.push(item.display); });
            _pendingCount -= lines.length;
            Search._checkComplete();
        }
    };

    /**
     * 处理搜索结果
     * 始终只取第一条结果，避免显示多条无关线路
     * 同时过滤在海宁行政区划以外的错误线路
     */
    Search._handleResult = function (data, item) {
        var lineArr = data.lineInfo;
        if (!lineArr || !lineArr.length) return;

        var category = item.category;

        // 始终只取第一条结果（与高德 LineSearch 返回的最佳匹配）
        var lineInfo = lineArr[0];
        var pathArr = lineInfo.path;
        var stops = lineInfo.via_stops;

        if (!pathArr || !pathArr.length) return;

        // 通过站点坐标检查线路是否在海宁境内，过滤嘉兴其他地区的错误线路
        if (!Search._hasStationInHaining(stops)) {
            _filteredLines.push(item.display + '(' + lineInfo.name + ')');
            console.warn('线路 ' + lineInfo.name + ' 不在海宁境内，已过滤');
            return;
        }

        // 获取分类颜色
        var color = HNBus.Data.getLineColor(lineInfo.name, category.id);

        // 绘制线路
        HNBus.Map.drawBusLine(pathArr, color);

        // 构建信息窗体内容
        var infoHtml = Search._buildInfoWindow(lineInfo, stops, category);
        var startPos = pathArr[0];
        if (startPos) {
            HNBus.Map.showInfoWindow(infoHtml, [startPos.lng, startPos.lat]);
        }
    };

    /**
     * 检查站点列表中是否有落在海宁境内的站点
     * 使用 bounding box 快速判断（海宁范围：120.15~121.05, 30.10~30.65）
     */
    Search._hasStationInHaining = function (stops) {
        if (!stops || !stops.length) return true; // 无站点数据时放行

        var HN = {
            minLng: 120.15, maxLng: 121.05,
            minLat: 30.10,  maxLat: 30.65
        };

        for (var i = 0; i < stops.length; i++) {
            var loc = stops[i].location;
            if (!loc) continue;

            // AMap.LngLat: .lng/.lat 或 .getLng()/.getLat()
            var lng = typeof loc.getLng === 'function' ? loc.getLng() : loc.lng;
            var lat = typeof loc.getLat === 'function' ? loc.getLat() : loc.lat;

            if (lng != null && lat != null &&
                lng >= HN.minLng && lng <= HN.maxLng &&
                lat >= HN.minLat && lat <= HN.maxLat) {
                return true;
            }
        }
        return false;
    };

    /**
     * 构建信息窗体 HTML
     */
    Search._buildInfoWindow = function (lineInfo, stops, category) {
        var U = HNBus.Utils;
        var name = U.escapeHtml(lineInfo.name || '未知线路');
        var direction = U.escapeHtml(lineInfo.direction || lineInfo.LineHeading || '');
        var stime = U.escapeHtml(lineInfo.stime || '');
        var etime = U.escapeHtml(lineInfo.etime || '');
        var price = U.escapeHtml(lineInfo.basic_price || '');
        var startStation = U.escapeHtml(lineInfo.start_stop || '');
        var endStation = U.escapeHtml(lineInfo.end_stop || '');

        var catColor = HNBus.Data.getCategoryColor(category.id);
        var catLabel = U.escapeHtml(category.label || '');

        var html = '<div class="info-window-content">';
        html += '<h3 style="border-left:3px solid ' + catColor + ';padding-left:6px;">' + name + '</h3>';

        if (direction) {
            html += '<p><span class="info-label">方向：</span>' + direction + '</p>';
        }
        if (startStation || endStation) {
            html += '<p><span class="info-label">起讫：</span>' +
                    (startStation || '?') + ' → ' + (endStation || '?') + '</p>';
        }
        if (stime || etime) {
            html += '<p><span class="info-label">运营：</span>' + (stime || '?') + ' — ' + (etime || '?') + '</p>';
        }
        if (price) {
            html += '<p><span class="info-label">票价：</span>' + price + '元</p>';
        }
        html += '<p><span class="info-label">分类：</span><span style="color:' + catColor + '">' +
                catLabel + '</span></p>';

        // 站点列表
        if (stops && stops.length) {
            html += '<div class="station-list">';
            html += '<span class="info-label">站点列表（' + stops.length + '站）：</span><br>';
            stops.forEach(function (stop, idx) {
                var stopName = U.escapeHtml(stop.name || '');
                if (stopName) {
                    html += '<span class="station-item">' +
                            (idx + 1) + '. ' + stopName + '</span>';
                }
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    /**
     * 移动端快速查询单条线路
     */
    Search.searchSingle = function (lineKeyword) {
        if (!lineKeyword || !lineKeyword.trim()) {
            HNBus.Utils.showToast('请输入线路号码', 'warning');
            return;
        }

        // 通过 UI 模块处理（UI 已处理移动输入）
        Search.execute();
    };

    /**
     * 检查所有搜索是否完成
     */
    Search._checkComplete = function () {
        if (_pendingCount <= 0) {
            HNBus.UI.setSearchLoading(false);
            HNBus.UI.hideLoading();
            HNBus.Map.fitView();

            var failedCount = _failedLines.length;
            var filteredCount = _filteredLines.length;
            var successCount = _totalCount - failedCount - filteredCount;

            if (successCount === 0 && _totalCount > 0) {
                var msg = '未找到匹配的公交线路';
                if (_failedLines.length > 0) {
                    msg += '，失败: ' + _failedLines.slice(0, 8).join('、');
                    if (_failedLines.length > 8) msg += '等' + _failedLines.length + '条';
                }
                HNBus.Utils.showToast(msg, 'error', 5000);
            } else if (failedCount > 0 || filteredCount > 0) {
                var parts = ['成功 ' + successCount + ' 条'];
                if (failedCount > 0) {
                    parts.push('失败: ' + _failedLines.slice(0, 5).join('、'));
                    if (_failedLines.length > 5) parts[parts.length - 1] += '等' + _failedLines.length + '条';
                }
                if (filteredCount > 0) {
                    parts.push('境外过滤: ' + _filteredLines.slice(0, 3).join('、'));
                    if (_filteredLines.length > 3) parts[parts.length - 1] += '等' + _filteredLines.length + '条';
                }
                HNBus.Utils.showToast(parts.join('，'), 'warning', 6000);
            } else {
                HNBus.Utils.showToast('成功查询 ' + successCount + ' 条线路', 'success');
            }

            // 显示图例
            HNBus.Map.createLegend();
        }
    };

    // 导出
    HNBus.Search = Search;
    window.HNBus = HNBus;
})();
