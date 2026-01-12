// 视频下载助手 - 简化版本，只保留基本功能

// 创建下载按钮的函数
function createDownloadButton(videoElement) {
  // 检查视频元素是否有效
  if (!videoElement || !videoElement.parentNode) {
    return;
  }

  // 检查是否已经添加了下载按钮
  if (videoElement.parentNode.querySelector('.video-download-btn')) {
    return;
  }

  // 创建下载按钮
  const button = document.createElement('button');
  button.className = 'video-download-btn';
  button.textContent = '下载视频';
  button.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.9);
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    z-index: 99999;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  `;

  // 按钮悬停效果
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#ff4757';
    button.style.transform = 'translateY(-2px)';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    button.style.transform = 'translateY(0)';
  });

  // 点击下载事件
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('视频下载助手: 点击下载按钮');
    
    // 获取视频源URL
    let videoUrl = '';
    
    // 优先使用抖音视频URL（如果有且未过期）
    const now = Date.now();
    if (douyinVideoInfo.urls.length > 0 && (now - douyinVideoInfo.timestamp) < 5 * 60 * 1000) { // 5分钟内有效
      videoUrl = douyinVideoInfo.urls[0];
      console.log('使用抖音视频URL:', videoUrl, '清晰度:', douyinVideoInfo.quality);
    } 
    // 否则使用普通视频URL获取方式
    else {
      if (videoElement.src) {
        videoUrl = videoElement.src;
      } else if (videoElement.querySelector('source')) {
        const sources = videoElement.querySelectorAll('source');
        videoUrl = sources[0]?.src;
      }

      // 尝试从videoElement.currentSrc获取
      if (!videoUrl && videoElement.currentSrc) {
        videoUrl = videoElement.currentSrc;
      }
    }

    if (videoUrl) {
      // 生成文件名
      const fileName = `video_${Date.now()}.mp4`;
      
      // 处理blob URL的情况
      if (videoUrl.startsWith('blob:')) {
        // blob URL是浏览器内部临时URL，无法直接下载
        alert('该视频使用blob URL，无法直接下载\n\n建议尝试：\n1. 使用浏览器开发者工具(Network面板)查找原始视频URL\n2. 使用屏幕录制工具捕获视频\n3. 刷新页面后再次尝试');
      } else {
        // 处理普通URL的情况
        console.log('视频下载助手: 处理普通URL');
        downloadVideo(videoUrl, fileName);
      }
    } else {
      alert('未找到视频源URL，请检查视频是否可播放');
      console.log('视频下载助手: 未找到视频源URL');
    }
  });

  // 创建一个专门的容器来放置按钮，确保按钮始终可见
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    top: 0;
    right: 0;
    z-index: 99999;
    pointer-events: auto;
  `;
  container.appendChild(button);

  // 确保父容器有相对定位
  const parentStyle = window.getComputedStyle(videoElement.parentNode);
  if (parentStyle.position === 'static') {
    videoElement.parentNode.style.position = 'relative';
  }

  // 将按钮容器添加到视频的父容器中
  videoElement.parentNode.appendChild(container);
}

