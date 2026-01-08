// 调试授权码验证失败问题

// 模拟浏览器环境的btoa和atob函数
if (typeof btoa === 'undefined') {
  global.btoa = function(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

if (typeof atob === 'undefined') {
  global.atob = function(str) {
    return Buffer.from(str, 'base64').toString('binary');
  };
}

// 复制background.js中的解密函数
function decryptAuthCode(encryptedCode) {
  try {
    // 1. 首先进行字符替换（与加密相反）
    let decoded = '';
    for (let i = 0; i < encryptedCode.length; i++) {
      const char = encryptedCode.charAt(i);
      decoded += String.fromCharCode(char.charCodeAt(0) - 3);
    }
    
    console.log('步骤1 - 字符码减3:', decoded);
    
    // 2. Base64解码
    const base64Decoded = atob(decoded);
    
    console.log('步骤2 - Base64解码:', base64Decoded);
    
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
    
    console.log('步骤3 - 字符反混淆:', deobfuscated);
    
    // 4. 移除前缀和后缀
    const plainCode = deobfuscated.replace('VID_AUTH_', '').replace('_END', '');
    
    console.log('步骤4 - 移除前缀后缀:', plainCode);
    
    return plainCode;
  } catch (error) {
    console.error('解密授权码失败:', error);
    return null;
  }
}

// 复制auth.html中的加密函数
function encryptAuthCode(plainCode) {
    // 1. 添加前缀和后缀
    const prefixed = 'VID_AUTH_' + plainCode + '_END';
    
    // 2. 字符混淆：简单的字符替换
    const charMap = {
        'A': 'X', 'B': 'Y', 'C': 'Z', 'D': 'A', 'E': 'B',
        'F': 'C', 'G': 'D', 'H': 'E', 'I': 'F', 'J': 'G',
        'K': 'H', 'L': 'I', 'M': 'J', 'N': 'K', 'O': 'L',
        'P': 'M', 'Q': 'N', 'R': 'O', 'S': 'P', 'T': 'Q',
        'U': 'R', 'V': 'S', 'W': 'T', 'X': 'U', 'Y': 'V',
        'Z': 'W', '0': '5', '1': '6', '2': '7', '3': '8',
        '4': '9', '5': '0', '6': '1', '7': '2', '8': '3',
        '9': '4'
    };
    
    let obfuscated = '';
    for (let char of prefixed) {
        obfuscated += charMap[char] || char;
    }
    
    // 3. Base64编码
    const encoded = btoa(obfuscated);
    
    // 4. 再次进行字符替换，增加复杂度
    let final = '';
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charAt(i);
        final += String.fromCharCode(char.charCodeAt(0) + 3);
    }
    
    return final;
}

// 用户提供的信息
const deviceId = 'VID_1767861094034_838014';
const encryptedAuthCode = 'X3]E[4kVXXYiP}j}QW\\8QWn5Qmf3QGT3[3MOTT@@';

console.log('调试授权码验证失败问题');
console.log('设备ID:', deviceId);
console.log('设备ID前缀(最后6位):', deviceId.substring(deviceId.length - 6).toUpperCase());
console.log('加密授权码:', encryptedAuthCode);
console.log('\n解密过程:');

// 解密授权码
const decryptedAuthCode = decryptAuthCode(encryptedAuthCode);

if (decryptedAuthCode) {
  console.log('\n解密结果:', decryptedAuthCode);
  console.log('解密后前缀(前6位):', decryptedAuthCode.substring(0, 6));
  
  // 验证前缀是否匹配
  const expectedPrefix = deviceId.substring(deviceId.length - 6).toUpperCase();
  const actualPrefix = decryptedAuthCode.substring(0, 6);
  console.log('前缀匹配:', expectedPrefix === actualPrefix ? '✅ 匹配' : '❌ 不匹配');
  
  // 重新加密解密后的授权码，验证加密解密是否对称
  const reEncrypted = encryptAuthCode(decryptedAuthCode);
  console.log('\n重新加密结果:', reEncrypted);
  console.log('加密解密对称:', reEncrypted === encryptedAuthCode ? '✅ 对称' : '❌ 不对称');
  
  // 分析授权码格式
  console.log('\n授权码分析:');
  console.log('授权码长度:', decryptedAuthCode.length);
  console.log('设备前缀(6位):', decryptedAuthCode.substring(0, 6));
  console.log('时间后缀(4位):', decryptedAuthCode.substring(6, 10));
  console.log('到期码(剩余位):', decryptedAuthCode.substring(10));
}

// 测试生成一个新的授权码
console.log('\n=== 生成新的授权码测试 ===');
const newDevicePrefix = deviceId.substring(deviceId.length - 6).toUpperCase();
const newTimestamp = Date.now();
const newTimeSuffix = newTimestamp.toString().substring(8);
const newExpiryDate = new Date(newTimestamp + 30 * 24 * 60 * 60 * 1000);
const newExpiryTimestamp = Math.floor(newExpiryDate.getTime() / 1000);
const newExpiryCode = newExpiryTimestamp.toString().substring(6);
const newPlainAuthCode = newDevicePrefix + newTimeSuffix + newExpiryCode;
const newEncryptedAuthCode = encryptAuthCode(newPlainAuthCode);

console.log('新生成的原始授权码:', newPlainAuthCode);
console.log('新生成的加密授权码:', newEncryptedAuthCode);
console.log('新生成的授权码长度:', newEncryptedAuthCode.length);

// 解密新生成的授权码
const newDecryptedAuthCode = decryptAuthCode(newEncryptedAuthCode);
console.log('新生成授权码解密后:', newDecryptedAuthCode);
console.log('新生成授权码前缀匹配:', newDecryptedAuthCode.startsWith(newDevicePrefix) ? '✅ 匹配' : '❌ 不匹配');
