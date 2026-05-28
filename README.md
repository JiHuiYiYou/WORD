# WORD v2

沉浸式单词背默系统 — 背记 · 加强 · 检测，一条龙掌握单词。

## 快速开始

用浏览器打开 `index.html` 即可使用，无需服务器。

## 配置 API 密钥（重要）

首次使用前需要配置两项 API：

### 1. DeepSeek LLM（中文语义判定）

用于智能判断中文答案是否与标准答案意思一致，支持近义词和一词多义。

1. 注册 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 创建 API Key
3. 打开 WORD → 主页 → **API 设置**，填入 Key

不配置则中文答案退化为精确匹配。

### 2. 有道 TTS（英文发音）

用于听音写义/听音写英等语音模式。

1. 注册 [有道智云](https://ai.youdao.com) → 自然语言翻译 → 语音合成 TTS
2. 创建应用获取 App Key 和 Secret Key
3. 打开 WORD → 主页 → **API 设置**，填入两项密钥

不配置则听音模式无法使用（其他模式不受影响）。

## 三大板块

### 背记
闪卡式单词记忆。看到英文单词后选择：
- **认识** — 不再出现
- **钝角** — 再出现一次
- **不认识** — 继续出现直到认识

全部认识后自动进入加强练习。

### 加强
5 种练习模式反复练习直到全部掌握：
- 中译英 / 英译中
- 听音写义 / 听音写英 / 听音写英加义

支持 LLM 智能中文语义判定，避免过于严格的精确匹配。

### 检测
真实听写考试，只有一次机会，百分制评分。
- 支持全部 5 种模式
- 随机顺序，无即时反馈
- 错词自动存入单词本
- AI 复查错题找补分数

## 功能特性

- 暗绿色沉浸式 UI
- 3D 翻转闪卡动画
- 有道 TTS 美式发音
- DeepSeek LLM 中文语义智能判定
- 单词本 + 练习记录（localStorage 持久化）
- 练习记录三分区（背记/加强/检测）

## 文件结构

```
WORD/
  index.html              # 入口
  css/style.css           # 样式
  js/
    word-global.js        # 全局状态
    word-utils.js         # 文本处理工具
    word-tts.js           # 有道 TTS
    word-llm.js           # DeepSeek LLM
    word-storage.js       # localStorage
    word-ui.js            # 共享 UI 组件
    word-home.js          # 主页
    word-memorization.js  # 背记
    word-reinforcement.js # 加强
    word-testing.js       # 检测
    word-app.js           # 初始化
```

## 技术栈

纯前端，零构建工具，`file://` 协议直接可用。
- CSS 变量 + 自定义暗绿色主题
- Font Awesome 6 图标
- Web Crypto API（TTS SHA-256 签名）
- DeepSeek API（OpenAI 兼容格式）
- 有道 TTS API v3
- localStorage 数据持久化

## License

MIT — 随便用，随便改。
