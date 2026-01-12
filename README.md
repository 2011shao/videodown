# 抖音视频下载助手 - 使用说明

## 一、功能概述

抖音视频下载助手是一个Chrome浏览器扩展，用于帮助用户下载抖音视频。主要功能包括：
- 监听抖音视频详情API请求
- 自动提取视频播放地址
- 在视频上添加下载按钮
- 支持下载各种视频格式

## 二、安装扩展

### 1. 加载扩展

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的文件夹

### 2. 确认安装

安装完成后，浏览器右上角会显示扩展图标（带货视频助手）。

## 三、查看Service Worker日志

Service Worker是扩展的核心组件，所有后台逻辑都在这里运行。要查看Service Worker的日志，请按照以下步骤操作：

### 方法一：扩展管理页面

1. 打开Chrome扩展管理页面：`chrome://extensions/`
2. 找到「带货视频助手」扩展
3. 点击扩展卡片下方的「详情」按钮
4. 在详情页面中，找到「服务工作线程」部分
5. 点击「检查视图」链接
6. 这将打开Service Worker的控制台，所有日志都会在这里显示

### 方法二：开发者工具Application面板

1. 在任意页面按F12打开开发者工具
2. 切换到「Application」（应用程序）面板
3. 在左侧导航栏找到「Service Workers」
4. 在列表中找到「带货视频助手」的Service Worker
5. 勾选「Open dedicated DevTools for Service Workers」
6. 这将打开一个专门的控制台窗口显示Service Worker日志

## 四、测试扩展功能

### 1. 使用测试页面

本项目提供了一个测试页面 `test.html`，用于验证扩展功能：

1. 本地启动一个HTTP服务器：
   ```bash
   python3 -m http.server 8000
   ```
2. 访问 `http://localhost:8000/test.html`
3. 点击「测试Service Worker连接」按钮，验证扩展是否正常工作
4. 点击「发送模拟抖音API请求」按钮，测试API监听功能

### 2. 访问抖音视频页面

1. 打开抖音网站：`https://www.douyin.com/`
2. 浏览任意视频
3. 扩展会自动监听抖音视频详情API请求
4. 在视频右上角会出现「下载视频」按钮
5. 点击按钮即可下载视频

## 五、常见问题排查

### 1. Service Worker未启动

- 检查扩展是否已正确加载
- 确保manifest.json中的background配置正确
- 尝试重新加载扩展

### 2. 没有捕获到抖音API请求

- 确保访问的是抖音官网（`https://www.douyin.com/`）
- 检查网络请求是否被其他扩展或广告拦截器阻止
- 查看Service Worker控制台日志，确认是否有错误信息

### 3. 下载按钮未显示

- 确保视频已正确加载
- 检查页面是否使用了特殊的视频播放方式（如blob URL）
- 尝试点击扩展图标手动触发视频检查

### 4. 视频下载失败

- 检查视频URL是否有效
- 确认网络连接正常
- 尝试在新标签页打开视频后右键保存

## 六、扩展文件说明

- `manifest.json`：扩展配置文件，包含权限、背景脚本、内容脚本等设置
- `background.js`：后台Service Worker脚本，处理API监听和消息传递
- `content.js`：内容脚本，负责在页面中添加下载按钮和处理下载逻辑
- `test.html`：测试页面，用于验证扩展功能
- `icons/`：扩展图标文件夹

## 七、更新日志

### v1.0.0
- 初始版本
- 支持抖音视频API监听
- 自动提取视频URL
- 添加视频下载按钮
- 支持多种视频格式

## 八、联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱：example@example.com
- GitHub：https://github.com/example/douyin-video-downloader

---

**注意：** 本扩展仅供学习和研究使用，请遵守相关法律法规，不要用于任何非法用途。