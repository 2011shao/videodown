// 设备ID生成和管理
async function getDeviceId() {
  let result = await chrome.storage.local.get(['deviceId']);
  let deviceId = result.deviceId;
  if (!deviceId) {
    // 生成基于当前时间和随机数的设备ID
    deviceId = 'VID_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    await chrome.storage.local.set({ deviceId: deviceId });
  }
  return deviceId;
}

// 下载次数管理
async function getDownloadCount() {
  const count = await chrome.storage.local.get(['downloadCount']);
  return count.downloadCount || 0;
}

async function incrementDownloadCount() {
  const count = await getDownloadCount();
  await chrome.storage.local.set({ downloadCount: count + 1 });
  return count + 1;
}

async function checkDownloadLimit() {
  const MAX_DOWNLOADS = 1;
  const count = await getDownloadCount();
  return count < MAX_DOWNLOADS;
}

async function isAuthorized() {
  const auth = await chrome.storage.local.get(['isAuthorized', 'authExpiryTime']);
  
  if (auth.isAuthorized) {
    // 检查授权是否过期
    const now = Date.now();
    if (auth.authExpiryTime && now < auth.authExpiryTime) {
      return true; // 授权有效
    } else {
      // 授权已过期，更新授权状态
      await chrome.storage.local.set({ isAuthorized: false });
      return false;
    }
  }
  return false;
}

// 生成授权二维码
async function generateAuthQRCode() {
  const deviceId = await getDeviceId();
  const authUrl = `https://2011shao.github.io/videodown/auth.html?deviceId=${deviceId}`;
  
  // 创建二维码生成函数
  return new Promise((resolve) => {
    // 创建一个简单的二维码显示
    const qrContent = `设备ID: ${deviceId}\n授权链接: ${authUrl}`;
    resolve(qrContent);
  });
}

