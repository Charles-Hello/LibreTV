// 全局变量
let selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '["tyyszy", "bfzy", "ruyi"]'); // 默认选中天涯资源、暴风资源和如意资源
let customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); // 存储自定义API列表

// 添加当前播放的集数索引
let currentEpisodeIndex = 0;
// 添加当前视频的所有集数
let currentEpisodes = [];
// 添加当前视频的标题
let currentVideoTitle = '';
// 全局变量用于倒序状态
let episodesReversed = false;

// 页面初始化
document.addEventListener('DOMContentLoaded', function () {
  // 初始化API复选框
  initAPICheckboxes();

  // 初始化自定义API列表
  renderCustomAPIsList();

  // 初始化显示选中的API数量
  updateSelectedApiCount();

  // 渲染搜索历史
  renderSearchHistory();

  // 设置默认API选择（如果是第一次加载）
  if (!localStorage.getItem('hasInitializedDefaults')) {
    // 仅选择天涯资源、暴风资源和如意资源
    selectedAPIs = ["tyyszy", "bfzy", "ruyi"];
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // 默认选中过滤开关 - 强制启用黄色内容过滤
    localStorage.setItem('yellowFilterEnabled', 'true');
    localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, 'true');
    localStorage.setItem('qualityFilterEnabled', 'true');

    // 默认启用豆瓣功能
    localStorage.setItem('doubanEnabled', 'true');

    // 标记已初始化默认值
    localStorage.setItem('hasInitializedDefaults', 'true');
  }

  // 强制设置黄色内容过滤为开启，无论之前的设置如何
  localStorage.setItem('yellowFilterEnabled', 'true');

  // 设置黄色内容过滤开关初始状态 - 隐藏开关并强制开启
  const yellowFilterToggle = document.getElementById('yellowFilterToggle');
  if (yellowFilterToggle) {
    yellowFilterToggle.checked = true; // 强制设为开启
    // 隐藏整个黄色内容过滤开关容器
    const yellowFilterContainer = yellowFilterToggle.closest('.flex.flex-col.mb-3.pb-3.border-b.border-\\[\\#222\\].relative');
    if (yellowFilterContainer) {
      yellowFilterContainer.style.display = 'none';
    }
  }

  // 设置质量内容过滤开关初始状态
  const qualityFilterToggle = document.getElementById('qualityFilterToggle');
  if (qualityFilterToggle) {
    qualityFilterToggle.checked = localStorage.getItem('qualityFilterEnabled') !== 'false'; // 默认为true
  }

  // 设置广告过滤开关初始状态
  const adFilterToggle = document.getElementById('adFilterToggle');
  if (adFilterToggle) {
    adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false'; // 默认为true
  }

  // 设置事件监听器
  setupEventListeners();

  // 初始检查成人API选中状态
  setTimeout(checkAdultAPIsSelected, 100);
});

// 初始化API复选框
function initAPICheckboxes() {
  const container = document.getElementById('apiCheckboxes');
  container.innerHTML = '';

  // 添加普通API组标题
  const normaldiv = document.createElement('div');
  normaldiv.id = 'normaldiv';
  normaldiv.className = 'grid grid-cols-2 gap-2';
  const normalTitle = document.createElement('div');
  normalTitle.className = 'api-group-title';
  normalTitle.textContent = '普通资源';
  normaldiv.appendChild(normalTitle);

  // 创建普通API源的复选框
  Object.keys(API_SITES).forEach(apiKey => {
    const api = API_SITES[apiKey];
    if (api.adult) return; // 跳过成人内容API，稍后添加

    const checked = selectedAPIs.includes(apiKey);

    const checkbox = document.createElement('div');
    checkbox.className = 'flex items-center';
    checkbox.innerHTML = `
            <input type="checkbox" id="api_${apiKey}" 
                   class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333]" 
                   ${checked ? 'checked' : ''} 
                   data-api="${apiKey}">
            <label for="api_${apiKey}" class="ml-1 text-xs text-gray-400 truncate">${api.name}</label>
        `;
    normaldiv.appendChild(checkbox);

    // 添加事件监听器
    checkbox.querySelector('input').addEventListener('change', function () {
      updateSelectedAPIs();
      checkAdultAPIsSelected();
    });
  });
  container.appendChild(normaldiv);

  // 添加成人API列表
  addAdultAPI();

  // 初始检查成人内容状态
  checkAdultAPIsSelected();
}

// 添加成人API列表
function addAdultAPI() {
  // 由于黄色内容过滤已被写死开启，永远不显示成人API列表
  // 移除所有可能存在的成人API列表
  const existingAdultDiv = document.getElementById('adultdiv');
  if (existingAdultDiv) {
    existingAdultDiv.remove();
  }

  // 不添加成人API列表，直接返回
  return;
}

