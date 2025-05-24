// 豆瓣热门电影电视剧推荐功能

// 豆瓣标签列表 - 修改为默认标签
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

// 用户标签列表 - 存储用户实际使用的标签（包含保留的系统标签和用户添加的自定义标签）
let movieTags = [];
let tvTags = [];

// 加载用户标签
function loadUserTags() {
  try {
    // 尝试从本地存储加载用户保存的标签
    const savedMovieTags = localStorage.getItem('userMovieTags');
    const savedTvTags = localStorage.getItem('userTvTags');

    // 如果本地存储中有标签数据，则使用它
    if (savedMovieTags) {
      movieTags = JSON.parse(savedMovieTags);
    } else {
      // 否则使用默认标签
      movieTags = [...defaultMovieTags];
    }

    if (savedTvTags) {
      tvTags = JSON.parse(savedTvTags);
    } else {
      // 否则使用默认标签
      tvTags = [...defaultTvTags];
    }
  } catch (e) {
    console.error('加载标签失败：', e);
    // 初始化为默认值，防止错误
    movieTags = [...defaultMovieTags];
    tvTags = [...defaultTvTags];
  }
}

// 保存用户标签
function saveUserTags() {
  try {
    localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
    localStorage.setItem('userTvTags', JSON.stringify(tvTags));
  } catch (e) {
    console.error('保存标签失败：', e);
    showToast('保存标签失败', 'error');
  }
}

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16; // 一次显示的项目数量

// 添加无限滚动相关变量
let isLoadingMore = false; // 是否正在加载更多
let hasMoreContent = true; // 是否还有更多内容

// 初始化豆瓣功能
function initDouban() {
  console.log('初始化豆瓣功能');

  // 设置豆瓣开关的初始状态
  const doubanToggle = document.getElementById('doubanToggle');
  if (doubanToggle) {
    const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
    doubanToggle.checked = isEnabled;

    // 设置开关外观
    const toggleBg = doubanToggle.nextElementSibling;
    const toggleDot = toggleBg.nextElementSibling;
    if (isEnabled) {
      toggleBg.classList.add('bg-pink-600');
      toggleDot.classList.add('translate-x-6');
    }

    // 添加事件监听
    doubanToggle.addEventListener('change', function (e) {
      const isChecked = e.target.checked;
      localStorage.setItem('doubanEnabled', isChecked);

      // 更新开关外观
      if (isChecked) {
        toggleBg.classList.add('bg-pink-600');
        toggleDot.classList.add('translate-x-6');
      } else {
        toggleBg.classList.remove('bg-pink-600');
        toggleDot.classList.remove('translate-x-6');
      }

      // 更新显示状态
      updateDoubanVisibility();
    });

    // 初始更新显示状态
    updateDoubanVisibility();

    // 滚动到页面顶部
    window.scrollTo(0, 0);
  }

  // 加载用户标签
  loadUserTags();

  // 渲染电影/电视剧切换
  renderDoubanMovieTvSwitch();

  // 渲染豆瓣标签
  renderDoubanTags();

  // 换一批按钮事件监听
  setupDoubanRefreshBtn();

  // 初始加载热门内容
  if (localStorage.getItem('doubanEnabled') === 'true') {
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
  }

  // 初始化无限滚动
  initInfiniteScroll();

  // 确保在DOM完全加载后添加滚动监听
  if (document.readyState === 'complete') {
    initInfiniteScroll();
  } else {
    window.addEventListener('load', initInfiniteScroll);
  }
}

// 初始化无限滚动
function initInfiniteScroll() {
  // 移除之前的滚动监听器（如果存在）
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('scroll', handleScroll);

  // 检查是否在iframe中
  const isInIframe = window.self !== window.top;
  console.log('是否在iframe中:', isInIframe);

  // 只添加真正的滚动监听器
  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });

  // // 如果在iframe中，添加必要的滚动监听
  // if (isInIframe) {
  //   document.body.addEventListener('scroll', handleScroll, { passive: true });
  //   document.documentElement.addEventListener('scroll', handleScroll, { passive: true });

  //   // 监听来自父页面的消息（保留消息监听，但不自动触发检查）
  //   window.addEventListener('message', function (event) {
  //     if (event.data && event.data.type === 'TEST_SCROLL') {
  //       console.log('收到父页面滚动测试消息:', event.data);
  //       // 只在收到明确指令时检查
  //       handleScroll();
  //     }

  //     if (event.data && event.data.type === 'FORCE_SCROLL_CHECK') {
  //       console.log('收到强制滚动检查消息:', event.data);
  //       // 强制检查滚动状态
  //       forceScrollCheck();
  //     }
  //   });

  //   // 向父页面发送消息表示iframe已加载
  //   try {
  //     window.parent.postMessage({
  //       type: 'IFRAME_LOADED',
  //       message: 'LibreTV iframe已加载完成'
  //     }, '*');
  //   } catch (e) {
  //     console.log('无法向父页面发送消息:', e);
  //   }
  // }

  // 调试信息
  console.log('已初始化滚动监听器（仅手动滚动触发）');
}

