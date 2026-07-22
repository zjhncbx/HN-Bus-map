/**
 * 公交线路数据模块
 * 统一数据结构 + 分类规则 + 确定性配色方案（从 hnbus.py 移植）
 */
(function () {
    var HNBus = window.HNBus || {};

    // ---- 分类配色（来自 hnbus.py get_line_color）----
    var CATEGORY_COLORS = {
        city:        { base: '#E74C3C', label: '城市公交',     class: 'city' },
        intercity:   { base: '#8E44AD', label: '城乡城际公交', class: 'intercity' },
        crosscounty: { base: '#2980B9', label: '县际公交',     class: 'crosscounty' },
        town:        { base: '#27AE60', label: '乡镇公交',     class: 'town' },
        community:   { base: '#E91E90', label: '社区巴士',     class: 'community' },
        metro:       { base: '#F39C12', label: '轨道交通',     class: 'metro' },
        other:       { base: '#34495E', label: '其他线路',     class: 'other' }
    };

    /**
     * 根据线路编号判断类别（来自 hnbus.py LINE_RANGES）
     */
    function classifyLine(num) {
        if (num === null || num === undefined) return 'other';
        if (num >= 1 && num <= 39) return 'city';
        if ((num >= 100 && num <= 149) || (num >= 200 && num <= 220)) return 'intercity';
        if (num >= 150 && num <= 199) return 'crosscounty';
        if (num >= 301 && num <= 339) return 'town';
        if (num >= 10000 && num <= 10099) return 'community';
        // 游X → 801+
        if (num >= 801 && num <= 899) return 'city';
        // 868, 530, 531, 492 等 → intercity
        if (num >= 500 && num <= 599) return 'intercity';
        if (num === 868 || num === 388 || num === 492 || num === 329 || num === 178 || num === 222) return 'crosscounty';
        return 'other';
    }

    // ---- 线路数据 ----
    var cityBuses = [
        { display: '游1', value: '游1路' },
        { display: '2',   value: '海宁2路' },
        { display: '3',   value: '海宁3路' },
        { display: '5',   value: '海宁5路' },
        { display: '6',   value: '海宁6路' },
        { display: '7',   value: '海宁7路' },
        { display: '8',   value: '海宁8路' },
        { display: '9',   value: '海宁9路' },
        { display: '10',  value: '海宁10路' },
        { display: '11',  value: '海宁11路' },
        { display: '12',  value: '海宁12路' },
        { display: '15',  value: '海宁15路' },
        { display: '16',  value: '海宁16路' },
        { display: '17',  value: '海宁17路' },
        { display: '18',  value: '海宁18路' },
        { display: '19',  value: '海宁19路' },
        { display: '20',  value: '海宁20路' },
        { display: '22',  value: '海宁22路' },
        { display: '23',  value: '海宁23路' },
        { display: '25',  value: '海宁25路' },
        { display: '26',  value: '海宁26路' },
        { display: '27',  value: '海宁27路' },
        { display: '28',  value: '海宁28路' },
        { display: '29',  value: '海宁29路' },
        { display: '30',  value: '海宁30路' },
        { display: '31',  value: '海宁31路' },
        { display: '35',  value: '海宁35路' },
        { display: '36',  value: '海宁36路' },
        { display: '37',  value: '海宁37路' },
        { display: '38',  value: '海宁38路' },
        { display: '39',  value: '海宁39路' },
        { display: '91',  value: '海宁91路' },
        { display: '92',  value: '海宁92路' },
        { display: '93',  value: '海宁93路' },
        { display: '96',  value: '海宁96路' },
        { display: '97',  value: '海宁97路' },
        { display: '99',  value: '海宁99路' },
        { display: '918', value: '海宁918路' },
        { display: '922', value: '海宁922路' }
    ];

    var interBuses = [
        { display: '101', value: '101' },
        { display: '103', value: '103' },
        { display: '105', value: '105' },
        { display: '106', value: '106' },
        { display: '107', value: '107' },
        { display: '108', value: '108' },
        { display: '109', value: '109' },
        { display: '113', value: '113' },
        { display: '123', value: '123' },
        { display: '128', value: '128' },
        { display: '130', value: '130' },
        { display: '131', value: '131' },
        { display: '181', value: '181' },
        { display: '185', value: '185' },
        { display: '187', value: '187' },
        { display: '189', value: '189路/K189路' },
        { display: '198', value: '198' },
        { display: '202', value: '202' },
        { display: '203', value: '203' },
        { display: '205', value: '205' },
        { display: '206', value: '206' },
        { display: '208', value: '208' },
        { display: '210', value: '210' },
        { display: '212', value: '212' },
        { display: '216', value: '216' },
        { display: '218', value: '218' },
        { display: '220', value: '220' },
        { display: '222', value: '222' },
        { display: '225', value: '225' },
        { display: '301', value: '301' },
        { display: '302', value: '302' },
        { display: '305', value: '305' },
        { display: '306', value: '306' },
        { display: '308', value: '308' },
        { display: '309', value: '309' },
        { display: '310', value: '310' },
        { display: '311', value: '311' },
        { display: '312', value: '312' },
        { display: '313', value: '313' },
        { display: '316东', value: '316路东线' },
        { display: '316西', value: '316路西线' },
        { display: '317', value: '317' },
        { display: '318', value: '318' },
        { display: '319', value: '319' },
        { display: '320', value: '320' },
        { display: '325', value: '325' },
        { display: '326', value: '326' },
        { display: '330', value: '330' },
        { display: '331', value: '331' },
        { display: '332', value: '332' },
        { display: '333', value: '333' },
        { display: '351', value: '351' },
        { display: '353', value: '353' },
        { display: '388', value: '桐乡K388' },
        { display: '游2', value: '游2' },
        { display: '游3', value: '游3' },
        { display: '临盐线', value: '临平-盐仓专线' },
        { display: '临长线1', value: '530' },
        { display: '临长线2', value: '531' },
        { display: '九长线', value: '九堡-长安专线' },
        { display: '下盐线', value: '868路/K868路区间' },
        { display: '财长线', value: '868路/K868路(学院线)' },
        { display: '海盐178', value: '海盐K178路' },
        { display: '海盐222', value: '海盐K222路' },
        { display: '桐乡329', value: '桐乡K329路' },
        { display: '杭州492', value: '492路' },
        { display: '艮盐线', value: '艮山门东至盐仓专线' },
        { display: '杭州3101', value: '3101路' },
        { display: '杭州3148', value: '3148路' },
        { display: '杭州3185', value: '3185M路' }
    ];

    var communityBuses = [
        { display: '长安1', value: '长安社区巴士1号线' },
        { display: '长安2', value: '长安社区巴士2号线' },
        { display: '长安4', value: '长安社区巴士4号线' },
        { display: '长安5', value: '长安社区巴士5号线' },
        { display: '长安6', value: '长安社区巴士6号线' },
        { display: '长安-西站', value: '长安-海宁火车西站' },
        { display: '盐仓1', value: '社区巴士盐仓1号线' },
        { display: '盐仓2', value: '盐仓社区巴士2号线' },
        { display: '盐仓2B', value: '盐仓社区巴士2B号线' },
        { display: '盐仓3', value: '盐仓社区巴士3号线' },
        { display: '盐仓5', value: '高新区社区巴士5号线' },
        { display: '盐仓5支', value: '高新区社区巴士5号线支线' },
        { display: '许村1', value: '许村社区巴士1号线' },
        { display: '许村2', value: '许村社区巴士2号线' },
        { display: '许村3', value: '许村社区巴士3号线' },
        { display: '许村4', value: '许村社区巴士4号线' },
        { display: '许村5', value: '许村社区巴士5号线' },
        { display: '许村Y1', value: '许村社区巴士Y1号线' },
        { display: '袁花1', value: '袁花社区巴士1号线' },
        { display: '袁花2', value: '袁花社区巴士2号线' },
        { display: '袁花3', value: '袁花社区巴士3号线' },
        { display: '袁花4', value: '袁花社区巴士4号线' },
        { display: '袁花5', value: '袁花社区巴士5号线' },
        { display: '尖山1', value: '尖山社区巴士1号线' },
        { display: '尖山5', value: '尖山社区巴士5号线' },
        { display: '尖山6', value: '尖山社区巴士6号线' },
        { display: '尖山7', value: '尖山社区巴士7号线' },
        { display: '盐官1', value: '盐官社区巴士1号线' },
        { display: '盐官2', value: '盐官社区巴士2号线' },
        { display: '盐官3', value: '盐官社区巴士3号线' },
        { display: '周王庙1', value: '周王庙社区巴士1号线' },
        { display: '周王庙2', value: '周王庙社区巴士2号线' },
        { display: '周王庙3', value: '周王庙社区巴士3号线' },
        { display: '斜桥1', value: '斜桥社区巴士1号线' },
        { display: '斜桥2', value: '斜桥社区巴士2号线' },
        { display: '斜桥3', value: '斜桥社区巴士3号线' },
        { display: '丁桥1', value: '丁桥社区巴士1号线' }
    ];

    var metro = [
        { display: '杭海城际', value: '杭海城际铁路' }
    ];

    // ---- 分类结构 ----
    var categories = [
        {
            id: 'city',
            label: '城市公交',
            searchCity: '嘉兴',
            searchPrefix: '海宁',
            buses: cityBuses
        },
        {
            id: 'intercity',
            label: '城乡城际公交',
            searchCity: '嘉兴',
            searchPrefix: '',
            buses: interBuses
        },
        {
            id: 'community',
            label: '社区巴士',
            searchCity: '嘉兴',
            searchPrefix: '',
            buses: communityBuses
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
     * 获取线路的颜色（类别基色 + 名称 hash 微调 HSL）
     */

    function getLineColor(lineName, categoryId) {
        categoryId = categoryId || classifyLine(HNBus.Utils ? HNBus.Utils.extractLineNumber(lineName) : null);
        var baseHex = getCategoryColor(categoryId);

        // 解析 hex → RGB
        var hex = baseHex.replace('#', '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);

        // RGB → HSL
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        // 使用线路名 hash 微调色相 (±15°)
        var hashVal = HNBus.Utils ? HNBus.Utils.hashString(lineName) : 0;
        var hueShift = (hashVal % 30) - 15; // -15 to +15 degrees
        h = (h * 360 + hueShift) / 360;
        if (h < 0) h += 1;
        if (h > 1) h -= 1;

        // HSL → hex
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
        g = Math.round(hue2rgb(p, q, h) * 255);
        b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

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
