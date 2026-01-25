# 🚀 Open WebUI Prompt Plus (提示词增强插件)

<p align="center">
  <img src="https://img.shields.io/badge/Open%20WebUI-扩展-blue?style=for-the-badge&logo=openai" alt="Open WebUI Extension">
  <img src="https://img.shields.io/badge/AI--Powered-智能驱动-purple?style=for-the-badge" alt="AI Powered">
  <img src="https://img.shields.io/badge/i18n-10+%20语言支持-green?style=for-the-badge" alt="Languages">
  <img src="https://img.shields.io/badge/Version-0.1.1-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

<p align="center">
  <b>为 Open WebUI 打造专业级的提示词管理体验。</b>
  <br />
  专为权力用户和开发者设计的全能增强套件。
</p>

---

## 🌟 核心特性

### 🤖 AI 智能提示词生成器
告别提示词工程的烦恼。
- **自然语言转提示词**：只需描述你的需求（例如：“写一个代码审查的提示词”），内置的 AI Agent 将为你构建结构化、富含变量的提示词。
- **自动分类与命名**：AI 会根据内容自动建议标题、斜杠命令和分类。
- **语法优化**：自动应用 Open WebUI 变量语法，生成的提示词即刻可用。

### ⚡ 快速插入面板 (Spotlight 风格)
- **全局快捷键**：按下 `Cmd/Ctrl + Shift + P` 立即唤起搜索面板。
- **模糊搜索**：毫秒级搜索标题、内容、标签或命令。
- **可视化搜索与发现**：专为易用性设计——通过关键词即时查找提示词，无需记忆斜杠命令。

### 📂 高级分类管理
- **动态分类**：创建自定义分类，并配以个性化的 Emoji 图标。
- **图标搜索**：内置 Emoji 选择器，支持关键词搜索。
- **智能组织**：收藏夹和使用统计功能，让你最常用的提示词触手可及。

### 📝 原生变量支持与可视化
充分利用 Open WebUI 强大的原生变量语法，告别手动编写代码的烦恼：
- **AI 自动生成模板**：让 AI 为您编写复杂的变量语法。
- **可视化表单渲染**：即时将 `{{variables}}` 转换为用户友好的 UI 组件（下拉菜单、日期选择器、滑块等）。
- **无需斜杠命令**：在整洁的模态界面中填写变量，无需记忆复杂的命令行操作。

---

## 📸 截图展示

<p align="center">
  <img src="./screenshots/01_chat_interface.png" alt="聊天界面" width="45%">
  <img src="./screenshots/02_quick_panel.png" alt="快速插入面板" width="45%">
</p>

<p align="center">
  <img src="./screenshots/03_management_panel.png" alt="管理面板" width="45%">
  <img src="./screenshots/04_ai_generation.png" alt="AI 生成" width="45%">
</p>

<p align="center">
  <img src="./screenshots/05_variable_form.png" alt="变量表单" width="45%">
  <img src="./screenshots/06_edit_prompt.png" alt="编辑提示词" width="45%">
</p>

<p align="center">
  <img src="./screenshots/07_ai_generated_result.png" alt="AI 生成结果" width="90%">
</p>

<p align="center">
  <img src="./screenshots/08_ai_generation_demo.gif" alt="AI 生成演示" width="90%">
</p>

---

## 🚀 快速开始

### 方案 1：Docker 部署 (源码挂载 - 推荐开发调试)

在你的 `docker-compose.yml` 中将插件文件挂载到 `open-webui` 容器：

```yaml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    volumes:
      - open-webui-data:/app/backend/data
      # --- 注入 Prompt Plus ---
      - ./custom.css:/app/build/static/custom.css
      - ./loader.js:/app/build/static/loader.js
      - ./js:/app/build/static/js/prompt-plus-js
```

### 方案 2：Docker 部署 (使用构建版本 - 推荐生产环境)

为了获得更好的性能和更小的体积，你可以先运行 `npm run build` 生成 `dist` 目录，然后挂载构建后的文件：

```yaml
services:
  open-webui:
    volumes:
      - ./dist/custom.css:/app/build/static/custom.css
      - ./dist/loader.js:/app/build/static/loader.js
      - ./dist/js:/app/build/static/js/prompt-plus-js
```

### 方案 3：手动安装

1. 下载源码或构建产物。
2. 将 `loader.js` 和 `custom.css` 复制到 Open WebUI 的静态资源目录（通常是 `/app/build/static`）。
3. 在静态资源目录下创建 `js/prompt-plus-js` 文件夹，并将项目 `js` 目录下的所有文件复制进去。
4. 重启 Open WebUI 服务。

---

## 🛠 构建与开发

本项目专为容器化部署设计，推荐通过直接挂载源码目录的方式进行开发调试。

### 如何构建
生成优化后的生产版本：
```bash
npm install
npm run build
```
该命令会更新 `dist` 目录。`dist` 目录已包含在 Git 中，方便直接部署。

### 开发流程
1. **切换到源码**：在 `docker-compose.yml` 中，将根目录文件（`custom.css`, `loader.js`, `js/`）分别挂载到 `/app/build/static/`（针对 CSS/Loader）和 `/app/build/static/prompt-plus-js`（针对 JS 目录）。
2. **修改与刷新**：直接修改 `js/` 或 `custom.css` 中的文件。
3. **查看效果**：刷新浏览器即可。开发阶段无需执行 build，加载器会自动处理 ES6 模块。
4. **最终构建**：开发完成后，运行 `npm run build` 更新生产环境资产。

---

## 📖 变量语法指南

Prompt Plus 完全支持 Open WebUI 的原生提示词变量语法。关于如何使用变量的完整指南，请参考官方文档：

👉 **[Open WebUI 官方文档 - 提示词变量](https://docs.openwebui.com/features/workspace/prompts/#prompt-variables)**

---

## 🛠 高级配置

Prompt Plus 设计为开箱即用，但你可以通过 `loader.js` 或修改 `js/core/constants.js` 中的 `CONFIG` 对象进行自定义。

- **自定义快捷键**：根据喜好修改默认的 `Cmd/Ctrl + Shift + P`。
- **API 集成**：无缝连接 Open WebUI 后端进行提示词同步。
- **主题支持**：自动检测并匹配 Open WebUI 的亮色/深色模式。

---

## 🌍 多语言支持

Prompt Plus 核心内置 i18n 支持。它会自动检测 Open WebUI 的语言设置并适配界面（包括 AI 生成的内容）。

目前支持：**英语、简体中文、繁体中文、日语、韩语、法语、德语、西班牙语、荷兰语、希腊语。**

---

## 🤝 参与贡献

欢迎任何形式的贡献！无论是 Bug 报告、功能建议还是新的翻译。

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

<p align="center">
  <b>GitHub</b>: <a href="https://github.com/Fu-Jie/open-webui-prompt-plus">Fu-Jie/open-webui-prompt-plus</a>
  <br />
  为 Open WebUI 社区用 ❤️ 打造
</p>
