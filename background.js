// background.js - 处理storage API调用，与content script通信

// 监听content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('视频下载助手: 收到消息:', request);
  
  // 处理不同类型的请求
  switch (request.action) {
    case 'getDeviceId':
      getDeviceId(sendResponse);
      break;
    case 'getDownloadCount':
      getDownloadCount(sendResponse);
      break;
    case 'incrementDownloadCount':
      incrementDownloadCount(sendResponse);
      break;
    case 'isAuthorized':
      isAuthorized(sendResponse);
      break;
    case 'verifyAuthCode':
      verifyAuthCode(request.authCode, request.deviceId, sendResponse);
      break;
    default:
      console.error('视频下载助手: 未知消息类型:', request.action);
      sendResponse({ error: '未知消息类型' });
  }
  
  // 异步响应需要返回true
  return true;
});

// 设备ID生成和管理
async function getDeviceId(sendResponse) {
  try {
    let result = await chrome.storage.local.get(['deviceId']);
    let deviceId = result.deviceId;
    if (!deviceId) {
      // 生成基于当前时间和随机数的设备ID
      deviceId = 'VID_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      await chrome.storage.local.set({ deviceId: deviceId });
    }
    sendResponse({ success: true, deviceId: deviceId });
  } catch (error) {
    console.error('视频下载助手: 获取设备ID失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 下载次数管理
async function getDownloadCount(sendResponse) {
  try {
    const count = await chrome.storage.local.get(['downloadCount']);
    sendResponse({ success: true, count: count.downloadCount || 0 });
  } catch (error) {
    console.error('视频下载助手: 获取下载次数失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function incrementDownloadCount(sendResponse) {
  try {
    const count = await chrome.storage.local.get(['downloadCount']);
    const newCount = (count.downloadCount || 0) + 1;
    await chrome.storage.local.set({ downloadCount: newCount });
    sendResponse({ success: true, count: newCount });
  } catch (error) {
    console.error('视频下载助手: 增加下载次数失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 授权状态管理
async function isAuthorized(sendResponse) {
  try {
    const auth = await chrome.storage.local.get(['isAuthorized', 'authExpiryTime']);
    
    if (auth.isAuthorized) {
      // 检查授权是否过期
      const now = Date.now();
      if (auth.authExpiryTime && now < auth.authExpiryTime) {
        sendResponse({ success: true, isAuthorized: true });
        return;
      } else {
        // 授权已过期，更新授权状态
        await chrome.storage.local.set({ isAuthorized: false });
      }
    }
    sendResponse({ success: true, isAuthorized: false });
  } catch (error) {
    console.error('视频下载助手: 检查授权状态失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 验证授权码
async function verifyAuthCode(authCode, deviceId, sendResponse) {
  try {
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
        
        sendResponse({ success: true, isAuthorized: true });
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
        
        sendResponse({ success: true, isAuthorized: true });
      }
    } else {
      sendResponse({ success: true, isAuthorized: false });
    }
  } catch (error) {
    console.error('视频下载助手: 验证授权码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}