// 检查是否有成人API被选中
function checkAdultAPIsSelected() {
  // 查找所有内置成人API复选框
  const adultBuiltinCheckboxes = document.querySelectorAll('#apiCheckboxes .api-adult:checked');

  // 查找所有自定义成人API复选框
  const customApiCheckboxes = document.querySelectorAll('#customApisList .api-adult:checked');

  const hasAdultSelected = adultBuiltinCheckboxes.length > 0 || customApiCheckboxes.length > 0;

  const yellowFilterToggle = document.getElementById('yellowFilterToggle');
  const yellowFilterContainer = yellowFilterToggle?.closest('div').parentNode;
  const filterDescription = yellowFilterContainer?.querySelector('p.filter-description');

  // 强制保持黄色内容过滤开启，不管成人API选择状态
  if (yellowFilterToggle) {
    yellowFilterToggle.checked = true;
    yellowFilterToggle.disabled = true; // 禁用开关，防止用户修改
    localStorage.setItem('yellowFilterEnabled', 'true');
  }

  // 如果容器存在，隐藏整个过滤开关
  if (yellowFilterContainer) {
    yellowFilterContainer.style.display = 'none';
  }

  // 如果选择了成人API，显示警告信息（但仍保持过滤开启）
  if (hasAdultSelected && filterDescription) {
    filterDescription.innerHTML = '<strong class="text-red-300">已选择黄色资源站，但内容过滤仍然有效</strong>';
  }
}

// 渲染自定义API列表
function renderCustomAPIsList() {
  const container = document.getElementById('customApisList');
  if (!container) return;

  // 过滤掉所有成人内容API，只显示非成人内容API
  const nonAdultAPIs = customAPIs.filter(api => !api.isAdult);

  if (nonAdultAPIs.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 text-center my-2">未添加自定义API</p>';
    return;
  }

  container.innerHTML = '';
  nonAdultAPIs.forEach((api, index) => {
    // 查找原始索引
    const originalIndex = customAPIs.findIndex(originalApi => originalApi === api);

    const apiItem = document.createElement('div');
    apiItem.className = 'flex items-center justify-between p-1 mb-1 bg-[#222] rounded';

    const textColorClass = 'text-white'; // 移除成人内容的粉色样式

    apiItem.innerHTML = `
            <div class="flex items-center flex-1 min-w-0">
                <input type="checkbox" id="custom_api_${originalIndex}" 
                       class="form-checkbox h-3 w-3 text-blue-600 mr-1" 
                       ${selectedAPIs.includes('custom_' + originalIndex) ? 'checked' : ''} 
                       data-custom-index="${originalIndex}">
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium ${textColorClass} truncate">
                        ${api.name}
                    </div>
                    <div class="text-xs text-gray-500 truncate">${api.url}</div>
                </div>
            </div>
            <div class="flex items-center">
                <button class="text-blue-500 hover:text-blue-700 text-xs px-1" onclick="editCustomApi(${originalIndex})">✎</button>
                <button class="text-red-500 hover:text-red-700 text-xs px-1" onclick="removeCustomApi(${originalIndex})">✕</button>
            </div>
        `;
    container.appendChild(apiItem);

    // 添加事件监听器
    apiItem.querySelector('input').addEventListener('change', function () {
      updateSelectedAPIs();
      checkAdultAPIsSelected();
    });
  });
}

// 编辑自定义API
function editCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;

  const api = customAPIs[index];

  // 填充表单数据
  const nameInput = document.getElementById('customApiName');
  const urlInput = document.getElementById('customApiUrl');
  // 移除成人内容选项的处理
  // const isAdultInput = document.getElementById('customApiIsAdult');

  nameInput.value = api.name;
  urlInput.value = api.url;
  // if (isAdultInput) isAdultInput.checked = api.isAdult || false;

  // 显示表单
  const form = document.getElementById('addCustomApiForm');
  if (form) {
    form.classList.remove('hidden');

    // 替换表单按钮操作
    const buttonContainer = form.querySelector('div:last-child');
    buttonContainer.innerHTML = `
            <button onclick="updateCustomApi(${index})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">更新</button>
            <button onclick="cancelEditCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
        `;
  }
}

// 更新自定义API
function updateCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;

  const nameInput = document.getElementById('customApiName');
  const urlInput = document.getElementById('customApiUrl');
  // 移除成人内容选项的处理
  // const isAdultInput = document.getElementById('customApiIsAdult');

  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  const isAdult = false; // 强制设为非成人内容

  if (!name || !url) {
    showToast('请输入API名称和链接', 'warning');
    return;
  }

  // 确保URL格式正确
  if (!/^https?:\/\/.+/.test(url)) {
    showToast('API链接格式不正确，需以http://或https://开头', 'warning');
    return;
  }

  // 移除URL末尾的斜杠
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // 更新API信息 - 强制设置isAdult为false
  customAPIs[index] = { name, url, isAdult: false };
  localStorage.setItem('customAPIs', JSON.stringify(customAPIs));

  // 重新渲染自定义API列表
  renderCustomAPIsList();

  // 重新检查成人API选中状态
  checkAdultAPIsSelected();

  // 恢复添加按钮
  restoreAddCustomApiButtons();

  // 清空表单并隐藏
  nameInput.value = '';
  urlInput.value = '';
  // 移除成人内容选项的清空
  // if (isAdultInput) isAdultInput.checked = false;
  document.getElementById('addCustomApiForm').classList.add('hidden');

  showToast('已更新自定义API: ' + name, 'success');
}

