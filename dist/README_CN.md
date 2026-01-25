# 🚀 Open WebUI Prompt Plus (提示词增强插件)

<p align="center">
  <img src="https://img.shields.io/badge/Open%20WebUI-扩展-blue?style=for-the-badge&logo=openai" alt="Open WebUI Extension">
  <img src="https://img.shields.io/badge/版本-0.1.0-blue.svg" alt="版本">
  <img src="https://img.shields.io/badge/AI--Powered-智能驱动-purple?style=for-the-badge" alt="AI Powered">
  <img src="https://img.shields.io/badge/i18n-10+%20语言支持-green?style=for-the-badge" alt="Languages">
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
- **纯键盘操作设计**：专为效率控设计——无需鼠标即可完成搜索、切换分类和插入提示词。

### 📂 高级分类管理
- **动态分类**：创建自定义分类，并配以个性化的 Emoji 图标。
- **图标搜索**：内置 Emoji 选择器，支持关键词搜索。
- **智能组织**：收藏夹和使用统计功能，让你最常用的提示词触手可及。

### 📝 交互式变量表单
将静态模板转换为精美的交互式表单：
- **丰富组件**：支持文本输入、多行文本、下拉选择、滑动条、日期/时间选择、颜色选择等。
- **实时预览**：在填写表单时实时查看最终提示词结果。
- **智能默认值**：预填常用值，节省重复输入时间。

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
  <img src="./screenshots/08_ai_generation_demo.mp4" alt="AI 生成演示" width="90%">
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

Prompt Plus 支持增强的 Handlebars 风格语法，可自动渲染为精美的 UI 组件。完全兼容 Open WebUI 原生语法。

| 类型 | 语法示例 | 描述 |
| :--- | :--- | :--- |
| **文本** | `{{name | text:placeholder="输入名称"}}` | 标准单行输入框 |
| **多行文本** | `{{code | textarea:placeholder="在此粘贴代码"}}` | 适合长文本或代码块 |
| **下拉选择** | `{{tone | select:options=["正式","休闲"]:default="正式"}}` | 预设选项下拉菜单 |
| **数值范围** | `{{temp | range:min=0:max=1:step=0.1:default=0.7}}` | 用于精确数值的滑动条 |
| **复选框** | `{{debug | checkbox:default=false}}` | 简单的布尔开关 |
| **日期/时间** | `{{deadline | date}}` 或 `{{meeting | datetime-local}}` | 原生日期/时间选择器 |
| **颜色** | `{{theme | color:default="#667eea"}}` | 视觉化颜色选择器 |
| **剪贴板** | `{{CLIPBOARD}}` | 自动注入当前剪贴板内容 |

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
  <b>GitHub</b>: <a href="https://github.com/fujie/open-webui-prompt-plus">fujie/open-webui-prompt-plus</a>
  <br />
  为 Open WebUI 社区用 ❤️ 打造
</p>
