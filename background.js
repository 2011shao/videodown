// background.js - 处理storage API调用，与content script通信

// 初始化配置
async function initConfig() {
  try {
    // 从config.json读取配置
    const response = await fetch(chrome.runtime.getURL('config.json'));
    const config = await response.json();
    
    // 将配置存储到chrome.storage.local
    await chrome.storage.local.set({ config: config });
    console.log('视频下载助手: 配置已初始化', config);
  } catch (error) {
    console.error('视频下载助手: 初始化配置失败:', error);
    
    // 使用默认配置
    const defaultConfig = {
      MAX_DOWNLOADS: 10,
      AUTH_EXPIRY_DAYS: 30,
      EXTENSION_NAME: '视频下载助手',
      VERSION: '1.0.0'
    };
    await chrome.storage.local.set({ config: defaultConfig });
    console.log('视频下载助手: 使用默认配置', defaultConfig);
  }
}

// 扩展安装或更新时初始化配置
chrome.runtime.onInstalled.addListener(() => {
  console.log('视频下载助手: 扩展已安装或更新');
  initConfig();
});

// 扩展启动时初始化配置
chrome.runtime.onStartup.addListener(() => {
  console.log('视频下载助手: 扩展已启动');
  initConfig();
});

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
    case 'getConfig':
      getConfig(sendResponse);
      break;
    default:
      console.error('视频下载助手: 未知消息类型:', request.action);
      sendResponse({ error: '未知消息类型' });
  }
  
  // 异步响应需要返回true
  return true;
});

// 获取配置
async function getConfig(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['config']);
    
    // 如果没有配置，重新初始化
    if (!result.config) {
      await initConfig();
      const updatedResult = await chrome.storage.local.get(['config']);
      sendResponse({ success: true, config: updatedResult.config });
      return;
    }
    
    sendResponse({ success: true, config: result.config });
  } catch (error) {
    console.error('视频下载助手: 获取配置失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

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

// 解密授权码
function decryptAuthCode(encryptedCode) {
  try {
    // 1. 首先进行字符替换（与加密相反）
    let decoded = '';
    for (let i = 0; i < encryptedCode.length; i++) {
      const char = encryptedCode.charAt(i);
      decoded += String.fromCharCode(char.charCodeAt(0) - 3);
    }
    
    // 2. Base64解码
    const base64Decoded = atob(decoded);
    
    // 3. 字符反混淆
    const reverseCharMap = {
      'X': 'A', 'Y': 'B', 'Z': 'C', 'A': 'D', 'B': 'E',
      'C': 'F', 'D': 'G', 'E': 'H', 'F': 'I', 'G': 'J',
      'H': 'K', 'I': 'L', 'J': 'M', 'K': 'N', 'L': 'O',
      'M': 'P', 'N': 'Q', 'O': 'R', 'P': 'S', 'Q': 'T',
      'R': 'U', 'S': 'V', 'T': 'W', 'U': 'X', 'V': 'Y',
      'W': 'Z', '5': '0', '6': '1', '7': '2', '8': '3',
      '9': '4', '0': '5', '1': '6', '2': '7', '3': '8',
      '4': '9'
    };
    
    let deobfuscated = '';
    for (let char of base64Decoded) {
      deobfuscated += reverseCharMap[char] || char;
    }
    
    // 4. 移除前缀和后缀
    const plainCode = deobfuscated.replace('VID_AUTH_', '').replace('_END', '');
    
    return plainCode;
  } catch (error) {
    console.error('视频下载助手: 解密授权码失败:', error);
    return null;
  }
}

// 验证授权码
async function verifyAuthCode(authCode, deviceId, sendResponse) {
  try {
    // 实际项目中，这里应该发送请求到后端服务验证授权码
    // 这里只是模拟授权码验证（检查授权码是否基于设备ID生成）
    
    // 解密授权码
    const plainAuthCode = decryptAuthCode(authCode);
    if (!plainAuthCode) {
      sendResponse({ success: true, isAuthorized: false });
      return;
    }
    
    const expectedPrefix = deviceId.substring(deviceId.length - 6).toUpperCase();
    
    // 兼容旧格式授权码（长度可能不足18位）和新格式授权码
    if (plainAuthCode.startsWith(expectedPrefix)) {
      // 解析授权码中的到期时间信息
      // 授权码格式：devicePrefix(6) + timeSuffix(4) + expiryCode(8)
      const expiryCode = plainAuthCode.substring(10); // 获取解密后授权码的后8位
      
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