// 下载视频的通用函数
function downloadVideo(url, fileName) {
  // 显示下载开始提示
  const progressMessage = document.createElement('div');
  progressMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 8px;
    z-index: 999999;
    font-size: 16px;
  `;
  progressMessage.textContent = '正在准备下载...';
  document.body.appendChild(progressMessage);

  fetch(url, {
    method: 'GET',
    mode: 'cors', // 显式设置为cors模式
    credentials: 'omit', // 不发送凭证
    headers: {
      'Accept': 'video/*'
    }
  })
  .then(response => {
    if (!response.ok) {
      console.warn('视频下载助手: HTTP响应状态异常:', response.status);
      // 如果HTTP响应异常但仍然返回内容，尝试获取blob
      return response.blob().catch(() => {
        // 如果无法获取blob，抛出错误
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      });
    }
    return response.blob();
  })
  .then(blob => {
    // 更新提示信息
    progressMessage.textContent = '下载准备完成，开始下载...';
    
    // 创建下载链接
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = fileName;
    a.style.display = 'none';
    
    // 确保在文档中添加链接后再触发下载
    document.body.appendChild(a);
    
    // 使用同步点击方式
    a.click();
    
    // 清理提示信息
    setTimeout(() => {
      document.body.removeChild(progressMessage);
    }, 1500);
    
    // 清理下载链接
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 500);
  })
  .catch(error => {
    console.error('视频下载助手: fetch下载失败:', error);
    
    // 清理提示信息
    document.body.removeChild(progressMessage);
    
    // 如果fetch失败，尝试使用iframe方法下载
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const iframeA = iframeDoc.createElement('a');
          iframeA.href = url;
          iframeA.download = fileName;
          iframeDoc.body.appendChild(iframeA);
          iframeA.click();
          iframeDoc.body.removeChild(iframeA);
        } catch (iframeError) {
          console.error('视频下载助手: iframe内部下载失败:', iframeError);
          // 如果iframe方法也失败，提示用户
          alert('下载失败，请尝试在新标签页打开视频后右键保存');
        }
        // 清理iframe
        document.body.removeChild(iframe);
      };
      document.body.appendChild(iframe);
    } catch (iframeError) {
      console.error('视频下载助手: iframe方法失败:', iframeError);
      alert('下载失败，请尝试在新标签页打开视频后右键保存');
    }
  });
}

// 监测单个video标签
function observeVideo(videoElement) {
  createDownloadButton(videoElement);
}

// 监测页面上所有现有的video标签
function observeExistingVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    observeVideo(video);
  });
}

// 改进的MutationObserver配置，更全面地监测视频标签的添加
function observeDynamicVideos() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      // 检查是否有新节点添加
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // 直接是video标签
          if (node.tagName === 'VIDEO') {
            setTimeout(() => observeVideo(node), 100); // 延迟一点确保视频加载完成
          } 
          // 包含video标签的父节点
          else if (node.nodeType === Node.ELEMENT_NODE) {
            const videos = node.querySelectorAll('video');
            if (videos.length > 0) {
              videos.forEach(video => {
                setTimeout(() => observeVideo(video), 100);
              });
            }
          }
        });
      }
      // 检查属性变化，可能有视频动态设置src
      else if (mutation.type === 'attributes') {
        if (mutation.target.tagName === 'VIDEO' && (mutation.attributeName === 'src' || mutation.attributeName === 'srcset')) {
          setTimeout(() => observeVideo(mutation.target), 100);
        }
      }
    });
  });

  // 配置监测选项 - 更全面的监测
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset']
  };

  // 开始监测
  observer.observe(document.body, config);
}

// 立即执行的初始化函数
function init() {
  // 立即监测现有视频
  observeExistingVideos();
  
  // 使用MutationObserver监测页面动态添加的video标签
  observeDynamicVideos();
}

// 监听单页应用URL变化
function observeUrlChanges() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      setTimeout(() => observeExistingVideos(), 1500);
    }
  }).observe(document, { subtree: true, childList: true });
}

// 存储抖音视频URL和当前页面的视频元素映射
let douyinVideoInfo = {
  urls: [],
  quality: '',
  timestamp: 0
};

// 清理抖音视频URL的函数
function cleanDouyinVideoUrl(url) {
  // 移除可能的空格和额外引号
  if (typeof url === 'string') {
    return url.trim().replace(/^[\`\'"]+|[\`\'"]+$/g, '');
  }
  return url;
}

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'DOUYIN_VIDEO_URLS') {
    // 清理并存储抖音视频URL
    const cleanedUrls = message.urls.map(cleanDouyinVideoUrl);
    
    // 更新抖音视频信息
    douyinVideoInfo = {
      urls: cleanedUrls,
      quality: message.quality,
      timestamp: Date.now()
    };
    
    console.log('收到抖音视频URL:', cleanedUrls, '清晰度:', message.quality);
    
    // 找到当前页面的视频元素并更新下载按钮
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // 移除旧的下载按钮
      const oldButton = video.parentNode.querySelector('.video-download-btn');
      if (oldButton) {
        oldButton.remove();
      }
      // 创建新的下载按钮
      createDownloadButton(video);
    });
  } 
  else if (message.type === 'DOUYIN_API_REQUESTED') {
    console.log('🎯 收到抖音API请求通知:', message.apiUrl);
    
    // 实际实现：重新请求抖音API获取响应体，提取视频URL
    fetch(message.apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include' // 包含当前页面的cookie，确保可以访问API
    }).then(response => {
      if (!response.ok) {
        throw new Error(`API请求失败，状态码: ${response.status}`);
      }
      return response.json();
    }).then(data => {
      console.log('📦 抖音API响应数据:', data);
      
      // 解析抖音API响应，提取视频URL
      // 响应格式：{aweme_detail: {video: {bit_rate: [{play_addr: {url_list: []}}]}}}
      if (data.aweme_detail && data.aweme_detail.video && data.aweme_detail.video.bit_rate) {
        const bitRate = data.aweme_detail.video.bit_rate[0];
        if (bitRate && bitRate.play_addr && bitRate.play_addr.url_list) {
          const videoUrls = bitRate.play_addr.url_list;
          const quality = data.aweme_detail.video.quality_label || 'unknown';
          
          console.log('🎬 成功提取抖音视频URL:', videoUrls);
          
          // 向background.js发送真实的视频URL
          chrome.runtime.sendMessage({
            type: 'DOUYIN_VIDEO_URL_FOUND',
            urls: videoUrls,
            quality: quality
          }).catch(error => {
            console.log('⚠️ 发送视频URL到background.js失败:', error.message);
          });
        } else {
          console.log('❌ 抖音API响应格式不符合预期，无法提取play_addr.url_list');
        }
      } else {
        console.log('❌ 抖音API响应缺少必要字段');
      }
    }).catch(error => {
      console.log('❌ 获取抖音API响应失败:', error.message);
    });
  }
});

// 无论页面是否已经加载完成，都立即初始化
if (document.readyState === 'loading') {
  // 页面仍在加载中，等待DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    init();
    observeUrlChanges();
  });
} else {
  // 页面已经加载完成，立即初始化
  init();
  observeUrlChanges();
}