// 取消编辑自定义API
function cancelEditCustomApi() {
  // 清空表单
  document.getElementById('customApiName').value = '';
  document.getElementById('customApiUrl').value = '';
  // const isAdultInput = document.getElementById('customApiIsAdult');
  // if (isAdultInput) isAdultInput.checked = false;

  // 隐藏表单
  document.getElementById('addCustomApiForm').classList.add('hidden');

  // 恢复添加按钮
  restoreAddCustomApiButtons();
}

// 恢复自定义API添加按钮
function restoreAddCustomApiButtons() {
  const form = document.getElementById('addCustomApiForm');
  const buttonContainer = form.querySelector('div:last-child');
  buttonContainer.innerHTML = `
        <button onclick="addCustomApi()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">添加</button>
        <button onclick="cancelAddCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
    `;
}

// 更新选中的API列表
function updateSelectedAPIs() {
  // 获取所有内置API复选框
  const builtInApiCheckboxes = document.querySelectorAll('#apiCheckboxes input:checked');

  // 获取选中的内置API
  const builtInApis = Array.from(builtInApiCheckboxes).map(input => input.dataset.api);

  // 获取选中的自定义API
  const customApiCheckboxes = document.querySelectorAll('#customApisList input:checked');
  const customApiIndices = Array.from(customApiCheckboxes).map(input => 'custom_' + input.dataset.customIndex);

  // 合并内置和自定义API
  selectedAPIs = [...builtInApis, ...customApiIndices];

  // 保存到localStorage
  localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

  // 更新显示选中的API数量
  updateSelectedApiCount();
}

// 更新选中的API数量显示
function updateSelectedApiCount() {
  const countEl = document.getElementById('selectedApiCount');
  if (countEl) {
    countEl.textContent = selectedAPIs.length;
  }
}

// 全选或取消全选API
function selectAllAPIs(selectAll = true, excludeAdult = false) {
  const checkboxes = document.querySelectorAll('#apiCheckboxes input[type="checkbox"]');

  checkboxes.forEach(checkbox => {
    if (excludeAdult && checkbox.classList.contains('api-adult')) {
      checkbox.checked = false;
    } else {
      checkbox.checked = selectAll;
    }
  });

  updateSelectedAPIs();
  checkAdultAPIsSelected();
}

// 显示添加自定义API表单
function showAddCustomApiForm() {
  const form = document.getElementById('addCustomApiForm');
  if (form) {
    form.classList.remove('hidden');
  }
}

// 取消添加自定义API - 修改函数来重用恢复按钮逻辑
function cancelAddCustomApi() {
  const form = document.getElementById('addCustomApiForm');
  if (form) {
    form.classList.add('hidden');
    document.getElementById('customApiName').value = '';
    document.getElementById('customApiUrl').value = '';
    // const isAdultInput = document.getElementById('customApiIsAdult');
    // if (isAdultInput) isAdultInput.checked = false;

    // 确保按钮是添加按钮
    restoreAddCustomApiButtons();
  }
}

// 添加自定义API
function addCustomApi() {
  const nameInput = document.getElementById('customApiName');
  const urlInput = document.getElementById('customApiUrl');
  // 移除成人内容选项的获取
  // const isAdultInput = document.getElementById('customApiIsAdult');

  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  const isAdult = false; // 强制设为非成人内容

  if (!name || !url) {
    showToast('请输入API名称和链接', 'warning');
    return;
  }

  // 确保URL格式正确
  if (!/^https?:\/\/.+/.test(url)) {
    showToast('API链接格式不正确，需以http://或https://开头', 'warning');
    return;
  }

  // 移除URL末尾的斜杠
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // 添加到自定义API列表 - 强制设置isAdult为false
  customAPIs.push({ name, url, isAdult: false });
  localStorage.setItem('customAPIs', JSON.stringify(customAPIs));

  // 默认选中新添加的API
  const newApiIndex = customAPIs.length - 1;
  selectedAPIs.push('custom_' + newApiIndex);
  localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

  // 重新渲染自定义API列表
  renderCustomAPIsList();

  // 更新选中的API数量
  updateSelectedApiCount();

  // 重新检查成人API选中状态
  checkAdultAPIsSelected();

  // 清空表单并隐藏
  nameInput.value = '';
  urlInput.value = '';
  // 移除成人内容选项的清空
  // if (isAdultInput) isAdultInput.checked = false;
  document.getElementById('addCustomApiForm').classList.add('hidden');

  showToast('已添加自定义API: ' + name, 'success');
}