// 处理滚动事件
function handleScroll() {
  // 检查豆瓣区域是否可见
  const doubanArea = document.getElementById('doubanArea');
  if (!doubanArea || doubanArea.classList.contains('hidden')) {
    return;
  }

  // 检查是否正在加载或没有更多内容
  if (isLoadingMore || !hasMoreContent) {
    return;
  }

  // 检查是否在iframe中
  const isInIframe = window.self !== window.top;

  // 获取滚动位置和高度信息
  let scrollHeight, scrollTop, clientHeight;

  if (isInIframe) {
    // 在iframe中，尝试获取多种高度和滚动位置
    scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight
    );

    scrollTop = Math.max(
      document.documentElement.scrollTop,
      document.body.scrollTop,
      window.pageYOffset || 0,
      window.scrollY || 0
    );

    clientHeight = Math.max(
      document.documentElement.clientHeight,
      document.body.clientHeight,
      window.innerHeight || 0
    );
  } else {
    // 非iframe环境，使用标准方法
    scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight
    );

    scrollTop = Math.max(
      document.documentElement.scrollTop,
      document.body.scrollTop,
      window.pageYOffset || 0
    );

    clientHeight = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    );
  }

  // 调试信息
  console.log('滚动检查 - iframe模式:', isInIframe, '高度:', scrollHeight, '滚动位置:', scrollTop, '视窗高度:', clientHeight);
  console.log('当前位置:', scrollTop + clientHeight, '触发位置:', scrollHeight - 100);

  // 只有真正滚动到接近底部时才触发加载（使用更保守的阈值）
  const triggerThreshold = 100; // 统一使用100px的阈值，不区分iframe

  if (scrollTop + clientHeight >= scrollHeight - triggerThreshold) {
    console.log('用户滚动到底部，触发加载更多内容');
    loadMoreDoubanContent();
  }
}

// 加载更多豆瓣内容
function loadMoreDoubanContent() {
  console.log('开始加载更多内容, 当前页面起始位置:', doubanPageStart);

  if (isLoadingMore) {
    console.log('已在加载中，跳过');
    return;
  }

  isLoadingMore = true;

  // 计算下一页起始位置
  let nextPageStart = doubanPageStart + doubanPageSize;

  // 如果当前是第一页(doubanPageStart=0)，则从第二页开始加载
  if (doubanPageStart === 0) {
    nextPageStart = doubanPageSize; // 从第二页开始
  }

  console.log('下一页起始位置:', nextPageStart);

  // 检查是否超过最大页数限制
  if (nextPageStart > 9 * doubanPageSize) {
    console.log('已达到最大页数限制，尝试切换到下一个标签');

    // 尝试切换到下一个标签
    switchToNextTag();
    return;
  }

  // 显示加载指示器
  showLoadMoreIndicator('正在加载更多...');

  // 请求新内容
  const target = `https://movie.douban.com/j/search_subjects?type=${doubanMovieTvCurrentSwitch}&tag=${doubanCurrentTag}&sort=recommend&page_limit=${doubanPageSize}&page_start=${nextPageStart}`;

  fetchDoubanData(target)
    .then(data => {
      console.log('加载成功，数据条数:', data.subjects ? data.subjects.length : 0);
      if (data.subjects && data.subjects.length > 0) {
        // 将新内容追加到现有内容后面
        appendDoubanCards(data);
        doubanPageStart = nextPageStart;
      } else {
        // 没有更多内容了，尝试切换到下一个标签
        switchToNextTag();
      }
    })
    .catch(error => {
      console.error('加载更多豆瓣数据失败：', error);
      showLoadMoreIndicator('加载失败，请稍后重试', true);
    })
    .finally(() => {
      isLoadingMore = false;
      // 3秒后隐藏加载指示器
      setTimeout(hideLoadMoreIndicator, 3000);
    });
}

