# 🚀 Open WebUI Prompt Plus: AI 驱动的提示词管理器 & 聚光灯搜索

很高兴分享 **Prompt Plus**，这是一个旨在提升 Open WebUI 提示词工程工作流的强大扩展。它为您的日常 AI 交互带来了专业级的管理功能、AI 辅助生成以及无缝的聚光灯风格界面。

### 🌟 为什么选择 Prompt Plus?

如果您正在为管理数百个提示词而苦恼，或者想要一种无需记忆复杂命令即可快速查找并插入提示词的方法，那么这就是为您准备的。

*   **🤖 AI 智能生成**：只需描述您的需求（例如“Python 代码审查员”），它就会为您生成结构化、包含丰富变量的提示词。它甚至可以处理自动分类和标题建议！
*   **⚡ 聚光灯快速访问**：在任何地方按下 `Cmd/Ctrl + Shift + P` 即可打开命令面板。通过标题、内容或标签即时模糊搜索您的提示词。
*   **📝 交互式表单**：释放 Open WebUI 原生变量语法的全部潜力。无需记忆斜杠命令，Prompt Plus 将您的 `{{variables}}` 渲染为精美的表单，支持**下拉菜单**、**日期选择器**、**滑块**和**颜色选择器**。
*   **🌍 多语言支持**：完全本地化支持 10 种语言（英语、中文、日语、韩语、法语、德语、西班牙语、荷兰语、希腊语）。

### 📦 轻松安装

您可以通过 Docker 卷挂载轻松安装。无需复杂的设置！

```yaml
volumes:
  - ./dist/custom.css:/app/build/static/custom.css
  - ./dist/loader.js:/app/build/static/loader.js
  - ./dist/js/prompt-plus-app.js:/app/build/static/js/prompt-plus-app.js
```

*(查看 GitHub 仓库获取完整的 `docker-compose.yml` 示例)*

### 🔗 链接

*   **GitHub 仓库**: [https://github.com/Fu-Jie/open-webui-prompt-plus](https://github.com/Fu-Jie/open-webui-prompt-plus)
*   **完整文档**: [阅读文档](https://github.com/Fu-Jie/open-webui-prompt-plus/blob/main/README_CN.md)

期待听到您的反馈！让我知道您接下来希望看到什么功能。祝您使用愉快！🚀
