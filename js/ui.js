/**
 * UI 模块
 * 控制面板构建、事件委托、移动端/桌面端适配
 */
(function () {
    var HNBus = window.HNBus || {};
    var UI = {};

    var _panelEl = null;
    var _searchBtn = null;
    var _filterInput = null;
    var _mobileInput = null;
    var _onSearchCallback = null;

    /**
     * 初始化 UI
     * @param {Function} onSearch - 查询回调
     */
    UI.init = function (onSearch) {
        _onSearchCallback = onSearch;
        var isMobile = HNBus.Utils.isMobile();

        _panelEl = document.createElement('div');
        _panelEl.className = 'bus-panel';
        _panelEl.id = 'bus-query-panel';

        // 侧边滑动折叠按钮
        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'panel-toggle-btn';
        toggleBtn.title = '折叠/展开';
        toggleBtn.innerHTML = '<span class="arrow">◀</span>';
        _panelEl.appendChild(toggleBtn);

        // 顶部标题栏（含折叠按钮）
        var headerBar = document.createElement('div');
        headerBar.className = 'panel-header-bar';
        headerBar.innerHTML =
            '<span class="panel-title">海宁公共交通线路查询 ©HNMRXZ</span>' +
            '<button class="panel-collapse-btn" id="panel-collapse-btn" title="折叠面板">−</button>';
        _panelEl.appendChild(headerBar);

        // 面板内容区
        var contentWrap = document.createElement('div');
        contentWrap.className = 'panel-content';
        contentWrap.id = 'panel-content-wrap';

        if (isMobile) {
            UI._buildMobileContent(contentWrap);
        } else {
            UI._buildDesktopContent(contentWrap);
        }

        _panelEl.appendChild(contentWrap);
        document.body.appendChild(_panelEl);

        // 绑定事件
        UI._bindEvents();

        return _panelEl;
    };

    /**
     * 桌面端面板内容
     */
    UI._buildDesktopContent = function (panel) {
        // 搜索筛选框
        var filterDiv = document.createElement('div');
        filterDiv.className = 'search-filter';
        var filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = '🔍 筛选线路...';
        filterInput.id = 'line-filter';
        filterDiv.appendChild(filterInput);
        panel.appendChild(filterDiv);
        _filterInput = filterInput;

        // 分类复选框组
        var categories = HNBus.Data.categories;
        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            var group = UI._createCategoryGroup(cat);
            panel.appendChild(group);
        }

        // 按钮组
        var btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.innerHTML =
            '<button id="search-btn" class="btn btn-primary" style="flex:1">查询</button>' +
            '<button id="clear-btn" class="btn btn-sm">清除</button>';
        panel.appendChild(btnGroup);
    };

    /**
     * 移动端面板内容
     */
    UI._buildMobileContent = function (panel) {
        // 快速搜索行
        var searchRow = document.createElement('div');
        searchRow.className = 'mobile-search-row';
        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'mobile-line-input';
        input.placeholder = '输入线路号，如 101、海宁2路';
        _mobileInput = input;
        var searchBtn = document.createElement('button');
        searchBtn.id = 'mobile-search-btn';
        searchBtn.className = 'btn btn-primary';
        searchBtn.textContent = '查询';
        searchRow.appendChild(input);
        searchRow.appendChild(searchBtn);
        panel.appendChild(searchRow);

        // 展开全部线路的切换
        var showAllBtn = document.createElement('button');
        showAllBtn.className = 'btn btn-sm';
        showAllBtn.id = 'show-all-btn';
        showAllBtn.textContent = '展开全部线路 ▼';
        showAllBtn.style.width = '100%';
        showAllBtn.style.marginBottom = 'var(--spacing-sm)';
        panel.appendChild(showAllBtn);

        // 全部线路容器（默认隐藏）
        var allLinesDiv = document.createElement('div');
        allLinesDiv.id = 'all-lines-container';
        allLinesDiv.style.display = 'none';

        // 搜索筛选
        var filterDiv = document.createElement('div');
        filterDiv.className = 'search-filter';
        var filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = '🔍 筛选线路...';
        filterInput.id = 'line-filter';
        filterDiv.appendChild(filterInput);
        allLinesDiv.appendChild(filterDiv);
        _filterInput = filterInput;

        // 分类组
        var categories = HNBus.Data.categories;
        for (var i = 0; i < categories.length; i++) {
            var group = UI._createCategoryGroup(categories[i]);
            allLinesDiv.appendChild(group);
        }

        // 清除按钮
        var clearBtn = document.createElement('button');
        clearBtn.id = 'clear-btn';
        clearBtn.className = 'btn btn-sm';
        clearBtn.textContent = '清除选择';
        clearBtn.style.width = '100%';
        allLinesDiv.appendChild(clearBtn);

        panel.appendChild(allLinesDiv);
    };

    /**
     * 创建分类复选框组
     */
    UI._createCategoryGroup = function (category) {
        var container = document.createElement('div');
        container.className = 'category-group';
        container.setAttribute('data-category', category.id);

        // 标题栏
        var header = document.createElement('div');
        header.className = 'category-header';
        header.setAttribute('data-category-id', category.id);
        header.innerHTML = '<span class="category-label">' + category.label + '</span>' +
                          '<span style="display:flex;align-items:center">' +
                          '<span class="badge" data-category-count="' + category.id + '">0/' +
                          category.buses.length + '</span>' +
                          '<span class="collapse-arrow" data-collapse="' + category.id + '">▼</span>' +
                          '</span>';
        container.appendChild(header);

        // 复选框列表
        var body = document.createElement('div');
        body.className = 'category-body';

        category.buses.forEach(function (bus) {
            var label = document.createElement('label');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = bus.value;
            checkbox.setAttribute('data-category', category.id);
            checkbox.setAttribute('data-display', bus.display);
            if (bus.gprsId) checkbox.setAttribute('data-gprsid', bus.gprsId);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(bus.display));
            body.appendChild(label);
        });

        container.appendChild(body);
        return container;
    };

    /**
     * 绑定事件（委托模式）
     */
    UI._bindEvents = function () {
        // 侧边按钮：面板滑动折叠/展开
        var toggleBtn = _panelEl.querySelector('.panel-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                if (_panelEl.classList.contains('collapsed')) {
                    _panelEl.classList.remove('collapsed');
                } else {
                    _panelEl.classList.add('collapsed');
                }
            });
        }

        // 顶部按钮：面板内容折叠/展开
        var collapseBtn = document.getElementById('panel-collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', function () {
                var content = document.getElementById('panel-content-wrap');
                var panel = document.getElementById('bus-query-panel');
                if (content.style.display === 'none') {
                    content.style.display = '';
                    collapseBtn.textContent = '−';
                    collapseBtn.title = '折叠面板';
                    panel.classList.remove('content-collapsed');
                } else {
                    content.style.display = 'none';
                    collapseBtn.textContent = '+';
                    collapseBtn.title = '展开面板';
                    panel.classList.add('content-collapsed');
                }
            });
        }

        // 事件委托：折叠箭头 → 折叠/展开，标题 → 全选/取消，复选框 → 更新计数
        _panelEl.addEventListener('click', function (e) {
            var target = e.target;

            // 折叠箭头 → 切换分类折叠
            if (target.classList.contains('collapse-arrow')) {
                var group = target.closest('.category-group');
                if (group) {
                    group.classList.toggle('collapsed');
                }
                return;
            }

            // 类别标题（非箭头区域）→ 切换全选
            if (target.classList.contains('category-header') ||
                target.closest('.category-header') && !target.closest('.collapse-arrow')) {

                var header = target.closest('.category-header');
                if (header) {
                    var categoryId = header.getAttribute('data-category-id');
                    UI.toggleCategory(categoryId);
                }
                return;
            }

            // 复选框 → 更新计数
            if (target.type === 'checkbox') {
                UI._updateBadgeCounts();
                return;
            }

            // 查询按钮
            if (target.id === 'search-btn' || target.id === 'mobile-search-btn') {
                if (_onSearchCallback) _onSearchCallback();
                return;
            }

            // 清除按钮
            if (target.id === 'clear-btn') {
                UI.clearAllSelections();
                return;
            }

            // 展开全部线路（移动端）
            if (target.id === 'show-all-btn') {
                var container = document.getElementById('all-lines-container');
                var isVisible = container.style.display !== 'none';
                if (isVisible) {
                    container.style.display = 'none';
                    target.textContent = '展开全部线路 ▼';
                } else {
                    container.style.display = 'block';
                    target.textContent = '收起全部线路 ▲';
                }
                return;
            }
        });

        // 筛选输入
        var filterInput = document.getElementById('line-filter');
        if (filterInput) {
            filterInput.addEventListener('input', HNBus.Utils.debounce(function () {
                UI.filterLines(this.value);
            }, 200));
        }

        // 移动端回车键查询
        var mobileInput = document.getElementById('mobile-line-input');
        if (mobileInput) {
            mobileInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && _onSearchCallback) {
                    _onSearchCallback();
                }
            });
        }
    };

    /**
     * 全选/取消全选某类别
     */
    UI.toggleCategory = function (categoryId) {
        var body = document.querySelector('.category-body[data-category="' + categoryId + '"]') ||
                   document.querySelector('.category-group[data-category="' + categoryId + '"] .category-body');
        if (!body) return;

        var checkboxes = body.querySelectorAll('input[type="checkbox"]');
        var allChecked = true;
        checkboxes.forEach(function (cb) {
            if (!cb.checked) allChecked = false;
        });

        checkboxes.forEach(function (cb) {
            cb.checked = !allChecked;
        });

        UI._updateBadgeCounts();
    };

    /**
     * 筛选线路（搜索过滤）
     */
    UI.filterLines = function (keyword) {
        if (!keyword) keyword = '';
        keyword = keyword.toLowerCase().trim();

        var labels = _panelEl.querySelectorAll('.category-body label');
        labels.forEach(function (label) {
            var text = label.textContent.toLowerCase();
            if (keyword === '' || text.indexOf(keyword) !== -1) {
                label.classList.remove('hidden');
            } else {
                label.classList.add('hidden');
            }
        });
    };

    /**
     * 更新分类徽章计数
     */
    UI._updateBadgeCounts = function () {
        var categories = HNBus.Data.categories;
        categories.forEach(function (cat) {
            var badge = document.querySelector('[data-category-count="' + cat.id + '"]');
            if (!badge) return;

            var checkboxes = _panelEl.querySelectorAll(
                'input[type="checkbox"][data-category="' + cat.id + '"]'
            );
            var checked = 0;
            checkboxes.forEach(function (cb) {
                if (cb.checked) checked++;
            });
            badge.textContent = checked + '/' + cat.buses.length;
        });
    };

    /**
     * 获取所有已选线路
     * @returns {Array<{value: string, display: string, category: object}>}
     */
    UI.getCheckedLines = function () {
        // 先检查移动端快速输入
        var mobileVal = '';
        if (_mobileInput) {
            mobileVal = _mobileInput.value.trim();
        }

        if (mobileVal) {
            // 移动端：搜索匹配的线路
            var results = [];
            var categories = HNBus.Data.categories;
            var kw = mobileVal.toLowerCase();

            categories.forEach(function (cat) {
                cat.buses.forEach(function (bus) {
                    var display = (bus.display || '').toLowerCase();
                    var value = (bus.value || '').toLowerCase();
                    if (display.indexOf(kw) !== -1 ||
                        value.indexOf(kw) !== -1 ||
                        kw === bus.display ||
                        kw === bus.value) {
                        results.push({
                            value: bus.value,
                            display: bus.display,
                            gprsId: bus.gprsId,
                            category: cat
                        });
                    }
                });
            });
            return results;
        }

        // 桌面端：从复选框获取
        var checked = [];
        var checkboxes = _panelEl.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(function (cb) {
            var catId = cb.getAttribute('data-category');
            var cat = HNBus.Data.categories.find(function (c) { return c.id === catId; });
            checked.push({
                value: cb.value,
                display: cb.getAttribute('data-display') || cb.value,
                gprsId: cb.getAttribute('data-gprsid') || undefined,
                category: cat || { id: 'other', searchCity: '嘉兴', searchPrefix: '' }
            });
        });
        return checked;
    };

    /**
     * 清除所有选择
     */
    UI.clearAllSelections = function () {
        var checkboxes = _panelEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function (cb) { cb.checked = false; });
        if (_mobileInput) _mobileInput.value = '';
        if (_filterInput) _filterInput.value = '';
        UI.filterLines('');
        UI._updateBadgeCounts();
    };

    /**
     * 设置搜索按钮状态
     */
    UI.setSearchLoading = function (loading) {
        var btn = document.getElementById('search-btn');
        var mobileBtn = document.getElementById('mobile-search-btn');

        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? '查询中...' : '查询';
        }
        if (mobileBtn) {
            mobileBtn.disabled = loading;
            mobileBtn.textContent = loading ? '查询中...' : '查询';
        }
    };

    /**
     * 显示/隐藏加载指示器
     */
    UI.showLoading = function (msg) {
        var overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<span class="loading-spinner"></span><span id="loading-text"></span>';
            document.body.appendChild(overlay);
        }
        document.getElementById('loading-text').textContent = msg || '加载中...';
        overlay.classList.add('active');
    };

    UI.hideLoading = function () {
        var overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    };

    // 导出
    HNBus.UI = UI;
    window.HNBus = HNBus;
})();