// 切换到下一个标签
function switchToNextTag() {
  // 获取当前标签列表
  const isMovie = doubanMovieTvCurrentSwitch === 'movie';
  const currentTags = isMovie ? movieTags : tvTags;

  // 找到当前标签的索引
  const currentIndex = currentTags.indexOf(doubanCurrentTag);

  // 如果找到当前标签，并且不是最后一个标签
  if (currentIndex !== -1 && currentIndex < currentTags.length - 1) {
    // 切换到下一个标签
    const nextTag = currentTags[currentIndex + 1];
    console.log('自动切换到下一个标签:', nextTag);

    // 更新当前标签
    doubanCurrentTag = nextTag;
    doubanPageStart = 0;

    // 重置无限滚动状态
    hasMoreContent = true;
    isLoadingMore = false;
    hideLoadMoreIndicator();

    // 重新渲染标签和内容
    renderDoubanTags();
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);

    // 显示提示
    showToast(`已自动切换到"${nextTag}"标签`, 'info');
  } else if (currentIndex === currentTags.length - 1) {
    // 如果是最后一个标签，切换到另一种类型（电影/电视剧）
    const nextType = isMovie ? 'tv' : 'movie';
    const nextTags = isMovie ? tvTags : movieTags;

    if (nextTags.length > 0) {
      console.log('已浏览完所有标签，切换到', nextType === 'movie' ? '电影' : '电视剧');

      // 更新类型和标签
      doubanMovieTvCurrentSwitch = nextType;
      doubanCurrentTag = nextTags[0]; // 使用第一个标签
      doubanPageStart = 0;

      // 重置无限滚动状态
      hasMoreContent = true;
      isLoadingMore = false;
      hideLoadMoreIndicator();

      // 更新UI
      const movieToggle = document.getElementById('douban-movie-toggle');
      const tvToggle = document.getElementById('douban-tv-toggle');

      if (nextType === 'movie') {
        movieToggle.classList.add('bg-pink-600', 'text-white');
        movieToggle.classList.remove('text-gray-300');
        tvToggle.classList.remove('bg-pink-600', 'text-white');
        tvToggle.classList.add('text-gray-300');
      } else {
        tvToggle.classList.add('bg-pink-600', 'text-white');
        tvToggle.classList.remove('text-gray-300');
        movieToggle.classList.remove('bg-pink-600', 'text-white');
        movieToggle.classList.add('text-gray-300');
      }

      // 重新渲染标签和内容
      renderDoubanTags();
      renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);

      // 显示提示
      showToast(`已切换到${nextType === 'movie' ? '电影' : '电视剧'}分类`, 'info');
    } else {
      // 实在没有更多内容了
      hasMoreContent = false;
      showLoadMoreIndicator('已浏览完所有内容', true);
    }
  } else {
    // 找不到当前标签或出错
    hasMoreContent = false;
    showLoadMoreIndicator('已加载所有内容，点击"换一批"查看更多', true);
  }
}

// 显示加载更多指示器
function showLoadMoreIndicator(message, isError = false) {
  let indicator = document.getElementById('load-more-indicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'load-more-indicator';
    indicator.className = 'text-center py-4 text-sm';

    // 在豆瓣结果容器后面添加指示器
    const doubanContainer = document.getElementById('douban-results').parentElement;
    doubanContainer.appendChild(indicator);
  }

  // 检查是否在iframe中
  const isInIframe = window.self !== window.top;

  indicator.className = `text-center py-4 text-sm ${isError ? 'text-red-400' : 'text-gray-400'}`;

  if (isError) {
    indicator.innerHTML = `<div class="text-red-400">${message}</div>`;
  } else {
    indicator.innerHTML = `
        <div class="flex items-center justify-center">
            <div class="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span class="text-pink-500">${message}</span>
        </div>
    `;
  }

  // 如果在iframe中且已经加载完所有内容，添加手动加载按钮
  if (isInIframe && (message.includes('已加载所有内容') || message.includes('已浏览完'))) {
    indicator.innerHTML += `
        <div class="mt-4">
            <button 
                onclick="manualLoadMore()" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                手动加载更多
            </button>
            <p class="text-xs text-gray-500 mt-2">在iframe环境中，您可以点击此按钮手动加载更多内容</p>
        </div>
    `;
  }

  indicator.style.display = 'block';
}