// 移除自定义API
function removeCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;

  const apiName = customAPIs[index].name;

  // 从列表中移除API
  customAPIs.splice(index, 1);
  localStorage.setItem('customAPIs', JSON.stringify(customAPIs));

  // 从选中列表中移除此API
  const customApiId = 'custom_' + index;
  selectedAPIs = selectedAPIs.filter(id => id !== customApiId);

  // 更新大于此索引的自定义API索引
  selectedAPIs = selectedAPIs.map(id => {
    if (id.startsWith('custom_')) {
      const currentIndex = parseInt(id.replace('custom_', ''));
      if (currentIndex > index) {
        return 'custom_' + (currentIndex - 1);
      }
    }
    return id;
  });

  localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

  // 重新渲染自定义API列表
  renderCustomAPIsList();

  // 更新选中的API数量
  updateSelectedApiCount();

  // 重新检查成人API选中状态
  checkAdultAPIsSelected();

  showToast('已移除自定义API: ' + apiName, 'info');
}

// 设置事件监听器
function setupEventListeners() {
  // 回车搜索
  document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      search();
    }
  });

  // 点击外部关闭设置面板
  document.addEventListener('click', function (e) {
    const panel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick="toggleSettings(event)"]');

    if (!panel.contains(e.target) && !settingsButton.contains(e.target) && panel.classList.contains('show')) {
      panel.classList.remove('show');
    }
  });

  // 质量内容过滤开关事件绑定
  const qualityFilterToggle = document.getElementById('qualityFilterToggle');
  if (qualityFilterToggle) {
    qualityFilterToggle.addEventListener('change', function (e) {
      localStorage.setItem('qualityFilterEnabled', e.target.checked);
    });
  }

  // 广告过滤开关事件绑定
  const adFilterToggle = document.getElementById('adFilterToggle');
  if (adFilterToggle) {
    adFilterToggle.addEventListener('change', function (e) {
      localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
    });
  }
}

// 重置搜索区域
function resetSearchArea() {
  // 清理搜索结果
  document.getElementById('results').innerHTML = '';
  document.getElementById('searchInput').value = '';

  // 恢复搜索区域的样式
  document.getElementById('searchArea').classList.add('flex-1');
  document.getElementById('searchArea').classList.remove('mb-8');
  document.getElementById('resultsArea').classList.add('hidden');

  // 确保页脚正确显示，移除相对定位
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.style.position = '';
  }

  // 如果有豆瓣功能，检查是否需要显示豆瓣推荐区域
  if (typeof updateDoubanVisibility === 'function') {
    updateDoubanVisibility();
  }
}

// 获取自定义API信息
function getCustomApiInfo(customApiIndex) {
  const index = parseInt(customApiIndex);
  if (isNaN(index) || index < 0 || index >= customAPIs.length) {
    return null;
  }
  return customAPIs[index];
}

// 搜索功能 - 修改为支持多选API和导航管理器集成
async function search() {
  // 密码保护校验
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      showPasswordModal && showPasswordModal();
      return;
    }
  }
  const query = document.getElementById('searchInput').value.trim();

  if (!query) {
    showToast('请输入搜索内容', 'info');
    return;
  }

  if (selectedAPIs.length === 0) {
    showToast('请至少选择一个API源', 'warning');
    return;
  }

  showLoading();

  try {
    // 保存搜索历史
    saveSearchHistory(query);

    // 从所有选中的API源搜索
    let allResults = [];
    const searchPromises = selectedAPIs.map(async (apiId) => {
      try {
        let apiUrl, apiName;

        // 处理自定义API
        if (apiId.startsWith('custom_')) {
          const customIndex = apiId.replace('custom_', '');
          const customApi = getCustomApiInfo(customIndex);
          if (!customApi) return [];

          apiUrl = customApi.url + API_CONFIG.search.path + encodeURIComponent(query);
          apiName = customApi.name;
        } else {
          // 内置API
          if (!API_SITES[apiId]) return [];
          apiUrl = API_SITES[apiId].api + API_CONFIG.search.path + encodeURIComponent(query);
          apiName = API_SITES[apiId].name;
        }

        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
          headers: API_CONFIG.search.headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return [];
        }

        const data = await response.json();

        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
          return [];
        }

        // 添加源信息到每个结果
        const results = data.list.map(item => ({
          ...item,
          source_name: apiName,
          source_code: apiId,
          api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
        }));

        return results;
      } catch (error) {
        console.warn(`API ${apiId} 搜索失败:`, error);
        return [];
      }
    });

    // 等待所有搜索请求完成
    const resultsArray = await Promise.all(searchPromises);

    // 合并所有结果
    resultsArray.forEach(results => {
      if (Array.isArray(results) && results.length > 0) {
        allResults = allResults.concat(results);
      }
    });

    // 处理搜索结果过滤
    const yellowFilterEnabled = true; // 强制启用黄色内容过滤，不再依赖localStorage
    const qualityFilterEnabled = localStorage.getItem('qualityFilterEnabled') !== 'false';

    // 黄色内容过滤 - 始终启用
    allResults = allResults.filter(item => {
      const typeName = item.type_name || '';
      return !FILTER_CONFIG.adultContent.some(keyword => typeName.includes(keyword));
    });

    // 质量内容过滤（预告片、解说等）
    if (qualityFilterEnabled) {
      allResults = allResults.filter(item => {
        const vodName = item.vod_name || '';
        const typeName = item.type_name || '';
        const remarks = item.vod_remarks || '';

        // 检查标题、类型和备注中是否包含低质量关键词
        const contentToCheck = `${vodName} ${typeName} ${remarks}`.toLowerCase();
        return !FILTER_CONFIG.lowQualityContent.some(keyword =>
          contentToCheck.includes(keyword.toLowerCase())
        );
      });
    }

    // 使用导航管理器保存搜索状态
    if (window.navigationManager) {
      window.navigationManager.navigateToSearch(query, allResults);
    }

    // 显示搜索结果
    renderSearchResults(allResults, query);

  } catch (error) {
    console.error('搜索错误:', error);
    if (error.name === 'AbortError') {
      showToast('搜索请求超时，请检查网络连接', 'error');
    } else {
      showToast('搜索请求失败，请稍后重试', 'error');
    }
  } finally {
    hideLoading();
  }
}

