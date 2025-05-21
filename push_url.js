// 推送当前URL到服务器
function pushCurrentUrl() {
  // 获取当前URL
  const currentUrl = window.location.href;

  // 获取当前播放位置
  let currentPosition = 0;
  if (dp && dp.video) {
    currentPosition = Math.floor(dp.video.currentTime);
  }

  // 构建包含播放位置的URL
  let urlToSend = currentUrl;

  // 如果URL中已有position参数，则替换它
  if (urlToSend.includes('position=')) {
    urlToSend = urlToSend.replace(/position=\d+/, `position=${currentPosition}`);
  } else {
    // 否则添加position参数
    urlToSend += urlToSend.includes('?') ? `&position=${currentPosition}` : `?position=${currentPosition}`;
  }

  // 服务器地址
  const serverUrl = "http://47.106.254.103:5003/send-url";

  // 显示加载提示
  showToast("正在推送URL...", "info");

  // 方法1：使用新窗口打开，然后关闭
  const fullUrl = `${serverUrl}?url=${encodeURIComponent(urlToSend)}`;
  const pushWindow = window.open(fullUrl, 'push_window', 'width=1,height=1,toolbar=no,menubar=no,location=no');

  // 3秒后关闭窗口
  setTimeout(() => {
    if (pushWindow) {
      try {
        pushWindow.close();
      } catch (e) {
        console.log('无法自动关闭窗口');
      }
    }
    showToast("推送请求已发送", "success");
  }, 3000);
} 