// 手动加载更多内容的函数
window.manualLoadMore = function () {
  console.log('手动触发加载更多');

  // 重置状态
  hasMoreContent = true;
  isLoadingMore = false;

  // 强制触发加载
  loadMoreDoubanContent();
};

// 隐藏加载更多指示器
function hideLoadMoreIndicator() {
  const indicator = document.getElementById('load-more-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// 追加豆瓣卡片（不清空现有内容）
function appendDoubanCards(data) {
  const container = document.getElementById("douban-results");
  if (!container) return;

  // 创建文档片段以提高性能
  const fragment = document.createDocumentFragment();

  // 循环创建每个影视卡片
  data.subjects.forEach(item => {
    const card = document.createElement("div");
    card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";

    // 生成卡片内容，确保安全显示（防止XSS）
    const safeTitle = item.title
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const safeRate = (item.rate || "暂无")
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 处理图片URL
    const originalCoverUrl = item.cover;
    const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);

    card.innerHTML = `
      <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
        <img src="${originalCoverUrl}" alt="${safeTitle}" 
          class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
          loading="lazy" referrerpolicy="no-referrer">
        <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
        <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
          <span class="text-yellow-400">★</span> ${safeRate}
        </div>
        <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors">
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="在豆瓣查看">
            🔗
          </a>
        </div>
      </div>
      <div class="p-2 text-center bg-[#111]">
        <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
          class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition"
          title="${safeTitle}">
          ${safeTitle}
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  // 将新卡片追加到容器中
  container.appendChild(fragment);
}

// 根据设置更新豆瓣区域的显示状态
function updateDoubanVisibility() {
  const doubanArea = document.getElementById('doubanArea');
  if (!doubanArea) return;

  const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
  const isSearching = document.getElementById('resultsArea') &&
    !document.getElementById('resultsArea').classList.contains('hidden');

  // 只有在启用且没有搜索结果显示时才显示豆瓣区域
  if (isEnabled && !isSearching) {
    doubanArea.classList.remove('hidden');
    // 如果豆瓣结果为空，重新加载
    if (document.getElementById('douban-results').children.length === 0) {
      renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    }
  } else {
    doubanArea.classList.add('hidden');
  }
}

// 只填充搜索框，不执行搜索，让用户自主决定搜索时机
function fillSearchInput(title) {
  if (!title) return;

  // 安全处理标题，防止XSS
  const safeTitle = title
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const input = document.getElementById('searchInput');
  if (input) {
    input.value = safeTitle;

    // 聚焦搜索框，便于用户立即使用键盘操作
    input.focus();

    // 显示一个提示，告知用户点击搜索按钮进行搜索
    showToast('已填充搜索内容，点击搜索按钮开始搜索', 'info');
  }
}

// 填充搜索框并执行搜索
function fillAndSearch(title) {
  if (!title) return;

  // 安全处理标题，防止XSS
  const safeTitle = title
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const input = document.getElementById('searchInput');
  if (input) {
    input.value = safeTitle;
    search(); // 使用已有的search函数执行搜索
  }
}

// 填充搜索框，确保豆瓣资源API被选中，然后执行搜索
function fillAndSearchWithDouban(title) {
  if (!title) return;

  // 安全处理标题，防止XSS
  const safeTitle = title
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 确保豆瓣资源API被选中
  if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
    // 在设置中勾选豆瓣资源API复选框
    const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
    if (doubanCheckbox) {
      doubanCheckbox.checked = true;

      // 触发updateSelectedAPIs函数以更新状态
      if (typeof updateSelectedAPIs === 'function') {
        updateSelectedAPIs();
      } else {
        // 如果函数不可用，则手动添加到selectedAPIs
        selectedAPIs.push('dbzy');
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

        // 更新选中API计数（如果有这个元素）
        const countEl = document.getElementById('selectedAPICount');
        if (countEl) {
          countEl.textContent = selectedAPIs.length;
        }
      }

      showToast('已自动选择豆瓣资源API', 'info');
    }
  }

  // 填充搜索框并执行搜索
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = safeTitle;
    search(); // 使用已有的search函数执行搜索
  }
}

// 渲染电影/电视剧切换器
function renderDoubanMovieTvSwitch() {
  // 获取切换按钮元素
  const movieToggle = document.getElementById('douban-movie-toggle');
  const tvToggle = document.getElementById('douban-tv-toggle');

  if (!movieToggle || !tvToggle) return;

  movieToggle.addEventListener('click', function () {
    if (doubanMovieTvCurrentSwitch !== 'movie') {
      // 更新按钮样式
      movieToggle.classList.add('bg-pink-600', 'text-white');
      movieToggle.classList.remove('text-gray-300');

      tvToggle.classList.remove('bg-pink-600', 'text-white');
      tvToggle.classList.add('text-gray-300');

      doubanMovieTvCurrentSwitch = 'movie';
      doubanCurrentTag = '热门';
      doubanPageStart = 0;

      // 重置无限滚动状态
      hasMoreContent = true;
      isLoadingMore = false;
      hideLoadMoreIndicator();

      // 重新加载豆瓣内容
      renderDoubanTags(movieTags);

      // 换一批按钮事件监听
      setupDoubanRefreshBtn();

      // 初始加载热门内容
      if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);
      }
    }
  });

  // 电视剧按钮点击事件
  tvToggle.addEventListener('click', function () {
    if (doubanMovieTvCurrentSwitch !== 'tv') {
      // 更新按钮样式
      tvToggle.classList.add('bg-pink-600', 'text-white');
      tvToggle.classList.remove('text-gray-300');

      movieToggle.classList.remove('bg-pink-600', 'text-white');
      movieToggle.classList.add('text-gray-300');

      doubanMovieTvCurrentSwitch = 'tv';
      doubanCurrentTag = '热门';
      doubanPageStart = 0;

      // 重置无限滚动状态
      hasMoreContent = true;
      isLoadingMore = false;
      hideLoadMoreIndicator();

      // 重新加载豆瓣内容
      renderDoubanTags(tvTags);

      // 换一批按钮事件监听
      setupDoubanRefreshBtn();

      // 初始加载热门内容
      if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);
      }
    }
  });
}

// 渲染豆瓣标签选择器
function renderDoubanTags(tags) {
  const tagContainer = document.getElementById('douban-tags');
  if (!tagContainer) return;

  // 确定当前应该使用的标签列表
  const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;

  // 清空标签容器
  tagContainer.innerHTML = '';

  // 先添加标签管理按钮
  const manageBtn = document.createElement('button');
  manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white';
  manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
  manageBtn.onclick = function () {
    showTagManageModal();
  };
  tagContainer.appendChild(manageBtn);

  // 添加所有标签
  currentTags.forEach(tag => {
    const btn = document.createElement('button');

    // 设置样式
    let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 ';

    // 当前选中的标签使用高亮样式
    if (tag === doubanCurrentTag) {
      btnClass += 'bg-pink-600 text-white shadow-md';
    } else {
      btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white';
    }

    btn.className = btnClass;
    btn.textContent = tag;

    btn.onclick = function () {
      if (doubanCurrentTag !== tag) {
        doubanCurrentTag = tag;
        doubanPageStart = 0;
        // 重置无限滚动状态
        hasMoreContent = true;
        isLoadingMore = false;
        hideLoadMoreIndicator();
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);
        renderDoubanTags();
      }
    };

    tagContainer.appendChild(btn);
  });
}

// 设置换一批按钮事件
function setupDoubanRefreshBtn() {
  // 修复ID，使用正确的ID douban-refresh 而不是 douban-refresh-btn
  const btn = document.getElementById('douban-refresh');
  if (!btn) return;

  btn.onclick = function () {
    // 换一批操作：每次增加页面偏移
    doubanPageStart += doubanPageSize;

    // 如果超过最大页数限制，回到第一页
    if (doubanPageStart > 9 * doubanPageSize) {
      doubanPageStart = 0;
    }

    // 重置无限滚动状态
    hasMoreContent = true;
    isLoadingMore = false;
    hideLoadMoreIndicator();

    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);
  };
}

function fetchDoubanTags() {
  const movieTagsTarget = `https://movie.douban.com/j/search_tags?type=movie`
  fetchDoubanData(movieTagsTarget)
    .then(data => {
      movieTags = data.tags;
      if (doubanMovieTvCurrentSwitch === 'movie') {
        renderDoubanTags(movieTags);
      }
    })
    .catch(error => {
      console.error("获取豆瓣热门电影标签失败：", error);
    });
  const tvTagsTarget = `https://movie.douban.com/j/search_tags?type=tv`
  fetchDoubanData(tvTagsTarget)
    .then(data => {
      tvTags = data.tags;
      if (doubanMovieTvCurrentSwitch === 'tv') {
        renderDoubanTags(tvTags);
      }
    })
    .catch(error => {
      console.error("获取豆瓣热门电视剧标签失败：", error);
    });
}

// 渲染热门推荐内容
function renderRecommend(tag, pageLimit, pageStart, isRefresh = false) {
  const container = document.getElementById("douban-results");
  if (!container) return;

  console.log('渲染推荐内容:', tag, pageLimit, pageStart, isRefresh);

  // 如果是刷新操作或者重新加载，重置无限滚动状态
  if (isRefresh || pageStart === 0) {
    hasMoreContent = true;
    isLoadingMore = false;
    hideLoadMoreIndicator();
  }

  const loadingOverlay = document.createElement("div");
  loadingOverlay.classList.add(
    "absolute",
    "inset-0",
    "bg-gray-100",
    "bg-opacity-75",
    "flex",
    "items-center",
    "justify-center",
    "z-10"
  );

  const loadingContent = document.createElement("div");
  loadingContent.innerHTML = `
      <div class="flex items-center justify-center">
          <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
          <span class="text-pink-500 ml-4">加载中...</span>
      </div>
    `;
  loadingOverlay.appendChild(loadingContent);

  // 冻结原有内容，并添加加载状态
  container.classList.add("relative");
  container.appendChild(loadingOverlay);

  const target = `https://movie.douban.com/j/search_subjects?type=${doubanMovieTvCurrentSwitch}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;
  console.log('请求URL:', target);

  // 使用通用请求函数
  fetchDoubanData(target)
    .then(data => {
      console.log('渲染内容数据:', data.subjects ? data.subjects.length : 0);
      renderDoubanCards(data, container);
    })
    .catch(error => {
      console.error("获取豆瓣数据失败：", error);
      container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-red-400">❌ 获取豆瓣数据失败，请稍后重试</div>
                    <div class="text-gray-500 text-sm mt-2">提示：使用VPN可能有助于解决此问题</div>
                </div>
            `;
    });
}

async function fetchDoubanData(url) {
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 设置请求选项，包括信号和头部
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Referer': 'https://movie.douban.com/',
      'Accept': 'application/json, text/plain, */*',
    }
  };

  try {
    // 尝试直接访问（豆瓣API可能允许部分CORS请求）
    const response = await fetch(PROXY_URL + encodeURIComponent(url), fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error("豆瓣 API 请求失败（直接代理）：", err);

    // 失败后尝试备用方法：作为备选
    const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    try {
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        throw new Error(`备用API请求失败! 状态: ${fallbackResponse.status}`);
      }

      const data = await fallbackResponse.json();

      // 解析原始内容
      if (data && data.contents) {
        return JSON.parse(data.contents);
      } else {
        throw new Error("无法获取有效数据");
      }
    } catch (fallbackErr) {
      console.error("豆瓣 API 备用请求也失败：", fallbackErr);
      throw fallbackErr; // 向上抛出错误，让调用者处理
    }
  }
}