// 渲染搜索结果的独立函数
function renderSearchResults(allResults, query) {
  // 显示结果区域，调整搜索区域
  document.getElementById('searchArea').classList.remove('flex-1');
  document.getElementById('searchArea').classList.add('mb-8');
  document.getElementById('resultsArea').classList.remove('hidden');

  // 隐藏豆瓣推荐区域（如果存在）
  const doubanArea = document.getElementById('doubanArea');
  if (doubanArea) {
    doubanArea.classList.add('hidden');
  }

  const resultsDiv = document.getElementById('results');

  // 更新搜索结果计数
  const searchResultsCount = document.getElementById('searchResultsCount');
  if (searchResultsCount) {
    searchResultsCount.textContent = allResults.length;
  }

  // 如果没有结果
  if (!allResults || allResults.length === 0) {
    resultsDiv.innerHTML = `
        <div class="col-span-full text-center py-16">
            <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
            <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
        </div>
    `;
    return;
  }

  // 渲染搜索结果
  renderResults(allResults);
}

// 渲染结果的独立函数，供导航管理器调用
function renderResults(allResults) {
  const resultsDiv = document.getElementById('results');

  if (!allResults || allResults.length === 0) {
    resultsDiv.innerHTML = `
        <div class="col-span-full text-center py-16">
            <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
            <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
        </div>
    `;
    return;
  }

  // 添加XSS保护，使用textContent和属性转义
  resultsDiv.innerHTML = allResults.map(item => {
    const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
    const safeName = (item.vod_name || '').toString()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const sourceInfo = item.source_name ?
      `<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">${item.source_name}</span>` : '';
    const sourceCode = item.source_code || '';

    // 添加API URL属性，用于详情获取
    const apiUrlAttr = item.api_url ?
      `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"` : '';

    // 修改为水平卡片布局，图片在左侧，文本在右侧，并优化样式
    const hasCover = item.vod_pic && item.vod_pic.startsWith('http');

    return `
        <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md" 
             onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
            <div class="flex h-full">
                ${hasCover ? `
                <div class="relative flex-shrink-0 search-card-img-container">
                    <img src="${item.vod_pic}" alt="${safeName}" 
                         class="h-full w-full object-cover transition-transform hover:scale-110" 
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=无封面'; this.classList.add('object-contain');" 
                         loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                </div>` : ''}
                
                <div class="p-2 flex flex-col flex-grow">
                    <div class="flex-grow">
                        <h3 class="font-semibold mb-2 break-words line-clamp-2 ${hasCover ? '' : 'text-center'}" title="${safeName}">${safeName}</h3>
                        
                        <div class="flex flex-wrap ${hasCover ? '' : 'justify-center'} gap-1 mb-2">
                            ${(item.type_name || '').toString().replace(/</g, '&lt;') ?
        `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">
                                  ${(item.type_name || '').toString().replace(/</g, '&lt;')}
                              </span>` : ''}
                            ${(item.vod_year || '') ?
        `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">
                                  ${item.vod_year}
                              </span>` : ''}
                        </div>
                        <p class="text-gray-400 line-clamp-2 overflow-hidden ${hasCover ? '' : 'text-center'} mb-2">
                            ${(item.vod_remarks || '暂无介绍').toString().replace(/</g, '&lt;')}
                        </p>
                    </div>
                    
                    <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800">
                        ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
  }).join('');
}

// 将 renderResults 函数添加到全局作用域，供导航管理器使用
window.renderResults = renderResults;

// 显示详情 - 修改为支持自定义API
async function showDetails(id, vod_name, sourceCode) {
  // 密码保护校验
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      showPasswordModal && showPasswordModal();
      return;
    }
  }
  if (!id) {
    showToast('视频ID无效', 'error');
    return;
  }

  showLoading();
  try {
    // 构建API参数
    let apiParams = '';

    // 处理自定义API源
    if (sourceCode.startsWith('custom_')) {
      const customIndex = sourceCode.replace('custom_', '');
      const customApi = getCustomApiInfo(customIndex);
      if (!customApi) {
        showToast('自定义API配置无效', 'error');
        hideLoading();
        return;
      }

      apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&source=custom';
    } else {
      // 内置API
      apiParams = '&source=' + sourceCode;
    }

    const response = await fetch('/api/detail?id=' + encodeURIComponent(id) + apiParams);

    const data = await response.json();

    if (data.episodes && data.episodes.length > 0) {
      // 安全处理集数URL
      const safeEpisodes = data.episodes.map(url => {
        try {
          // 确保URL是有效的并且是http或https开头
          return url && (url.startsWith('http://') || url.startsWith('https://'))
            ? url.replace(/"/g, '&quot;')
            : '';
        } catch (e) {
          return '';
        }
      }).filter(url => url); // 过滤掉空URL

      // 保存当前视频的所有集数
      currentEpisodes = safeEpisodes;
      episodesReversed = false; // 默认正序

      // 新增：如果只有一集，直接跳转播放
      if (safeEpisodes.length === 1) {
        hideLoading();

        // 获取来源名称
        const sourceName = data.videoInfo && data.videoInfo.source_name ?
          data.videoInfo.source_name : '';

        // 生成视频唯一标识符
        const videoIdentifier = generateVideoIdentifier(vod_name, sourceCode, id);

        // 保存当前状态到localStorage，让播放页面可以获取
        const currentVideoTitle = vod_name;
        localStorage.setItem('currentVideoTitle', currentVideoTitle);
        localStorage.setItem('currentEpisodeIndex', 0);
        localStorage.setItem(`currentEpisodes_${videoIdentifier}`, JSON.stringify(currentEpisodes));
        localStorage.setItem(`episodesReversed_${videoIdentifier}`, false);

        // 清理旧的通用缓存键（兼容性处理）
        try {
          localStorage.removeItem('currentEpisodes');
          localStorage.removeItem('episodesReversed');
        } catch (e) {
          // 忽略清理错误
        }

        // 构建视频信息对象，使用标题作为唯一标识
        const videoTitle = vod_name || currentVideoTitle;
        const videoInfo = {
          title: videoTitle,
          url: safeEpisodes[0],
          episodeIndex: 0,
          sourceName: sourceName,
          timestamp: Date.now(),
          // 重要：将完整的剧集信息也添加到历史记录中
          episodes: currentEpisodes && currentEpisodes.length > 0 ? [...currentEpisodes] : []
        };

        // 保存到观看历史，添加sourceName
        if (typeof addToViewingHistory === 'function') {
          addToViewingHistory(videoInfo);
        }

        // 构建播放页面URL，传递必要参数包括vod_id和apiParams
        const playerUrl = `player.html?url=${encodeURIComponent(safeEpisodes[0])}&title=${encodeURIComponent(videoTitle)}&index=0&source=${encodeURIComponent(sourceName)}&source_code=${encodeURIComponent(sourceCode)}&vod_id=${encodeURIComponent(id)}&api_params=${encodeURIComponent(apiParams)}&referrer=${encodeURIComponent(window.location.href)}`;

        // 直接跳转到播放页面
        window.location.href = playerUrl;
        return;
      }

      // 如果有多集，显示详情模态框
      const modal = document.getElementById('modal');
      const modalTitle = document.getElementById('modalTitle');
      const modalContent = document.getElementById('modalContent');

      // 显示来源信息
      const sourceName = data.videoInfo && data.videoInfo.source_name ?
        ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';

      // 不对标题进行截断处理，允许完整显示
      const titleHtml = `<span class="break-words">${vod_name || '未知视频'}</span>${sourceName}`;
      modalTitle.innerHTML = titleHtml;
      currentVideoTitle = vod_name || '未知视频';

      const contentHtml = `
                <div class="flex justify-end mb-2">
                    <button onclick="toggleEpisodeOrder('${sourceCode}')" class="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                        </svg>
                        <span>倒序排列</span>
                    </button>
                </div>
                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    ${renderEpisodes(vod_name, sourceCode, id, apiParams)}
                </div>
            `;

      modalContent.innerHTML = contentHtml;
      modal.classList.remove('hidden');

      // 保存模态框状态到导航管理器
      if (window.navigationManager) {
        const modalVideoData = {
          id: id,
          title: vod_name || '未知视频',
          titleHtml: titleHtml,
          contentHtml: contentHtml,
          sourceCode: sourceCode,
          apiParams: apiParams
        };
        window.navigationManager.saveModalState(modalVideoData, safeEpisodes);
      }
    } else {
      const modal = document.getElementById('modal');
      const modalTitle = document.getElementById('modalTitle');
      const modalContent = document.getElementById('modalContent');

      // 显示来源信息
      const sourceName = data.videoInfo && data.videoInfo.source_name ?
        ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';

      const titleHtml = `<span class="break-words">${vod_name || '未知视频'}</span>${sourceName}`;
      modalTitle.innerHTML = titleHtml;
      currentVideoTitle = vod_name || '未知视频';

      const contentHtml = '<p class="text-center text-gray-400 py-8">没有找到可播放的视频</p>';
      modalContent.innerHTML = contentHtml;
      modal.classList.remove('hidden');

      // 保存模态框状态到导航管理器（即使没有剧集）
      if (window.navigationManager) {
        const modalVideoData = {
          id: id,
          title: vod_name || '未知视频',
          titleHtml: titleHtml,
          contentHtml: contentHtml,
          sourceCode: sourceCode,
          apiParams: apiParams
        };
        window.navigationManager.saveModalState(modalVideoData, []);
      }
    }
  } catch (error) {
    console.error('获取详情错误:', error);
    showToast('获取详情失败，请稍后重试', 'error');
  } finally {
    hideLoading();
  }
}

// 更新播放视频函数，修改为在新标签页中打开播放页面，并保存到历史记录
function playVideo(url, vod_name, sourceCode, episodeIndex = 0, vod_id = '', apiParams = '') {
  // 密码保护校验
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      showPasswordModal && showPasswordModal();
      return;
    }
  }
  if (!url) {
    showToast('无效的视频链接', 'error');
    return;
  }

  // 获取当前视频来源名称（从模态框标题中提取）
  let sourceName = '';
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    const sourceSpan = modalTitle.querySelector('span.text-gray-400');
    if (sourceSpan) {
      // 提取括号内的来源名称, 例如从 "(黑木耳)" 提取 "黑木耳"
      const sourceText = sourceSpan.textContent;
      const match = sourceText.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        sourceName = match[1].trim();
      }
    }
  }

  // 保存当前状态到localStorage，让播放页面可以获取
  const currentVideoTitle = vod_name;

  // 生成视频唯一标识符
  const videoIdentifier = generateVideoIdentifier(vod_name, sourceCode, vod_id);

  localStorage.setItem('currentVideoTitle', currentVideoTitle);
  localStorage.setItem('currentEpisodeIndex', episodeIndex);
  localStorage.setItem(`currentEpisodes_${videoIdentifier}`, JSON.stringify(currentEpisodes));
  localStorage.setItem(`episodesReversed_${videoIdentifier}`, episodesReversed);

  // 清理旧的通用缓存键（兼容性处理）
  try {
    localStorage.removeItem('currentEpisodes');
    localStorage.removeItem('episodesReversed');
  } catch (e) {
    // 忽略清理错误
  }

  // 构建视频信息对象，使用标题作为唯一标识
  const videoTitle = vod_name || currentVideoTitle;
  const videoInfo = {
    title: videoTitle,
    url: url,
    episodeIndex: episodeIndex,
    sourceName: sourceName,
    timestamp: Date.now(),
    // 重要：将完整的剧集信息也添加到历史记录中
    episodes: currentEpisodes && currentEpisodes.length > 0 ? [...currentEpisodes] : []
  };

  // 保存到观看历史，添加sourceName
  if (typeof addToViewingHistory === 'function') {
    addToViewingHistory(videoInfo);
  }

  // 构建播放页面URL，传递必要参数包括vod_id和apiParams
  let playerUrl = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoTitle)}&index=${episodeIndex}&source=${encodeURIComponent(sourceName)}&source_code=${encodeURIComponent(sourceCode)}`;

  // 添加vod_id和apiParams参数（如果提供的话）
  if (vod_id) {
    playerUrl += `&vod_id=${encodeURIComponent(vod_id)}`;
  }
  if (apiParams) {
    playerUrl += `&api_params=${encodeURIComponent(apiParams)}`;
  }

  playerUrl += `&referrer=${encodeURIComponent(window.location.href)}`;

  // 在当前标签页中打开播放页面
  window.location.href = playerUrl;
}

// 播放上一集
function playPreviousEpisode(sourceCode) {
  if (currentEpisodeIndex > 0) {
    const prevIndex = currentEpisodeIndex - 1;
    const prevUrl = currentEpisodes[prevIndex];
    playVideo(prevUrl, currentVideoTitle, sourceCode, prevIndex);
  }
}

// 播放下一集
function playNextEpisode(sourceCode) {
  if (currentEpisodeIndex < currentEpisodes.length - 1) {
    const nextIndex = currentEpisodeIndex + 1;
    const nextUrl = currentEpisodes[nextIndex];
    playVideo(nextUrl, currentVideoTitle, sourceCode, nextIndex);
  }
}

// 处理播放器加载错误
function handlePlayerError() {
  hideLoading();
  showToast('视频播放加载失败，请尝试其他视频源', 'error');
}

// 辅助函数用于渲染剧集按钮（使用当前的排序状态）
function renderEpisodes(vodName, sourceCode, vod_id = '', apiParams = '') {
  const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
  return episodes.map((episode, index) => {
    // 根据倒序状态计算真实的剧集索引
    const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
    return `
            <button id="episode-${realIndex}" onclick="playVideo('${episode}','${vodName.replace(/"/g, '&quot;')}', '${sourceCode}', ${realIndex}, '${vod_id}', '${apiParams.replace(/"/g, '&quot;')}')" 
                    class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn">
                第${realIndex + 1}集
            </button>
        `;
  }).join('');
}

// 切换排序状态的函数
function toggleEpisodeOrder(sourceCode) {
  episodesReversed = !episodesReversed;

  // 获取当前模态框中的vod_id和apiParams（如果有的话）
  let vod_id = '';
  let apiParams = '';

  // 尝试从当前上下文中获取这些值
  // 可以从当前显示的模态框或其他地方获取
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) {
    // 从模态框的按钮中提取参数
    const episodeButtons = modal.querySelectorAll('button[onclick*="playVideo"]');
    if (episodeButtons.length > 0) {
      const onclickText = episodeButtons[0].getAttribute('onclick');
      const matches = onclickText.match(/playVideo\([^,]+,[^,]+,[^,]+,[^,]+,\s*'([^']*)',\s*'([^']*)'\)/);
      if (matches) {
        vod_id = matches[1];
        apiParams = matches[2];
      }
    }
  }

  // 重新渲染剧集区域，使用 currentVideoTitle 作为视频标题
  const episodesGrid = document.getElementById('episodesGrid');
  if (episodesGrid) {
    episodesGrid.innerHTML = renderEpisodes(currentVideoTitle, sourceCode, vod_id, apiParams);
  }

  // 更新按钮文本和箭头方向
  const toggleBtn = document.querySelector(`button[onclick="toggleEpisodeOrder('${sourceCode}')"]`);
  if (toggleBtn) {
    toggleBtn.querySelector('span').textContent = episodesReversed ? '正序排列' : '倒序排列';
    const arrowIcon = toggleBtn.querySelector('svg');
    if (arrowIcon) {
      arrowIcon.style.transform = episodesReversed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
}

// 配置文件导入功能
async function importConfig() {
  showImportBox(async (file) => {
    try {
      // 检查文件类型
      if (!(file.type === 'application/json' || file.name.endsWith('.json'))) throw '文件类型不正确';

      // 检查文件大小
      if (file.size > 1024 * 1024 * 10) throw new Error('文件大小超过 10MB');

      // 读取文件内容
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject('文件读取失败');
        reader.readAsText(file);
      });

      // 解析并验证配置
      const config = JSON.parse(content);
      if (config.name !== 'LibreTV-Settings') throw '配置文件格式不正确';

      // 验证哈希
      const dataHash = await sha256(JSON.stringify(config.data));
      if (dataHash !== config.hash) throw '配置文件哈希值不匹配';

      // 导入配置
      for (let item in config.data) {
        localStorage.setItem(item, config.data[item]);
      }

      showToast('配置文件导入成功，3 秒后自动刷新本页面。', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      const message = typeof error === 'string' ? error : '配置文件格式错误';
      showToast(`配置文件读取出错 (${message})`, 'error');
    }
  });
}

// 配置文件导出功能
async function exportConfig() {
  // 存储配置数据
  const config = {};

  // 读取全部 localStorage 项
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items[key] = localStorage.getItem(key);
  }

  const times = Date.now().toString();
  config['name'] = 'LibreTV-Settings';  // 配置文件名，用于校验
  config['time'] = times;               // 配置文件生成时间
  config['cfgVer'] = '1.0.0';           // 配置文件版本
  config['data'] = items;               // 配置文件数据
  config['hash'] = await sha256(JSON.stringify(config['data']));  // 计算数据的哈希值，用于校验

  // 将配置数据保存为 JSON 文件
  saveStringAsFile(JSON.stringify(config), 'LibreTV-Settings_' + times + '.json');
}

// 将字符串保存为文件
function saveStringAsFile(content, fileName) {
  // 创建Blob对象并指定类型
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  // 生成临时URL
  const url = window.URL.createObjectURL(blob);
  // 创建<a>标签并触发下载
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  // 清理临时对象
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// app.js 或路由文件中
const authMiddleware = require('./middleware/auth');
const config = require('./config');

// 对所有请求启用鉴权（按需调整作用范围）
if (config.auth.enabled) {
  app.use(authMiddleware);
}

// 或者针对特定路由
app.use('/api', authMiddleware);

// 生成视频唯一标识符的函数
function generateVideoIdentifier(title, sourceCode, vodId) {
  // 使用标题、来源代码和视频ID生成唯一标识符
  const cleanTitle = (title || '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').substring(0, 20);
  const cleanSource = (sourceCode || '').replace(/[^a-zA-Z0-9]/g, '');
  const cleanVodId = (vodId || '').replace(/[^a-zA-Z0-9]/g, '');

  // 如果有vodId，优先使用它作为主要标识符
  if (cleanVodId) {
    return `${cleanSource}_${cleanVodId}`;
  }

  // 否则使用标题和来源的组合
  return `${cleanSource}_${cleanTitle}`;
}

// 从模态框播放视频的全局函数
function playVideoFromModal(url, title, sourceCode, episodeIndex, vodId, apiParams) {
  // 使用现有的 playVideo 函数
  playVideo(url, title, sourceCode, episodeIndex, vodId || '', apiParams || '');
}

// 关闭模态框的全局函数
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  // 清除导航管理器中的模态框状态
  if (window.navigationManager) {
    window.navigationManager.clearModalState();
  }
}

// 确保函数在全局可用
window.playVideoFromModal = playVideoFromModal;
window.closeModal = closeModal;