// 验证授权码
async function verifyAuthCode(authCode) {
  const deviceId = await getDeviceId();
  
  // 实际项目中，这里应该发送请求到后端服务验证授权码
  // 这里只是模拟授权码验证（检查授权码是否基于设备ID生成）
  const expectedPrefix = deviceId.substring(deviceId.length - 6).toUpperCase();
  
  if (authCode.startsWith(expectedPrefix) && authCode.length >= 18) {
    // 解析授权码中的到期时间信息
    // 授权码格式：devicePrefix(6) + timeSuffix(4) + expiryCode(8)
    const expiryCode = authCode.substring(10); // 获取授权码的后8位
    
    // 计算授权过期时间
    let expiryTime;
    
    try {
      // 尝试从授权码中解析到期时间（实际项目中需要更复杂的算法）
      // 这里简化处理，允许管理员设置的到期日期
      const now = new Date();
      
      // 检查是否是长期授权（特殊授权码格式）
      if (authCode.endsWith('LONGTERM')) {
        // 长期授权，设置为1年到期
        expiryTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      } else if (authCode.length >= 20) {
        // 包含完整到期时间的授权码
        const expiryTimestamp = parseInt(expiryCode, 10);
        if (!isNaN(expiryTimestamp)) {
          expiryTime = new Date(expiryTimestamp * 1000);
        } else {
          // 默认30天
          expiryTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      } else {
        // 默认30天到期
        expiryTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      
      // 确保到期时间不会早于当前时间
      if (expiryTime <= now) {
        expiryTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      
      // 授权成功，保存授权状态和过期时间
      await chrome.storage.local.set({
        isAuthorized: true,
        authExpiryTime: expiryTime.getTime(),
        authGrantedTime: now.getTime()
      });
      
      // 计算有效期天数
      const daysDiff = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
      console.log(`视频下载助手: 授权成功，有效期 ${daysDiff} 天，到期日期 ${expiryTime.toLocaleDateString()}`);
      
      return true;
    } catch (error) {
      console.error('视频下载助手: 解析授权码到期时间失败:', error);
      
      // 解析失败时，使用默认30天有效期
      const now = new Date();
      const expiryTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      await chrome.storage.local.set({
        isAuthorized: true,
        authExpiryTime: expiryTime.getTime(),
        authGrantedTime: now.getTime()
      });
      return true;
    }
  }
  return false;
}

// 获取授权剩余时间
async function getAuthRemainingTime() {
  const auth = await chrome.storage.local.get(['authExpiryTime']);
  if (!auth.authExpiryTime) return null;
  
  const now = Date.now();
  const remainingTime = auth.authExpiryTime - now;
  if (remainingTime <= 0) return null;
  
  // 计算剩余天数、小时、分钟
  const days = Math.floor(remainingTime / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}天${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

// 显示授权提示
async function showAuthPrompt() {
  const deviceId = await getDeviceId();
  
  // 创建授权提示元素
  const authDiv = document.createElement('div');
  authDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 100000;
    max-width: 450px;
    text-align: center;
  `;
  
  authDiv.innerHTML = `
    <h3>下载次数已达上限</h3>
    <p>您已经下载了10个视频，请输入授权码继续使用</p>
    <p style="font-size: 14px; color: #666; margin: 10px 0;"><strong>注意：每次授权有效期为30天，到期后需要重新授权</strong></p>
    <div style="margin: 20px 0; padding: 20px; background: #f0f0f0; border-radius: 5px;">
      <strong>设备ID:</strong> ${deviceId}
      <br><br>
      <button id="copyDeviceIdBtn" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">复制设备ID</button>
    </div>
    
    <h4>输入授权码</h4>
    <div style="margin: 15px 0;">
      <input type="text" id="authCodeInput" placeholder="请输入管理员提供的授权码" style="padding: 10px; font-size: 16px; width: 300px; text-align: center; font-family: monospace; border: 2px solid #ddd; border-radius: 4px; outline: none;">
    </div>
    <div style="margin: 10px 0;">
      <button id="verifyAuthCodeBtn" style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">验证授权码</button>
    </div>
    
    <div style="margin-top: 20px;">
      <button id="checkAuthBtn" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">检查授权状态</button>
      <button id="closeAuthBtn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-left: 10px;">关闭</button>
    </div>
  `;
  
  document.body.appendChild(authDiv);
  
  // 添加事件监听器
  
  // 复制设备ID
  document.getElementById('copyDeviceIdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(deviceId).then(() => {
      alert('设备ID已复制到剪贴板');
    }).catch(() => {
      // 降级方案
      const tempInput = document.createElement('input');
      tempInput.value = deviceId;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      alert('设备ID已复制到剪贴板');
    });
  });
  
  // 验证授权码
  document.getElementById('verifyAuthCodeBtn').addEventListener('click', async () => {
    const authCode = document.getElementById('authCodeInput').value;
    if (!authCode) {
      alert('请输入授权码');
      return;
    }
    
    const isValid = await verifyAuthCode(authCode);
    if (isValid) {
      alert('授权成功！您可以继续使用下载功能。');
      authDiv.remove();
    } else {
      alert('授权码无效，请检查后重试');
    }
  });
  
  // 检查授权状态
  document.getElementById('checkAuthBtn').addEventListener('click', async () => {
    const authorized = await isAuthorized();
    if (authorized) {
      alert('授权成功！您可以继续使用下载功能。');
      authDiv.remove();
    } else {
      alert('尚未授权，请先完成授权操作。');
    }
  });
  
  // 关闭按钮
  document.getElementById('closeAuthBtn').addEventListener('click', () => {
    authDiv.remove();
  });
}

// 创建下载按钮的函数
function createDownloadButton(videoElement) {
  console.log('视频下载助手: 开始创建下载按钮');
  
  // 检查视频元素是否有效
  if (!videoElement || !videoElement.parentNode) {
    console.log('视频下载助手: 无效的视频元素或没有父容器');
    return;
  }

  // 检查是否已经添加了下载按钮
  if (videoElement.parentNode.querySelector('.video-download-btn')) {
    console.log('视频下载助手: 下载按钮已存在');
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
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('视频下载助手: 点击下载按钮');
    
    // 检查下载限制和授权状态
    const isUnderLimit = await checkDownloadLimit();
    const authorized = await isAuthorized();
    
    if (!isUnderLimit && !authorized) {
      console.log('视频下载助手: 下载次数已达上限，需要授权');
      await showAuthPrompt();
      return;
    }
    
    // 获取视频源URL
    let videoUrl = '';
    if (videoElement.src) {
      videoUrl = videoElement.src;
      console.log('视频下载助手: 从video.src获取URL:', videoUrl);
    } else if (videoElement.querySelector('source')) {
      const sources = videoElement.querySelectorAll('source');
      sources.forEach((source, index) => {
        console.log(`视频下载助手: 第${index+1}个source标签URL:`, source.src);
      });
      videoUrl = sources[0]?.src;
    }

    // 尝试从videoElement.currentSrc获取
    if (!videoUrl && videoElement.currentSrc) {
      videoUrl = videoElement.currentSrc;
      console.log('视频下载助手: 从currentSrc获取URL:', videoUrl);
    }

    if (videoUrl) {
      console.log('视频下载助手: 检测到视频URL:', videoUrl);
      
      // 生成文件名
      const fileName = `video_${Date.now()}.mp4`;
      
      // 处理blob URL的情况
      if (videoUrl.startsWith('blob:')) {
        console.log('视频下载助手: 处理blob URL');
        try {
          // 获取视频的原始URL（如果有）
          const originalUrl = await getOriginalUrlFromBlob(videoElement);
          if (originalUrl) {
            console.log('视频下载助手: 获取到原始URL:', originalUrl);
            await downloadVideo(originalUrl, fileName);
          } else {
            // 如果无法获取原始URL，使用canvas录制方法
            console.log('视频下载助手: 使用canvas录制方法下载视频');
            await downloadVideoWithCanvas(videoElement, fileName);
          }
        } catch (error) {
          console.error('视频下载助手: 处理blob URL错误:', error);
          alert('下载失败: 无法处理视频URL');
        }
      } 
      // 处理普通URL的情况
      else {
        console.log('视频下载助手: 处理普通URL');
        await downloadVideo(videoUrl, fileName);
      }
      
      // 增加下载计数（仅当在限制内时）
      if (isUnderLimit) {
        await incrementDownloadCount();
        console.log('视频下载助手: 下载次数已更新');
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
    console.log('视频下载助手: 设置父容器为相对定位');
  }

  // 将按钮容器添加到视频的父容器中
  videoElement.parentNode.appendChild(container);
  console.log('视频下载助手: 下载按钮已添加');
}

// 下载视频的通用函数
function downloadVideo(url, fileName) {
  console.log('视频下载助手: 开始下载视频:', fileName, 'URL:', url);
  
  // 首先尝试使用fetch API下载视频并转换为blob，这是最可靠的跨域下载方法
  console.log('视频下载助手: 使用fetch API下载视频数据');
  
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
    console.log('视频下载助手: 成功获取视频blob数据，大小:', blob.size, '字节');
    
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
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      console.log('视频下载助手: 下载完成，资源已清理');
    }, 500);
  })
  .catch(error => {
    console.error('视频下载助手: fetch下载失败:', error);
    
    // 如果fetch失败，尝试使用iframe方法下载
    console.log('视频下载助手: 尝试使用iframe方法下载');
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      iframe.onload = () => {
        // 等待iframe加载完成后，尝试在iframe内部触发下载
        console.log('视频下载助手: iframe加载完成，尝试在iframe内部触发下载');
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const iframeA = iframeDoc.createElement('a');
          iframeA.href = url;
          iframeA.download = fileName;
          iframeDoc.body.appendChild(iframeA);
          iframeA.click();
          iframeDoc.body.removeChild(iframeA);
          console.log('视频下载助手: iframe下载触发完成');
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

// 尝试从blob URL获取原始URL
async function getOriginalUrlFromBlob(videoElement) {
  // 检查视频元素是否有networkState
  if (videoElement.networkState !== videoElement.NETWORK_LOADING && 
      videoElement.networkState !== videoElement.NETWORK_IDLE) {
    console.log('视频下载助手: 视频未加载完成');
    return null;
  }
  
  // 对于某些网站，可能可以从video元素的属性中获取原始URL
  const possibleAttributes = ['currentSrc', 'src', 'data-src', 'data-video-src'];
  for (const attr of possibleAttributes) {
    const value = videoElement.getAttribute(attr);
    if (value && !value.startsWith('blob:')) {
      return value;
    }
  }
  
  // 尝试从页面的其他地方查找视频URL
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent.includes('.mp4') || script.textContent.includes('.webm') || script.textContent.includes('.ogg')) {
      const urls = extractUrls(script.textContent);
      for (const url of urls) {
        if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
          return url;
        }
      }
    }
  }
  
  return null;
}

// 使用Canvas录制视频的方法（作为备选方案）
async function downloadVideoWithCanvas(videoElement, fileName) {
  console.log('视频下载助手: 使用Canvas方法下载视频');
  
  // 创建Canvas元素
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // 检查视频是否可播放
  if (videoElement.paused) {
    videoElement.play();
  }
  
  // 创建MediaRecorder
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/mp4'
  });
  
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  // 录制完成后的处理
  recorder.onstop = () => {
    console.log('视频下载助手: Canvas录制完成');
    const blob = new Blob(chunks, { type: 'video/mp4' });
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  };
  
  // 开始录制
  recorder.start();
  
  // 绘制视频帧
  function drawFrame() {
    if (recorder.state === 'recording') {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    }
  }
  drawFrame();
  
  // 录制5秒后停止（作为示例，实际使用时可能需要调整）
  setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }
  }, 5000);
}

// 从文本中提取URL的辅助函数
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s"<>()\[\]]+)/g;
  return text.match(urlRegex) || [];
}

// 监测单个video标签
function observeVideo(videoElement) {
  createDownloadButton(videoElement);
}

// 监测页面上所有现有的video标签
function observeExistingVideos() {
  const videos = document.querySelectorAll('video');
  console.log(`视频下载助手: 发现${videos.length}个视频标签`);
  videos.forEach(video => {
    observeVideo(video);
  });
}

// 改进的MutationObserver配置，更全面地监测视频标签的添加
function observeDynamicVideos() {
  console.log('视频下载助手: 启动动态视频监测');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      // 检查是否有新节点添加
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // 直接是video标签
          if (node.tagName === 'VIDEO') {
            console.log('视频下载助手: 检测到新的video标签');
            setTimeout(() => observeVideo(node), 100); // 延迟一点确保视频加载完成
          } 
          // 包含video标签的父节点
          else if (node.nodeType === Node.ELEMENT_NODE) {
            const videos = node.querySelectorAll('video');
            if (videos.length > 0) {
              console.log(`视频下载助手: 检测到包含${videos.length}个视频的新节点`);
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
          console.log('视频下载助手: 视频src属性变化');
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
  console.log('视频下载助手: 开始初始化');
  
  // 立即监测现有视频
  observeExistingVideos();
  
  // 设置定时器定期检查，确保不会错过任何视频
  setInterval(() => {
    console.log('视频下载助手: 定期检查视频标签');
    observeExistingVideos();
  }, 2000);
  
  // 使用MutationObserver监测页面动态添加的video标签
  observeDynamicVideos();
  
  console.log('视频下载助手: 初始化完成');
}

// 增强的单页应用URL变化监听
function observeUrlChanges() {
  let lastUrl = location.href;
  console.log('视频下载助手: 启动URL变化监测');
  
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log(`视频下载助手: 检测到URL变化: ${lastUrl} -> ${currentUrl}`);
      lastUrl = currentUrl;
      // 页面URL变化后，重新监测视频
      setTimeout(() => {
        observeExistingVideos();
      }, 1500); // 更长的延迟确保页面加载完成
    }
  }).observe(document, {
    subtree: true,
    childList: true
  });
}

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