// 抽取渲染豆瓣卡片的逻辑到单独函数
function renderDoubanCards(data, container) {
  // 创建文档片段以提高性能
  const fragment = document.createDocumentFragment();

  // 如果没有数据
  if (!data.subjects || data.subjects.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "col-span-full text-center py-8";
    emptyEl.innerHTML = `
            <div class="text-pink-500">❌ 暂无数据，请尝试其他分类或刷新</div>
        `;
    fragment.appendChild(emptyEl);
  } else {
    // 循环创建每个影视卡片
    data.subjects.forEach(item => {
      const card = document.createElement("div");
      card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";

      // 生成卡片内容，确保安全显示（防止XSS）
      const safeTitle = item.title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const safeRate = (item.rate || "暂无")
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // 处理图片URL
      // 1. 直接使用豆瓣图片URL (添加no-referrer属性)
      const originalCoverUrl = item.cover;

      // 2. 也准备代理URL作为备选
      const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);

      // 为不同设备优化卡片布局
      card.innerHTML = `
                <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    <img src="${originalCoverUrl}" alt="${safeTitle}" 
                        class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                        loading="lazy" referrerpolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                        <span class="text-yellow-400">★</span> ${safeRate}
                    </div>
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="在豆瓣查看">
                            🔗
                        </a>
                    </div>
                </div>
                <div class="p-2 text-center bg-[#111]">
                    <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
                            class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition"
                            title="${safeTitle}">
                        ${safeTitle}
                    </button>
                </div>
            `;

      fragment.appendChild(card);
    });
  }

  // 清空并添加所有新元素
  container.innerHTML = "";
  container.appendChild(fragment);
}

