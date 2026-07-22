/**
 * 搜索编排模块
 * 并行搜索多类别线路、处理回调、修复原有 bug
 */
(function () {
    var HNBus = window.HNBus || {};
    var Search = {};

    var _pendingCount = 0;
    var _totalCount = 0;
    var _errorCount = 0;

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
        _errorCount = 0;

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
                        Search._handleResult(result, item.category);
                    } else {
                        _errorCount++;
                        console.warn('查询失败: ' + item.display, result);
                    }
                    _pendingCount--;
                    Search._checkComplete();
                });
            });
        } catch (e) {
            console.error('创建搜索失败:', e);
            _errorCount += lines.length;
            _pendingCount -= lines.length;
            Search._checkComplete();
        }
    };

    /**
     * 处理搜索结果
     * 始终只取第一条结果，避免显示多条无关线路
     * 同时过滤在海宁行政区划以外的错误线路
     */
    Search._handleResult = function (data, category) {
        var lineArr = data.lineInfo;
        if (!lineArr || !lineArr.length) return;

        // 始终只取第一条结果（与高德 LineSearch 返回的最佳匹配）
        var lineInfo = lineArr[0];
        var pathArr = lineInfo.path;
        var stops = lineInfo.via_stops;

        if (!pathArr || !pathArr.length) return;

        // 检查线路是否有站点/路径在海宁境内，过滤嘉兴其他地区的错误线路
        if (!HNBus.Map.hasPointInHaining(pathArr, 0)) {
            console.warn('线路 ' + lineInfo.name + ' 不在海宁境内，已过滤');
            _errorCount++;
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

            var successCount = _totalCount - _errorCount;

            if (successCount === 0 && _totalCount > 0) {
                HNBus.Utils.showToast('未找到匹配的公交线路，请检查线路号码', 'error');
            } else if (_errorCount > 0) {
                HNBus.Utils.showToast(
                    '找到 ' + successCount + ' 条线路，' + _errorCount + ' 条查询失败',
                    'warning'
                );
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
