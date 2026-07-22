/**
 * 公交线路数据模块
 * 统一数据结构 + 分类规则 + 确定性配色方案（从 hnbus.py 移植）
 */
(function () {
    var HNBus = window.HNBus || {};

    // ---- 分类配色（五大类别）----
    var CATEGORY_COLORS = {
        city:      { base: '#E74C3C', label: '城市公交' },
        rural:     { base: '#8E44AD', label: '城乡公交' },
        community: { base: '#E91E90', label: '社区巴士' },
        intercity: { base: '#2980B9', label: '城际公交' },
        metro:     { base: '#F39C12', label: '轨道交通' },
        other:     { base: '#34495E', label: '其他线路' }
    };

    /**
     * 根据线路编号判断类别
     */
    function classifyLine(num) {
        if (num === null || num === undefined) return 'other';
        // 城市公交: 1-39 + 游X(801+)
        if (num >= 1 && num <= 39) return 'city';
        if (num >= 801 && num <= 899) return 'city';
        // 社区巴士: 10000+
        if (num >= 10000 && num <= 10099) return 'community';
        // 城际公交: 17X/18X/19X + 跨市线路(329/330/388/178/222/492/868/529-531)
        if (num >= 170 && num <= 199) return 'intercity';
        if (num === 329 || num === 330 || num === 388 ||
            num === 178 || num === 222 || num === 492 || num === 868 ||
            (num >= 529 && num <= 531)) return 'intercity';
        // 城乡公交: 100-169, 200-220, 301-359（排除城际的）
        if ((num >= 100 && num <= 169) || (num >= 200 && num <= 220)) return 'rural';
        if (num >= 301 && num <= 359) return 'rural';
        return 'other';
    }

    // ================================================================
    // 线路数据 — 来自 hnbus.py 运行结果 (bus_lines_found.json)
    // 查询 API: zjdyx.cn/WXMP_BusInfo/GetLineDetialByGprsid
    // 扫描日期: 2026-07-22, 共找到 103 条有效线路
    // 四大分类: 城市公交 / 城乡公交 / 社区巴士 / 城际公交
    // ================================================================

    // 城市公交（1-39 实际存在线路 + 游1/游2）
    var cityBuses = [
        { display: '游1', value: '海宁游1路' },
        { display: '3',   value: '海宁3路' },
        { display: '5',   value: '海宁5路' },
        { display: '6',   value: '海宁6路' },
        { display: '7',   value: '海宁7路' },
        { display: '8',   value: '海宁8路' },
        { display: '9',   value: '海宁9路' },
        { display: '11',  value: '海宁11路' },
        { display: '12',  value: '海宁12路' },
        { display: '15',  value: '海宁15路' },
        { display: '16',  value: '海宁16路' },
        { display: '17',  value: '海宁17路' },
        { display: '18',  value: '海宁18路' },
        { display: '19',  value: '海宁19路' },
        { display: '20',  value: '海宁20路' },
        { display: '23',  value: '海宁23路' },
        { display: '25',  value: '海宁25路' },
        { display: '26',  value: '海宁26路' },
        { display: '27',  value: '海宁27路' },
        { display: '29',  value: '海宁29路' },
        { display: '30',  value: '海宁30路' },
        { display: '35',  value: '海宁35路' },
        { display: '36',  value: '海宁36路' },
        { display: '37',  value: '海宁37路' },
        { display: '38',  value: '海宁38路' },
        { display: '39',  value: '海宁39路' },
    ];

    // 城乡公交（100-220 不含 17X/18X/19X + 301-359 乡镇不含 329/330）
    var ruralBuses = [
        { display: '游2', value: '海宁游2' },
        { display: '游3', value: '海宁游3' },
        // 100-220 城乡（已移除 17X/18X/19X 至城际公交）
        { display: '103', value: '海宁103' },
        { display: '105', value: '海宁105' },
        { display: '106', value: '海宁106' },
        { display: '107', value: '海宁107' },
        { display: '108', value: '海宁108' },
        { display: '109', value: '海宁109' },
        { display: '123', value: '海宁123' },
        { display: '128', value: '海宁128' },
        { display: '130', value: '海宁130' },
        { display: '131', value: '海宁131' },
        { display: '202', value: '海宁202' },
        { display: '203', value: '海宁203' },
        { display: '205', value: '海宁205' },
        { display: '206', value: '海宁206' },
        { display: '208', value: '海宁208' },
        { display: '210', value: '海宁210' },
        { display: '212', value: '海宁212' },
        { display: '216', value: '海宁216' },
        { display: '220', value: '海宁220' },
        // 301-359 乡镇（已移除 329/330 至城际公交）
        { display: '302', value: '海宁302' },
        { display: '306', value: '海宁306' },
        { display: '308', value: '海宁308' },
        { display: '309', value: '海宁309' },
        { display: '310', value: '海宁310' },
        { display: '313', value: '海宁313' },
        { display: '318', value: '海宁318' },
        { display: '320', value: '海宁320' },
        { display: '325', value: '海宁325' },
        { display: '333', value: '海宁333' }
    ];

    // 社区巴士（API 实际名称，10000-10099）
    var communityBuses = [
        { display: '尖山6',     value: '尖山6号线' },
        { display: '许村1',     value: '许村1' },
        { display: '许村6',     value: '许村6' },
        { display: '许村2',     value: '许村2' },
        { display: '许村2支',   value: '许村2支' },
        { display: '周王庙1',   value: '周王庙1号线' },
        { display: '盐仓5A',    value: '盐仓5A' },
        { display: '盐仓5B',    value: '盐仓5B' },
        { display: '盐仓5C',    value: '盐仓5C' },
        { display: '盐仓1',     value: '盐仓1' },
        { display: '盐仓2',     value: '盐仓2' },
        { display: '盐仓3',     value: '盐仓3' },
        { display: '许村3',     value: '许村3' },
        { display: '许村4',     value: '许村4' },
        { display: '长安5',     value: '长安5' },
        { display: '盐官1',     value: '盐官1' },
        { display: '盐官3',     value: '盐官3' },
        { display: '许村5',     value: '许村5' },
        { display: '许村5支',   value: '许村5支' },
        { display: '长安-西站', value: '长安-火车西站社巴专线' },
        { display: '许村2支2',  value: '许村2支2' },
        { display: '长安4',     value: '长安4' },
        { display: '袁花1',     value: '袁花1' },
        { display: '袁花2',     value: '袁花2' },
        { display: '袁花3',     value: '袁花3' },
        { display: '袁花4',     value: '袁花4' },
        { display: '袁花5',     value: '袁花5' },
        { display: '周王庙2',   value: '周王庙2号线' },
        { display: '周王庙3',   value: '周王庙3号线' },
        { display: '丁桥1',     value: '丁桥1' },
        { display: '斜桥1',     value: '斜桥1' },
        { display: '斜桥2',     value: '斜桥2' },
        { display: '斜桥3',     value: '斜桥3' },
        { display: '经开1号',   value: '经开1号快线' },
        { display: '经开2号',   value: '经开2号快线' },
        { display: '经开3号',   value: '经开3号快线' }
    ];

    // 城际公交（17X/18X/19X + 329/330/388 + 跨市县线路 + 杭海城际）
    var intercityBuses = [
        // 17X/18X/19X（嘉兴/海盐/桐乡 ↔ 海宁，来自 interBuses）
        { display: 'G4', value: 'G4' },
        { display: 'G5', value: 'G5' },
        { display: 'G6', value: 'G6' },
        { display: '181',      value: 'K181' },
        { display: '185',      value: '海盐K185' },
        { display: '186',      value: 'K186' },
        { display: '187',      value: 'K187' },
        { display: '198',      value: 'K198' },
        // 329/330（桐乡 ↔ 海宁，来自 townBuses）
        { display: '桐乡329',  value: 'K329' },
        { display: '桐乡330',  value: 'K330' },
        // 388（桐乡 ↔ 海宁，hnbus.py [388]）
        { display: '桐乡388',  value: 'K388' },
        // 跨市县专线（临平/杭州/海盐/海宁）
        { display: '海盐178',  value: '海盐K178路' },
        { display: '海盐222',  value: '海盐K222路' },
        { display: '临盐线',   value: '临平-盐仓专线' },
        { display: '临长线1',  value: '530路' },
        { display: '九长线',   value: '九堡-长安专线' },
        { display: '下盐线',   value: '868路/K868路区间' },
        { display: '财长线',   value: '868路/K868路(学院线)' },
        { display: '艮盐线',   value: '艮山门东至盐仓专线' },
        { display: '杭州492',  value: '492路' },
        { display: '杭州3101', value: '3101路' },
        { display: '杭州3148', value: '3148路' },
        { display: '杭州3185', value: '3185M路' },
    ];

    // 轨道交通（单列）
    var metro = [
        { display: '杭海城际', value: '杭海城际铁路' }
    ];

    // ---- 五大分类 ----
    var categories = [
        {
            id: 'city',
            label: '城市公交',
            searchCity: '嘉兴',
            searchPrefix: '海宁',
            buses: cityBuses
        },
        {
            id: 'rural',
            label: '城乡公交',
            searchCity: '嘉兴',
            searchPrefix: '',
            buses: ruralBuses
        },
        {
            id: 'community',
            label: '社区巴士',
            searchCity: '嘉兴',
            searchPrefix: '',
            buses: communityBuses
        },
        {
            id: 'intercity',
            label: '城际公交',
            searchCity: '嘉兴',
            searchPrefix: '',
            buses: intercityBuses
        },
        {
            id: 'metro',
            label: '轨道交通',
            searchCity: '杭州',
            searchPrefix: '',
            buses: metro
        }
    ];

    /**
     * 获取类别配色
     */

    function getCategoryColor(categoryId) {
        var cat = CATEGORY_COLORS[categoryId];
        return cat ? cat.base : CATEGORY_COLORS.other.base;
    }

    /**
     * 获取线路的颜色 — 每条线路独立色相，全 HSL 色轮分布
     * 线路名 hash → 0~360 色相，确保每条线颜色不同
     * 暗黑地图适配：高饱和度 + 中等亮度
     */
    function getLineColor(lineName, categoryId) {
        categoryId = categoryId || classifyLine(HNBus.Utils ? HNBus.Utils.extractLineNumber(lineName) : null);
        var hashVal = HNBus.Utils ? HNBus.Utils.hashString(lineName || '') : 0;

        // 全色轮分布：每条线路独立色相 0~360
        var hue = hashVal % 360;

        // 类别影响饱和度，同类别线颜色有一定关联（但不影响色相）
        var satByCat = { city: 78, rural: 82, community: 75, intercity: 85, metro: 90, other: 70 };
        var litByCat = { city: 52, rural: 50, community: 54, intercity: 48, metro: 55, other: 50 };

        var s = satByCat[categoryId] || 78;
        var l = litByCat[categoryId] || 52;

        // HSL → hex
        var c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
        var x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        var m = l / 100 - c / 2;
        var r1, g1, b1;

        if (hue < 60)      { r1 = c; g1 = x; b1 = 0; }
        else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
        else if (hue < 180) { r1 = 0; g1 = c; b1 = x; }
        else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
        else if (hue < 300) { r1 = x; g1 = 0; b1 = c; }
        else                { r1 = c; g1 = 0; b1 = x; }

        var r = Math.round((r1 + m) * 255);
        var g = Math.round((g1 + m) * 255);
        var b = Math.round((b1 + m) * 255);

        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // 导出
    HNBus.Data = {
        CATEGORY_COLORS: CATEGORY_COLORS,
        categories: categories,
        classifyLine: classifyLine,
        getCategoryColor: getCategoryColor,
        getLineColor: getLineColor
    };

    window.HNBus = HNBus;
})();