// 重置到首页
function resetToHome() {
  resetSearchArea();
  updateDoubanVisibility();
}

// 加载豆瓣首页内容
document.addEventListener('DOMContentLoaded', initDouban);

// 显示标签管理模态框
function showTagManageModal() {
  // 确保模态框在页面上只有一个实例
  let modal = document.getElementById('tagManageModal');
  if (modal) {
    document.body.removeChild(modal);
  }

  // 创建模态框元素
  modal = document.createElement('div');
  modal.id = 'tagManageModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';

  // 当前使用的标签类型和默认标签
  const isMovie = doubanMovieTvCurrentSwitch === 'movie';
  const currentTags = isMovie ? movieTags : tvTags;
  const defaultTags = isMovie ? defaultMovieTags : defaultTvTags;

  // 模态框内容
  modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeTagModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            
            <h3 class="text-xl font-bold text-white mb-4">标签管理 (${isMovie ? '电影' : '电视剧'})</h3>
            
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-medium text-gray-300">标签列表</h4>
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                        恢复默认标签
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4" id="tagsGrid">
                    ${currentTags.length ? currentTags.map(tag => {
    // "热门"标签不能删除
    const canDelete = tag !== '热门';
    return `
                            <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group">
                                <span>${tag}</span>
                                ${canDelete ?
        `<button class="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        data-tag="${tag}">✕</button>` :
        `<span class="text-gray-500 text-xs italic opacity-0 group-hover:opacity-100">必需</span>`
      }
                            </div>
                        `;
  }).join('') :
      `<div class="col-span-full text-center py-4 text-gray-500">无标签，请添加或恢复默认</div>`}
                </div>
            </div>
            
            <div class="border-t border-gray-700 pt-4">
                <h4 class="text-lg font-medium text-gray-300 mb-3">添加新标签</h4>
                <form id="addTagForm" class="flex items-center">
                    <input type="text" id="newTagInput" placeholder="输入标签名称..." 
                           class="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500">
                    <button type="submit" class="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded">添加</button>
                </form>
                <p class="text-xs text-gray-500 mt-2">提示：标签名称不能为空，不能重复，不能包含特殊字符</p>
            </div>
        </div>
    `;

  // 添加模态框到页面
  document.body.appendChild(modal);

  // 焦点放在输入框上
  setTimeout(() => {
    document.getElementById('newTagInput').focus();
  }, 100);

  // 添加事件监听器 - 关闭按钮
  document.getElementById('closeTagModal').addEventListener('click', function () {
    document.body.removeChild(modal);
  });

  // 添加事件监听器 - 点击模态框外部关闭
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // 添加事件监听器 - 恢复默认标签按钮
  document.getElementById('resetTagsBtn').addEventListener('click', function () {
    resetTagsToDefault();
    showTagManageModal(); // 重新加载模态框
  });

  // 添加事件监听器 - 删除标签按钮
  const deleteButtons = document.querySelectorAll('.delete-tag-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const tagToDelete = this.getAttribute('data-tag');
      deleteTag(tagToDelete);
      showTagManageModal(); // 重新加载模态框
    });
  });

  // 添加事件监听器 - 表单提交
  document.getElementById('addTagForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('newTagInput');
    const newTag = input.value.trim();

    if (newTag) {
      addTag(newTag);
      input.value = '';
      showTagManageModal(); // 重新加载模态框
    }
  });
}

