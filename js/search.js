/**
 * 搜索编排模块
 * 并行搜索多类别线路、处理回调、修复原有 bug
 */
(function () {
    var HNBus = window.HNBus || {};
    var Search = {};

    var _pendingCount = 0;
    var _totalCount = 0;
    var _successCount = 0;   // 显式追踪成功绘制的线路
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
        _successCount = 0;
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
                        if (!Search._handleResult(result, item)) {
                            // 高德返回了结果但数据无效（空路径等），走 busApi 兜底
                            Search._fallbackBusApi(item, function (success) {
                                if (success) {
                                    _successCount++;
                                } else {
                                    _failedLines.push(item.display);
                                    console.warn('查询失败(AMap空结果): ' + item.display);
                                }
                                _pendingCount--;
                                Search._checkComplete();
                            });
                            return;
                        }
                        _successCount++;
                        _pendingCount--;
                        Search._checkComplete();
                    } else {
                        // AMap 查询失败，尝试 busApi 兜底（异步）
                        // 注意：_pendingCount 由 fallback 回调管理，不在此处递减
                        Search._fallbackBusApi(item, function (success) {
                            if (success) {
                                _successCount++;
                            } else {
                                _failedLines.push(item.display);
                                console.warn('查询失败: ' + item.display);
                            }
                            _pendingCount--;
                            Search._checkComplete();
                        });
                    }
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
        if (!lineArr || !lineArr.length) return false;

        var category = item.category;

        // 始终只取第一条结果
        var lineInfo = lineArr[0];
        var pathArr = lineInfo.path;
        var stops = lineInfo.via_stops;

        if (!pathArr || !pathArr.length) return false;

        // 海宁境内过滤
        if (!Search._hasStationInHaining(stops)) {
            _filteredLines.push(item.display + '(' + lineInfo.name + ')');
            console.warn('线路 ' + lineInfo.name + ' 不在海宁境内，已过滤');
            return false;
        }

        var color = HNBus.Data.getLineColor(lineInfo.name, category.id);

        // 站点名称列表
        var stopNames = [];
        if (stops) {
            stops.forEach(function (s) { if (s.name) stopNames.push(s.name); });
        }

        // 线路元数据：先用高德数据占位，busApi 数据到达后更新
        var meta = {
            name: lineInfo.name,
            heading: lineInfo.direction || lineInfo.LineHeading || '',
            start: lineInfo.start_stop || '',
            end: lineInfo.end_stop || '',
            stime: lineInfo.stime || '',
            etime: lineInfo.etime || '',
            price: lineInfo.basic_price || '',
            stops: stops || [],
            shiftTimes: [],
            categoryLabel: category.label,
            categoryColor: HNBus.Data.getCategoryColor(category.id),
            source: 'amap'
        };

        // 绘制线路
        HNBus.Map.drawBusLine(pathArr, color, meta);

        // 异步从 busApi 获取首末班+时刻表（轨道交通除外，无 busApi 数据）
        if (category.id !== 'metro') {
            Search._enrichFromBusApi(item, lineInfo, meta);
        }

        return true;
    };

    /**
     * 获取线路的 gprsId（优先使用数据中预存的，否则从名称推算）
     */
    Search._getGprsId = function (item, lineInfo, meta) {
        // 优先使用 busData 中预存的 gprsId
        if (item.gprsId) return String(item.gprsId);

        // 从名称提取线路编号
        var lineNum = HNBus.Utils.extractLineNumber(meta.name);
        if (!lineNum && lineInfo && lineInfo.name) {
            lineNum = HNBus.Utils.extractLineNumber(lineInfo.name);
        }
        if (!lineNum) return null;

        return String(lineNum < 10000 ? parseInt(lineNum + '1', 10) : lineNum);
    };

    /**
     * 从 busApi 获取线路详情（首末班、时刻表）并更新 meta
     */
    Search._enrichFromBusApi = function (item, lineInfo, meta) {
        var gprsId = Search._getGprsId(item, lineInfo, meta);
        if (!gprsId) return;

        // 并行获取线路详情 + 时刻表
        var detailPromise = HNBus.BusApi.fetchBusLineInfo(gprsId);
        var shiftPromise = HNBus.BusApi.fetchBusShiftTimes(gprsId);

        Promise.all([detailPromise, shiftPromise]).then(function (results) {
            var detailData = results[0];
            var times = results[1];

            if (detailData && detailData.Item) {
                var d = detailData.Item;
                // busApi 数据覆盖高德数据
                if (d.LineName)       meta.name = d.LineName;
                if (d.LineHeading)    meta.heading = d.LineHeading;
                if (d.LineStartStation) meta.start = d.LineStartStation;
                if (d.LineEndStation)   meta.end = d.LineEndStation;
                if (d.FirstShift)     meta.stime = d.FirstShift;
                if (d.LastShift)      meta.etime = d.LastShift;
                if (d.BasicPrice)     meta.price = d.BasicPrice;
                meta.source = 'busapi';

                // 用 busApi 站点数据（含坐标）
                if (d.StationList && d.StationList.length) {
                    var busStops = [];
                    d.StationList.forEach(function (s) {
                        if (s.Name) {
                            busStops.push({
                                name: s.Name,
                                lat: s.lat,
                                lng: s.lng,
                                index: s.Index
                            });
                        }
                    });
                    if (busStops.length) meta.stops = busStops;
                }
            }

            if (times && times.length > 0) {
                meta.shiftTimes = times;
            }
        }).catch(function (err) {
            console.warn('busApi 数据获取失败: ' + meta.name, err);
        });
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

            if (_successCount === 0 && _totalCount > 0) {
                var msg = '未找到匹配的公交线路';
                if (_failedLines.length > 0) {
                    msg += '，失败: ' + _failedLines.slice(0, 8).join('、');
                    if (_failedLines.length > 8) msg += '等' + _failedLines.length + '条';
                }
                HNBus.Utils.showToast(msg, 'error', 5000);
            } else if (failedCount > 0 || filteredCount > 0) {
                var parts = ['成功 ' + _successCount + ' 条'];
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
                HNBus.Utils.showToast('成功查询 ' + _successCount + ' 条线路', 'success');
            }

            // 显示图例
            HNBus.Map.createLegend();
        }
    };

    /**
     * AMap 查询失败时通过 busApi 兜底获取站点并绘制
     */
    Search._fallbackBusApi = function (item, callback) {
        var gprsId = Search._getGprsId(item, null, { name: item.display });
        if (!gprsId) {
            callback(false);
            return;
        }

        // 并行获取线路详情 + 时刻表
        Promise.all([
            HNBus.BusApi.fetchBusLineInfo(gprsId),
            HNBus.BusApi.fetchBusShiftTimes(gprsId)
        ]).then(function (results) {
            var data = results[0];
            var times = results[1];

            if (!data || !data.Item || !data.Item.StationList || !data.Item.StationList.length) {
                callback(false);
                return;
            }

            var itemData = data.Item;
            var stations = itemData.StationList;

            // WGS84 → GCJ02 坐标转换，构建路径 + 站点列表
            var pathArr = [];
            var busStops = [];
            for (var i = 0; i < stations.length; i++) {
                var s = stations[i];
                if (s.lat != null && s.lng != null) {
                    var gcj = HNBus.CoordTransform.wgs84ToGcj02(s.lat, s.lng);
                    if (gcj.lat != null && gcj.lng != null) {
                        pathArr.push([gcj.lng, gcj.lat]);
                    }
                }
                if (s.Name) {
                    busStops.push({ name: s.Name, lat: s.lat, lng: s.lng, index: s.Index });
                }
            }

            if (pathArr.length < 2) {
                callback(false);
                return;
            }

            // 海宁境内检查
            var hasInHN = false;
            for (var j = 0; j < pathArr.length; j++) {
                var pt = pathArr[j];
                if (pt[0] >= 120.15 && pt[0] <= 121.05 &&
                    pt[1] >= 30.10 && pt[1] <= 30.65) {
                    hasInHN = true;
                    break;
                }
            }
            if (!hasInHN) {
                _filteredLines.push(item.display + '(' + itemData.LineName + ')');
                callback(false);
                return;
            }

            var category = item.category;
            var color = HNBus.Data.getLineColor(itemData.LineName || item.display, category.id);

            var meta = {
                name: itemData.LineName || item.display,
                heading: itemData.LineHeading || '',
                start: itemData.LineStartStation || '',
                end: itemData.LineEndStation || '',
                stime: itemData.FirstShift || '',
                etime: itemData.LastShift || '',
                price: itemData.BasicPrice || '',
                stops: busStops,
                shiftTimes: times || [],
                categoryLabel: category.label,
                categoryColor: HNBus.Data.getCategoryColor(category.id),
                source: 'busapi'
            };

            HNBus.Map.drawBusLine(pathArr, color, meta);

            console.log('busApi 兜底成功: ' + item.display + ' -> ' + meta.name +
                        ' (' + meta.stime + '-' + meta.etime + ', ' + meta.shiftTimes.length + '班)');
            callback(true);
        }).catch(function (err) {
            console.warn('busApi 兜底失败: ' + item.display, err);
            callback(false);
        });
    };

    // 导出
    HNBus.Search = Search;
    window.HNBus = HNBus;
})();
