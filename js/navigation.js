/**
 * LibreTV True SPA Navigation Manager
 * 使用原生 HTML5 History API 的真正单页应用导航系统
 */

class TrueSPANavigationManager {
  constructor() {
    this.currentState = {
      page: 'home',
      searchQuery: '',
      searchResults: [],
      scrollPosition: 0,
      modalOpen: false,
      modalVideoData: null,
      modalEpisodes: []
    };

    this.pageElements = {
      searchArea: null,
      resultsArea: null,
      doubanArea: null,
      modal: null,
      backButton: null
    };

    this.init();
  }

  // 初始化SPA导航管理器
  init() {
    this.cacheElements();
    this.setupHistoryListener();
    this.setupInitialState();
    console.log('True SPA Navigation Manager initialized');
  }

  // 缓存DOM元素
  cacheElements() {
    this.pageElements.searchArea = document.getElementById('searchArea');
    this.pageElements.resultsArea = document.getElementById('resultsArea');
    this.pageElements.doubanArea = document.getElementById('doubanArea');
    this.pageElements.modal = document.getElementById('modal');
    this.pageElements.backButton = document.getElementById('backButton');
  }

  // 设置历史记录监听器
  setupHistoryListener() {
    window.addEventListener('popstate', (event) => {
      if (event.state) {
        console.log('Popstate event:', event.state);
        this.restoreState(event.state);
      } else {
        // 如果没有状态，回到首页
        this.showHomePage();
      }
    });
  }