// 添加标签
function addTag(tag) {
  // 安全处理标签名，防止XSS
  const safeTag = tag
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 确定当前使用的是电影还是电视剧标签
  const isMovie = doubanMovieTvCurrentSwitch === 'movie';
  const currentTags = isMovie ? movieTags : tvTags;

  // 检查是否已存在（忽略大小写）
  const exists = currentTags.some(
    existingTag => existingTag.toLowerCase() === safeTag.toLowerCase()
  );

  if (exists) {
    showToast('标签已存在', 'warning');
    return;
  }

  // 添加到对应的标签数组
  if (isMovie) {
    movieTags.push(safeTag);
  } else {
    tvTags.push(safeTag);
  }

  // 保存到本地存储
  saveUserTags();

  // 重新渲染标签
  renderDoubanTags();

  showToast('标签添加成功', 'success');
}

// 删除标签
function deleteTag(tag) {
  // 热门标签不能删除
  if (tag === '热门') {
    showToast('热门标签不能删除', 'warning');
    return;
  }

  // 确定当前使用的是电影还是电视剧标签
  const isMovie = doubanMovieTvCurrentSwitch === 'movie';
  const currentTags = isMovie ? movieTags : tvTags;

  // 寻找标签索引
  const index = currentTags.indexOf(tag);

  // 如果找到标签，则删除
  if (index !== -1) {
    currentTags.splice(index, 1);

    // 保存到本地存储
    saveUserTags();

    // 如果当前选中的是被删除的标签，则重置为"热门"
    if (doubanCurrentTag === tag) {
      doubanCurrentTag = '热门';
      doubanPageStart = 0;
      // 重置无限滚动状态
      hasMoreContent = true;
      isLoadingMore = false;
      hideLoadMoreIndicator();
      renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);
    }

    // 重新渲染标签
    renderDoubanTags();

    showToast('标签删除成功', 'success');
  }
}

