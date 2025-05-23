// iframe滚动支持代码 - 请在包含LibreTV iframe的外层页面中添加此代码

(function () {
  'use strict';

  let movieIframe = null;
  let isIframeReady = false;

  // 等待DOM加载完成
  document.addEventListener('DOMContentLoaded', function () {
    initIframeScrollSupport();
  });

  // 如果DOM已经加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIframeScrollSupport);
  } else {
    initIframeScrollSupport();
  }

  function initIframeScrollSupport() {
    // 查找iframe元素
    movieIframe = document.getElementById('movie-iframe');

    if (!movieIframe) {
      // 如果没有找到指定ID的iframe，尝试查找其他可能的iframe
      const iframes = document.querySelectorAll('iframe');
      for (let iframe of iframes) {
        if (iframe.src && iframe.src.includes('movie.tnanko.top')) {
          movieIframe = iframe;
          break;
        }
      }
    }

    if (!movieIframe) {
      console.log('未找到LibreTV iframe，10秒后重试');
      setTimeout(initIframeScrollSupport, 10000);
      return;
    }

    console.log('找到LibreTV iframe，开始监听滚动');

    // 监听iframe发送的消息
    window.addEventListener('message', handleIframeMessage);

    // 监听页面滚动事件
    let scrollTimeout;
    window.addEventListener('scroll', function () {
      // 防抖处理，避免过于频繁的消息发送
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () {
        if (isIframeReady && movieIframe) {
          sendScrollDataToIframe();
        }
      }, 100);
    }, { passive: true });

    // 监听窗口大小变化
    window.addEventListener('resize', function () {
      if (isIframeReady && movieIframe) {
        sendScrollDataToIframe();
      }
    });

    // 定期发送滚动数据（备用方案）
    setInterval(function () {
      if (isIframeReady && movieIframe) {
        sendScrollDataToIframe();
      }
    }, 2000);
  }

  function handleIframeMessage(event) {
    // 验证消息来源
    if (!movieIframe || event.source !== movieIframe.contentWindow) {
      return;
    }

    if (event.data && event.data.type === 'iframeReady' && event.data.source === 'LibreTV') {
      console.log('LibreTV iframe已准备就绪');
      isIframeReady = true;
      // 立即发送一次滚动数据
      sendScrollDataToIframe();
    }
  }

  function sendScrollDataToIframe() {
    if (!movieIframe || !isIframeReady) {
      return;
    }

    try {
      const scrollData = {
        type: 'parentScroll',
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        windowHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        timestamp: Date.now()
      };

      movieIframe.contentWindow.postMessage(scrollData, '*');

      // 调试信息（可以注释掉）
      console.log('发送滚动数据到iframe:', scrollData);

    } catch (e) {
      console.error('发送消息到iframe失败:', e);
    }
  }

  // 检查iframe是否在视窗内
  function isIframeInViewport() {
    if (!movieIframe) return false;

    const rect = movieIframe.getBoundingClientRect();
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

})(); 