  // 设置初始状态
  setupInitialState() {
    // 检查当前URL是否有状态需要恢复
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath === '/' || currentPath === '/index.html' || currentPath === '') {
      this.showHomePage();
      // 替换当前历史记录条目
      history.replaceState(this.currentState, '', '/');
    }
  }

  // 导航到搜索页面
  navigateToSearch(query, results) {
    // 保存当前滚动位置
    this.currentState.scrollPosition = window.pageYOffset;

    // 更新状态
    this.currentState = {
      page: 'search',
      searchQuery: query,
      searchResults: results,
      scrollPosition: 0,
      modalOpen: false,
      modalVideoData: null,
      modalEpisodes: []
    };

    // 推送新的历史记录条目
    history.pushState(this.currentState, `搜索: ${query}`, `/?q=${encodeURIComponent(query)}`);

    // 立即显示搜索页面
    this.showSearchPage();
  }

  // 导航到首页
  navigateToHome() {
    // 如果已经在首页，不做任何操作
    if (this.currentState.page === 'home') {
      return;
    }

    // 更新状态
    this.currentState = {
      page: 'home',
      searchQuery: '',
      searchResults: [],
      scrollPosition: 0,
      modalOpen: false,
      modalVideoData: null,
      modalEpisodes: []
    };

    // 推送新的历史记录条目
    history.pushState(this.currentState, 'LibreTV - 首页', '/');

    // 立即显示首页
    this.showHomePage();
  }

  // 显示首页
  showHomePage() {
    // 关闭模态框
    this.closeModal();

    // 隐藏搜索结果区域
    if (this.pageElements.resultsArea) {
      this.pageElements.resultsArea.classList.add('hidden');
    }

    // 显示搜索区域（首页模式）
    if (this.pageElements.searchArea) {
      this.pageElements.searchArea.style.display = 'flex';
      this.pageElements.searchArea.classList.add('flex-1');
      this.pageElements.searchArea.classList.remove('mb-8');
    }

    // 显示豆瓣区域（如果启用）
    if (this.pageElements.doubanArea && localStorage.getItem('doubanEnabled') === 'true') {
      this.pageElements.doubanArea.style.display = 'block';
      this.pageElements.doubanArea.classList.remove('hidden');
    }

    // 清空搜索框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }

    // 隐藏返回按钮
    this.updateBackButton();

    // 滚动到顶部
    window.scrollTo(0, 0);

    console.log('Showing home page');
  }

  // 显示搜索页面
  showSearchPage() {
    // 关闭模态框（如果当前状态没有模态框）
    if (!this.currentState.modalOpen) {
      this.closeModal();
    }

    // 显示搜索区域（搜索模式）
    if (this.pageElements.searchArea) {
      this.pageElements.searchArea.style.display = 'flex';
      this.pageElements.searchArea.classList.remove('flex-1');
      this.pageElements.searchArea.classList.add('mb-8');
    }

    // 显示搜索结果区域
    if (this.pageElements.resultsArea) {
      this.pageElements.resultsArea.classList.remove('hidden');
    }

    // 隐藏豆瓣区域
    if (this.pageElements.doubanArea) {
      this.pageElements.doubanArea.style.display = 'none';
    }

    // 恢复搜索框内容
    const searchInput = document.getElementById('searchInput');
    if (searchInput && this.currentState.searchQuery) {
      searchInput.value = this.currentState.searchQuery;
    }

    // 恢复搜索结果
    if (this.currentState.searchResults && this.currentState.searchResults.length > 0) {
      this.renderSearchResults(this.currentState.searchResults);
    }

    // 显示返回按钮
    this.updateBackButton();

    // 恢复模态框状态（如果需要）
    if (this.currentState.modalOpen && this.currentState.modalVideoData) {
      setTimeout(() => {
        this.showVideoModal(this.currentState.modalVideoData, this.currentState.modalEpisodes);
      }, 50);
    }

    // 恢复滚动位置
    if (this.currentState.scrollPosition > 0) {
      setTimeout(() => {
        window.scrollTo(0, this.currentState.scrollPosition);
      }, 100);
    }

    console.log('Showing search page:', this.currentState.searchQuery);
  }

  // 恢复状态（用于popstate事件）
  restoreState(state) {
    this.currentState = state;

    switch (state.page) {
      case 'home':
        this.showHomePage();
        break;
      case 'search':
        this.showSearchPage();
        break;
      default:
        this.showHomePage();
    }
  }

  // 保存模态框状态
  saveModalState(videoData, episodes) {
    this.currentState.modalOpen = true;
    this.currentState.modalVideoData = videoData;
    this.currentState.modalEpisodes = episodes;

    // 更新当前历史记录条目
    history.replaceState(this.currentState, document.title, window.location.href);
  }

  // 清除模态框状态
  clearModalState() {
    this.currentState.modalOpen = false;
    this.currentState.modalVideoData = null;
    this.currentState.modalEpisodes = [];

    // 更新当前历史记录条目
    history.replaceState(this.currentState, document.title, window.location.href);
  }

  // 显示视频模态框
  showVideoModal(videoData, episodes) {
    const modal = this.pageElements.modal;
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalTitle || !modalContent) {
      console.warn('Modal elements not found');
      return;
    }

    // 设置模态框标题
    modalTitle.innerHTML = videoData.titleHtml || videoData.title || '未知视频';

    // 设置模态框内容
    if (videoData.contentHtml) {
      modalContent.innerHTML = videoData.contentHtml;
    } else if (episodes && episodes.length > 0) {
      modalContent.innerHTML = `
        <div class="flex justify-end mb-2">
          <button onclick="toggleEpisodeOrder('${videoData.sourceCode || ''}')" class="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform flex items-center justify-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
            </svg>
            <span>倒序排列</span>
          </button>
        </div>
        <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          ${this.renderEpisodesFromData(episodes, videoData)}
        </div>
      `;
    }

    // 显示模态框
    modal.classList.remove('hidden');

    console.log('Modal restored with video data:', videoData);
  }

  // 关闭模态框
  closeModal() {
    if (this.pageElements.modal) {
      this.pageElements.modal.classList.add('hidden');
    }
  }

  // 从数据渲染剧集按钮
  renderEpisodesFromData(episodes, videoData) {
    if (!episodes || episodes.length === 0) {
      return '<p class="text-center text-gray-400 py-8">没有找到可播放的视频</p>';
    }

    return episodes.map((episode, index) => {
      const episodeUrl = typeof episode === 'string' ? episode : episode.url;
      const episodeTitle = typeof episode === 'string' ? `第${index + 1}集` : (episode.title || `第${index + 1}集`);

      return `
        <button onclick="playVideoFromModal('${episodeUrl.replace(/'/g, "\\'")}','${(videoData.title || '').replace(/'/g, "\\'")}', '${videoData.sourceCode || ''}', ${index}, '${videoData.id || ''}', '${(videoData.apiParams || '').replace(/'/g, "\\'")}')" 
                class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn">
          ${episodeTitle}
        </button>
      `;
    }).join('');
  }

  // 渲染搜索结果
  renderSearchResults(results) {
    if (typeof window.renderResults === 'function') {
      window.renderResults(results);
    } else {
      console.warn('renderResults function not found');
    }

    // 更新搜索结果计数
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
      searchResultsCount.textContent = results ? results.length : 0;
    }
  }

  // 更新返回按钮
  updateBackButton() {
    if (this.pageElements.backButton) {
      if (this.canGoBack()) {
        this.pageElements.backButton.style.display = 'flex';
      } else {
        this.pageElements.backButton.style.display = 'none';
      }
    }
  }

  // 检查是否可以返回
  canGoBack() {
    return this.currentState.page !== 'home';
  }

  // 处理原生返回按钮
  handleNativeBack() {
    // 浏览器会自动触发popstate事件，我们只需要返回true表示已处理
    return true;
  }

  // 获取当前状态
  getCurrentState() {
    return { ...this.currentState };
  }

  // 调试信息
  getDebugInfo() {
    return {
      currentState: this.currentState,
      canGoBack: this.canGoBack(),
      historyLength: history.length
    };
  }
}

// 创建全局导航管理器实例
let trueSPANavigationManager = null;

// 初始化函数
function initTrueSPANavigationManager() {
  if (!trueSPANavigationManager) {
    trueSPANavigationManager = new TrueSPANavigationManager();
    window.navigationManager = trueSPANavigationManager;
    console.log('True SPA NavigationManager instance created');
  }
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTrueSPANavigationManager);
} else {
  initTrueSPANavigationManager();
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrueSPANavigationManager;
} 