// 重置为默认标签
function resetTagsToDefault() {
  // 确定当前使用的是电影还是电视剧
  const isMovie = doubanMovieTvCurrentSwitch === 'movie';

  // 重置为默认标签
  if (isMovie) {
    movieTags = [...defaultMovieTags];
  } else {
    tvTags = [...defaultTvTags];
  }

  // 设置当前标签为热门
  doubanCurrentTag = '热门';
  doubanPageStart = 0;

  // 重置无限滚动状态
  hasMoreContent = true;
  isLoadingMore = false;
  hideLoadMoreIndicator();

  // 保存到本地存储
  saveUserTags();

  // 重新渲染标签和内容
  renderDoubanTags();
  renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart, true);

  showToast('已恢复默认标签', 'success');
}

// 强制滚动检查（仅在明确需要时触发）
function forceScrollCheck() {
  console.log('执行强制滚动检查');

  // 检查豆瓣区域是否可见
  const doubanArea = document.getElementById('doubanArea');
  if (!doubanArea || doubanArea.classList.contains('hidden')) {
    console.log('豆瓣区域不可见，跳过检查');
    return;
  }

  // 如果正在加载，跳过
  if (isLoadingMore) {
    console.log('正在加载中，跳过强制检查');
    return;
  }

  // 检查是否还有更多内容可以加载
  if (!hasMoreContent) {
    console.log('没有更多内容可加载');
    return;
  }

  // 检查豆瓣结果容器
  const doubanResults = document.getElementById('douban-results');
  if (!doubanResults) {
    console.log('找不到豆瓣结果容器');
    return;
  }

  // 检查当前内容数量
  const currentCards = doubanResults.children.length;
  console.log('当前卡片数量:', currentCards);

  // 检查容器高度和视窗高度
  const containerHeight = doubanResults.offsetHeight;
  const viewportHeight = window.innerHeight;
  const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

  console.log('容器高度:', containerHeight, '视窗高度:', viewportHeight, '文档高度:', documentHeight);

  // 只有在明确需要时才加载（更保守的条件）
  let shouldLoad = false;

  // 条件1：卡片数量为0（初始状态）
  if (currentCards === 0) {
    console.log('没有内容，触发初始加载');
    shouldLoad = true;
  }

  // 条件2：使用 getBoundingClientRect 检查是否真的滚动到底部
  const rect = doubanResults.getBoundingClientRect();
  const containerBottom = rect.bottom;
  if (containerBottom <= viewportHeight + 50) { // 更严格的阈值
    console.log('容器底部接近视窗底部，触发加载');
    shouldLoad = true;
  }

  if (shouldLoad) {
    console.log('强制滚动检查：触发加载更多内容');
    loadMoreDoubanContent();
  } else {
    console.log('强制滚动检查：暂不需要加载更多');

    // 向父页面发送状态消息
    try {
      window.parent.postMessage({
        type: 'SCROLL_STATUS',
        needMore: false,
        currentCards: currentCards,
        containerHeight: containerHeight,
        viewportHeight: viewportHeight
      }, '*');
    } catch (e) {
      console.log('无法向父页面发送状态消息:', e);
    }
  }
}
