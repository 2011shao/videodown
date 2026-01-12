// 极简抖音视频下载Service Worker
// 版本: 2.1.0 - 修复加载问题

console.log('🚀 抖音下载助手Service Worker已启动');

// 监听安装事件
self.addEventListener('install', () => {
  console.log('📦 Service Worker安装完成');
  self.skipWaiting();
});

// 监听激活事件
self.addEventListener('activate', () => {
  console.log('✅ Service Worker激活完成');
  self.clients.claim();
});

// 监听抖音视频详情API请求完成事件
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes('/aweme/v1/web/aweme') && details.statusCode === 200) {
      console.log('🎯 捕获到抖音视频详情API请求:', details.url);
      
      // 直接向内容脚本发送API请求通知
      chrome.tabs.sendMessage(details.tabId, {
        type: 'DOUYIN_API_REQUESTED',
        apiUrl: details.url
      }).catch(error => {
        console.log('⚠️ 发送消息到内容脚本失败:', error.message);
      });
    }
  },
  { urls: ['https://www.douyin.com/*', 'https://compass.jinritemai.com/*'], types: ['xmlhttprequest'] },
  []
);

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOUYIN_VIDEO_URL_FOUND') {
    console.log('🎬 收到抖音视频URL:', message.urls);
    // 向所有内容脚本广播视频URL
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'DOUYIN_VIDEO_URLS',
            urls: message.urls,
            quality: message.quality
          }).catch(() => {});
        }
      });
    });
    sendResponse({ status: 'success' });
  } 
  else if (message.type === 'TEST_CONNECTION') {
    console.log('🔗 收到测试连接请求');
    sendResponse({ status: 'success', message: 'Service Worker连接正常' });
  }
  return true;
});