/**
 * 地图模块
 * 高德地图初始化、边界绘制、线路绘制、热力图、图例
 */
(function () {
    var HNBus = window.HNBus || {};
    var MapMod = {};

    var _map = null;           // AMap 实例
    var _district = null;      // 行政区搜索
    var _boundaryPolygon = null; // 边界多边形
    var _drawnPolylines = [];  // 已绘制的线路
    var _infoWindows = [];     // 已打开的信息窗体
    var _legendContainer = null; // 图例 DOM
    var _categoryVisibility = {}; // 各类别可见性
    var _hainingBounds = null;   // 海宁边界坐标（用于过滤外部线路）
    // 海宁近似 bounding box，作为边界数据未加载时的 fallback
    var _hainingBBox = {
        minLng: 120.15, maxLng: 121.05,
        minLat: 30.10,  maxLat: 30.65
    };

    /**
     * 动态加载高德地图 SDK
     * @param {string} key - API Key
     * @returns {Promise}
     */
    MapMod.loadSDK = function (key) {
        return new Promise(function (resolve, reject) {
            // 检查是否已加载
            if (window.AMap && window.AMap.LineSearch) {
                resolve(window.AMap);
                return;
            }

            var timeout = setTimeout(function () {
                reject(new Error('地图 SDK 加载超时，请检查网络或 API Key'));
            }, 15000);

            var script = document.createElement('script');
            script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key) +
                         '&plugin=AMap.LineSearch,AMap.DistrictSearch';
            script.onload = function () {
                clearTimeout(timeout);
                resolve(window.AMap);
            };
            script.onerror = function () {
                clearTimeout(timeout);
                reject(new Error('地图 SDK 加载失败，请检查 API Key 是否正确'));
            };
            document.head.appendChild(script);
        });
    };

    /**
     * 初始化地图
     */
    MapMod.init = function (containerId) {
        containerId = containerId || 'container';
        var cfg = window.APP_CONFIG || {};
        try {
            _map = new AMap.Map(containerId, {
                resizeEnable: true,
                mapStyle: cfg.mapStyle || 'amap://styles/macaron',
                features: ['bg', 'road', 'point'],
                center: cfg.mapCenter || [120.6803, 30.5115],
                zoom: cfg.mapZoom || 13
            });
            return _map;
        } catch (e) {
            console.error('地图初始化失败:', e);
            return null;
        }
    };

    /** 获取地图实例 */
    MapMod.getMap = function () { return _map; };

    /**
     * 绘制海宁市行政边界
     */
    MapMod.drawDistrict = function (cityName) {
        cityName = cityName || '海宁市';
        if (!_map) return;

        try {
            if (!_district) {
                _district = new AMap.DistrictSearch({
                    subdistrict: 0,
                    extensions: 'all',
                    level: 'district'
                });
            }

            _district.search(cityName, function (status, result) {
                if (status !== 'complete' || !result.districtList || !result.districtList.length) {
                    console.warn('行政区划查询失败:', status);
                    return;
                }

                // 清理旧边界
                if (_boundaryPolygon) {
                    _map.remove(_boundaryPolygon);
                    _boundaryPolygon = null;
                }

                var bounds = result.districtList[0].boundaries;
                if (bounds && bounds.length) {
                    // 存储原始边界数据，用于判断线路是否在海宁境内
                    _hainingBounds = bounds;
                    for (var i = 0; i < bounds.length; i++) {
                        bounds[i] = [bounds[i]];
                    }
                    _boundaryPolygon = new AMap.Polygon({
                        strokeWeight: 1.5,
                        path: bounds,
                        fillOpacity: 0.08,
                        fillColor: '#00d4ff',
                        strokeColor: '#00d4ff'
                    });
                    _map.add(_boundaryPolygon);
                }
            });
        } catch (e) {
            console.warn('绘制边界失败:', e);
        }
    };

    /**
     * 绘制公交线路
     * @param {Array} pathArr - 路径坐标数组
     * @param {string} color - 线路颜色
     * @param {object} lineMeta - 线路元数据（用于点击显示详情）
     * @returns {AMap.Polyline}
     */
    MapMod.drawBusLine = function (pathArr, color, lineMeta) {
        if (!_map || !pathArr || !pathArr.length) return null;

        try {
            var polyline = new AMap.Polyline({
                map: _map,
                path: pathArr,
                strokeColor: color || '#34495E',
                strokeOpacity: 0.9,
                isOutline: true,
                outlineColor: '#1a1a2e',
                strokeWeight: 3,
                cursor: 'pointer'
            });
            _drawnPolylines.push(polyline);

            // 存储元数据并绑定点击事件
            if (lineMeta) {
                polyline._hnbusMeta = lineMeta;
                polyline.on('click', function (e) {
                    MapMod._showLineDetail(polyline, e);
                });
                // hover 时加粗
                polyline.on('mouseover', function () {
                    polyline.setOptions({ strokeWeight: 5 });
                });
                polyline.on('mouseout', function () {
                    polyline.setOptions({ strokeWeight: 3 });
                });
            }

            return polyline;
        } catch (e) {
            console.warn('绘制线路失败:', e);
            return null;
        }
    };

    /**
     * 点击线路时显示详情信息窗
     */
    MapMod._showLineDetail = function (polyline, event) {
        var meta = polyline._hnbusMeta;
        if (!meta) return;

        // 关闭之前的信息窗
        _infoWindows.forEach(function (iw) {
            try { iw.close(); } catch (e) {}
        });
        _infoWindows = [];

        var content = MapMod._buildDetailHTML(meta);
        var pos = event.lnglat;
        var infoWindow = new AMap.InfoWindow({
            content: content,
            offset: new AMap.Pixel(0, -10),
            isCustom: false
        });
        infoWindow.open(_map, pos);
        _infoWindows.push(infoWindow);
    };

    /**
     * 构建线路详情 HTML（busApi 首末班 + 完整时刻表 + 站点列表）
     */
    MapMod._buildDetailHTML = function (meta) {
        var U = HNBus.Utils;
        var name = U.escapeHtml(meta.name || '未知线路');
        var direction = U.escapeHtml(meta.heading || meta.direction || '');
        var startStation = U.escapeHtml(meta.start || meta.startStation || '');
        var endStation = U.escapeHtml(meta.end || meta.endStation || '');
        var stime = U.escapeHtml(meta.stime || '');  // busApi 的 FirstShift
        var etime = U.escapeHtml(meta.etime || '');  // busApi 的 LastShift
        var price = U.escapeHtml(meta.price || '');
        var catLabel = U.escapeHtml(meta.categoryLabel || '');
        var catColor = meta.categoryColor || '#2980B9';
        var shiftTimes = meta.shiftTimes || [];
        var stops = meta.stops || [];
        var source = meta.source || '';

        // 标题行：线路名(起讫)
        var titleName = name;
        if (startStation && endStation) {
            titleName = name + '(' + startStation + '--' + endStation + ')';
        }

        var html = '<div class="info-window-content" style="max-width:340px;max-height:420px;overflow-y:auto;">';
        html += '<h3 style="border-left:3px solid ' + catColor + ';padding-left:6px;margin-bottom:6px;">' +
                titleName + '</h3>';

        if (direction) {
            html += '<p><span class="info-label">方向：</span>' + direction + '</p>';
        }
        if (startStation || endStation) {
            html += '<p><span class="info-label">起讫：</span>' +
                    (startStation || '?') + ' → ' + (endStation || '?') + '</p>';
        }

        // 首末班（来自 busApi）
        if (stime || etime) {
            html += '<p><span class="info-label">首班：</span>' + (stime || '?') +
                    '　<span class="info-label">末班：</span>' + (etime || '?') + '</p>';
        }

        if (price) {
            html += '<p><span class="info-label">票价：</span>' + price + '元</p>';
        }
        html += '<p><span class="info-label">分类：</span><span style="color:' + catColor + '">' +
                catLabel + '</span>';
        if (source === 'busapi') {
            html += ' <span style="color:#999;font-size:0.7rem;">(实时数据)</span>';
        }
        html += '</p>';

        // 发车时刻表（完整列表）
        if (shiftTimes && shiftTimes.length > 0) {
            html += '<div class="station-list" style="margin-top:6px;">' +
                    '<span class="info-label">发车时刻（' + shiftTimes.length + '班）：</span><br>';
            var shown = shiftTimes.slice(0, 36);
            shown.forEach(function (t) {
                html += '<span class="station-item">' + U.escapeHtml(String(t)) + '</span>';
            });
            if (shiftTimes.length > 36) {
                html += '<span class="station-item">...等' + shiftTimes.length + '班</span>';
            }
            html += '</div>';
        } else if (stime && etime) {
            // 无时刻表但有首末班：提示
            html += '<p style="color:#999;font-size:0.75rem;margin:4px 0;">时刻表加载中...</p>';
        }

        // 站点列表
        if (stops && stops.length > 0) {
            html += '<div class="station-list" style="margin-top:6px;">' +
                    '<span class="info-label">站点（' + stops.length + '站）：</span><br>';
            stops.forEach(function (stop, idx) {
                var stopName = '';
                if (typeof stop === 'string') {
                    stopName = stop;
                } else if (stop.name) {
                    stopName = stop.name;
                }
                if (stopName) {
                    html += '<span class="station-item">' + (idx + 1) + '.' +
                            U.escapeHtml(stopName) + '</span>';
                }
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    /**
     * 显示信息窗体
     * @param {string} content - HTML 内容
     * @param {Array} position - [lng, lat]
     */
    MapMod.showInfoWindow = function (content, position) {
        if (!_map) return;

        try {
            var infoWindow = new AMap.InfoWindow({
                content: content,
                offset: new AMap.Pixel(0, -5)
            });
            infoWindow.open(_map, position);
            _infoWindows.push(infoWindow);
            return infoWindow;
        } catch (e) {
            console.warn('显示信息窗失败:', e);
            return null;
        }
    };

    /**
     * 清除所有线路和信息窗（保留边界）
     */
    MapMod.clearLines = function () {
        if (!_map) return;

        // 清除线路
        _drawnPolylines.forEach(function (p) {
            try { _map.remove(p); } catch (e) {}
        });
        _drawnPolylines = [];

        // 清除信息窗
        _infoWindows.forEach(function (iw) {
            try { iw.close(); } catch (e) {}
        });
        _infoWindows = [];
    };

    /**
     * 适应视野
     */
    MapMod.fitView = function () {
        if (_map) {
            try { _map.setFitView(null, false, [60, 60, 60, 60]); } catch (e) {}
        }
    };

    /**
     * 创建/更新地图图例（从 hnbus.py 的 legend_html 移植）
     */
    MapMod.createLegend = function () {
        if (_legendContainer) {
            _legendContainer.style.display = 'block';
            return _legendContainer;
        }

        var categories = HNBus.Data.CATEGORY_COLORS;
        var html = '<div class="legend-title">图例 (点击切换)</div>';

        Object.keys(categories).forEach(function (key) {
            if (key === 'other') return; // 跳过"其他线路"
            var cat = categories[key];
            html += '<div class="legend-item" data-category="' + key + '">' +
                    '<span class="legend-color" style="background-color:' + cat.base + '"></span>' +
                    '<span class="legend-text">' + cat.label + '</span>' +
                    '</div>';
        });

        var legend = document.createElement('div');
        legend.className = 'map-legend';
        legend.innerHTML = html;
        document.body.appendChild(legend);

        // 点击事件委托
        legend.addEventListener('click', function (e) {
            var item = e.target.closest('.legend-item');
            if (!item) return;

            var category = item.getAttribute('data-category');
            var isActive = !item.classList.contains('inactive');

            if (isActive) {
                item.classList.add('inactive');
                _categoryVisibility[category] = false;
            } else {
                item.classList.remove('inactive');
                _categoryVisibility[category] = true;
            }

            MapMod.updateLineVisibility(category, !isActive);
        });

        _legendContainer = legend;
        return legend;
    };

    /**
     * 更新线路可见性
     */
    MapMod.updateLineVisibility = function (category, show) {
        if (!HNBus.Data) return;

        var color = HNBus.Data.getCategoryColor(category);
        if (!color) return;

        _drawnPolylines.forEach(function (polyline) {
            try {
                var strokeColor = polyline.getOptions().strokeColor;
                // 匹配同类颜色（考虑 HSL 微调）
                // 简化处理：比较基色
                if (MapMod._colorsSimilar(strokeColor, color, 30)) {
                    if (show) {
                        polyline.show();
                    } else {
                        polyline.hide();
                    }
                }
            } catch (e) {}
        });
    };

    /**
     * 判断两个颜色是否相似（容忍度 ±tolerance 度色相）
     */
    MapMod._colorsSimilar = function (c1, c2, tolerance) {
        if (c1 === c2) return true;
        // 简化处理：对于同一类别，所有线路颜色应落在同一范围内
        // 这里使用 RGB 通道距离
        var r1 = parseInt(c1.slice(1, 3), 16);
        var g1 = parseInt(c1.slice(3, 5), 16);
        var b1 = parseInt(c1.slice(5, 7), 16);
        var r2 = parseInt(c2.slice(1, 3), 16);
        var g2 = parseInt(c2.slice(3, 5), 16);
        var b2 = parseInt(c2.slice(5, 7), 16);

        var dist = Math.sqrt(
            Math.pow(r1 - r2, 2) +
            Math.pow(g1 - g2, 2) +
            Math.pow(b1 - b2, 2)
        );
        return dist < (tolerance * 3);
    };

    /**
     * 隐藏图例
     */
    MapMod.hideLegend = function () {
        if (_legendContainer) {
            _legendContainer.style.display = 'none';
        }
    };

    /**
     * 从路径点中提取 lng/lat（兼容多种坐标格式）
     * AMap 可能返回 {lng, lat}、{L, N}、[lng, lat] 等格式
     */
    function _extractCoord(pt) {
        if (!pt) return null;
        // 对象格式 {lng, lat} 或 {L, N}（高德内部格式）
        var lng = pt.lng != null ? pt.lng : (pt.L != null ? pt.L : null);
        var lat = pt.lat != null ? pt.lat : (pt.N != null ? pt.N : null);
        // 数组格式 [lng, lat]
        if ((lng == null || lat == null) && Array.isArray(pt) && pt.length >= 2) {
            lng = pt[0];
            lat = pt[1];
        }
        if (lng == null || lat == null) return null;
        return { lng: Number(lng), lat: Number(lat) };
    }

    /**
     * 判断一个点是否在海宁境内
     * 优先使用行政区划精确边界，fallback 使用 bounding box
     * @param {number} lng - 经度
     * @param {number} lat - 纬度
     * @returns {boolean}
     */
    MapMod.isInHaining = function (lng, lat) {
        if (lng == null || lat == null) return false;

        // 先用 bounding box 快速排除（放宽范围，涵盖城际线路的边界区域）
        if (lng < _hainingBBox.minLng || lng > _hainingBBox.maxLng ||
            lat < _hainingBBox.minLat || lat > _hainingBBox.maxLat) {
            return false;
        }

        // 如果有精确边界数据，使用射线法判断
        if (_hainingBounds && _hainingBounds.length) {
            return _pointInPolygonRings(lng, lat, _hainingBounds);
        }

        // fallback：在 bounding box 内就认为有效
        return true;
    };

    /**
     * 检查一条线路的路径是否有落在海宁境内的点
     * 兼容 AMap 返回的多种坐标格式
     * @param {Array} pathArr - 路径坐标
     * @param {number} minRatio - 最少比例 (0~1)，默认只要有 1 个点即可
     * @returns {boolean}
     */
    MapMod.hasPointInHaining = function (pathArr, minRatio) {
        if (!pathArr || !pathArr.length) return false;
        minRatio = minRatio || 0;

        var inside = 0;
        var totalParsed = 0;
        for (var i = 0; i < pathArr.length; i++) {
            var coord = _extractCoord(pathArr[i]);
            if (coord) {
                totalParsed++;
                if (MapMod.isInHaining(coord.lng, coord.lat)) {
                    inside++;
                }
            }
        }

        // 安全兜底：如果一个坐标都解析不出来，不要过滤（可能是不认识的格式）
        if (totalParsed === 0) return true;

        if (minRatio > 0) {
            return (inside / totalParsed) >= minRatio;
        }
        return inside > 0;
    };

    /**
     * 射线法判断点是否在多边形环内
     */
    function _pointInPolygonRings(lng, lat, rings) {
        for (var r = 0; r < rings.length; r++) {
            var ring = rings[r];
            // rings[r] 可能是字符串 "lng,lat;lng,lat;..." 格式
            if (typeof ring === 'string') {
                if (_pointInPolygonString(lng, lat, ring)) return true;
            } else if (Array.isArray(ring)) {
                // 数组格式 [[lng,lat], ...]
                if (_pointInPolygonArray(lng, lat, ring)) return true;
            }
        }
        return false;
    }

    function _pointInPolygonString(lng, lat, ringStr) {
        var points = ringStr.split(';');
        var inside = false;
        var n = points.length;
        for (var i = 0, j = n - 1; i < n; j = i++) {
            var pi = points[i].split(',');
            var pj = points[j].split(',');
            var xi = parseFloat(pi[0]), yi = parseFloat(pi[1]);
            var xj = parseFloat(pj[0]), yj = parseFloat(pj[1]);

            if ((yi > lat) !== (yj > lat) &&
                lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    function _pointInPolygonArray(lng, lat, ring) {
        var inside = false;
        var n = ring.length;
        for (var i = 0, j = n - 1; i < n; j = i++) {
            var xi = ring[i][0], yi = ring[i][1];
            var xj = ring[j][0], yj = ring[j][1];

            if ((yi > lat) !== (yj > lat) &&
                lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    // 导出
    HNBus.Map = MapMod;
    window.HNBus = HNBus;
})();
