# Open WebUI 0.8.0+ 深度适配与数据兼容性指南

由于 Open WebUI 在 0.8.0 版本对提示词（Prompts）底层架构进行了重大重构，原本基于指令（Command）的管理逻辑在面对新版本时会出现功能失效（如 405 错误）和数据丢失（重命名后找不到分类）的问题。

本手册旨在详细记录这些变更及其应对方案，供开发参考或项目迁移使用。

---

## 1. 版本变更分析：更新了什么？

### 1.1 主键从 Command 转向 UUID

* **之前（< 0.8.0）**：系统通过 `/` 开头的指令名唯一标识一个提示词。
* **现在（≥ 0.8.0）**：引入了数据库 UUID (`id`)。API 端点现在强制要求使用这些 ID 进行精确操作。

### 1.2 核心字段重命名

* **字段变更**：`title` 字段在数据库模型中更名为 `name`。
* **接口影响**：虽然部分接口做了向下兼容，但在创建和更新元数据时，如果不传递 `name` 字段，可能会导致显示错误或保存失败。

### 1.3 接口权限变更 (405 错误根源)

* Open WebUI 0.8.0 起，为了增强安全性并支持版本历史，禁止了对特定路径（如 `/_` 系统元数据存储）直接通过指令名进行更新。
* **错误现象**：调用 `POST .../command/_/update` 返回 `405 Method Not Allowed`。
* **解决要求**：必须先获取该提示词的 UUID，然后请求 `POST .../id/{uuid}/update`。

---

## 2. 解决方案：双端适配架构

### 2.1 智能版本探测 (Detection)

API 类应具备感知能力，通过 `getServerVersion()` 访问官方 `/api/version` 接口，或通过数据结构特征进行静默识别。

```javascript
// openwebui-api.js 中的关键探测片段
async getAllPrompts() {
    const prompts = await response.json();
    // 检查返回的数据是否包含 0.8.0 特征字段
    if (prompts.length > 0 && prompts[0].id && prompts[0].name !== undefined) {
        this.serverCapability.isV080OrNewer = true;
    }
    return prompts;
}
```

### 2.2 数据模型双向兼容 (Payload Alignment)

在与服务器通信时，始终采取“最大合集”策略，同时发送新旧字段。

```javascript
// 统一的负载构造逻辑
const apiPayload = {
    ...data,
    title: data.title, // 兼容旧版
    name: data.title,  // 适配 0.8.0+
    // 0.8.0 数据库中命令名不再强制带斜杠，由后端处理显示
    command: isV080 ? command.replace(/^\//, '') : `/${command.replace(/^\//, '')}`
};
```

---

## 3. 核心修复源代码参考

### 3.1 解决 405 错误的更新逻辑

```javascript
async updatePrompt(command, data) {
    const finalCommand = command.replace(/^\//, '');
    let endpoint = `${this.apiURL}command/${finalCommand}/update`;

    // 如果探测到 0.8.0 且拥有 UUID，则切换端点
    if (data.id && this.serverCapability.isV080OrNewer) {
        endpoint = `${this.apiURL}id/${data.id}/update`;
    }
    
    // 执行请求...
}
```

### 3.2 跨版本“更名自愈”逻辑

由于用户可能在新版中重命名 Command，导致插件原本存储在元数据中的分类信息失效，我们需要通过 UUID 指纹进行追踪。

```javascript
// prompt-manager.js 中的指纹迁移逻辑
enhancePromptsWithMetadata(prompts) {
    for (const prompt of prompts) {
        // 1. 尝试直接通过命令名匹配
        let meta = this.metadata.prompts[prompt.command];

        // 2. 软匹配 (重命名检测)：通过指纹识别
        if (!meta && prompt.id) {
            const foundKey = Object.keys(this.metadata.prompts).find(
                k => this.metadata.prompts[k].uuid === prompt.id
            );
            
            if (foundKey) {
                // 自动将元数据迁移到新命令名下
                this.metadata.prompts[prompt.command] = this.metadata.prompts[foundKey];
                delete this.metadata.prompts[foundKey];
                meta = this.metadata.prompts[prompt.command];
            }
        }
        
        // 3. 应用元数据...
    }
}
```

---

## 4. 给新项目的建议

1. **优先捕获 UUID**：在 `createPrompt` 返回时，务必将服务端生成的 `id` 保存到本地内存/缓存中，这决定了之后能否成功更新。
2. **维持 Command 为逻辑键**：为了支持用户在版本间切换，元数据存储依然建议以 `command` 为主键，UUID 仅作为“指纹”辅助识别。
3. **注意执行生命周期**：在 `loadData` 时，务必按照：**获取 API 数据 -> 转换格式 -> 增强(指纹迁移) -> 最终同步** 的顺序执行，防止因同步逻辑过早介入而将重命名期间的记录标记为“孤立”并删除。

---

## 5. 参考与相关资源

* **Open WebUI 官方仓库**: [GitHub - open-webui/open-webui](https://github.com/open-webui/open-webui)
* **API 变更相关 PR**:
  * [feat: Add prompt history and versioning #1770](https://github.com/open-webui/open-webui/pull/1770) (关键变更：引入 UUID 和支持按 ID 管理)
* **版本管理 API**: `GET /api/version` (返回例如 `{"version": "0.8.0"}`)
* **关键 API 文档提示**:
  * `GET /api/v1/prompts/`: 获取所有提示词列表。
  * `POST /api/v1/prompts/id/{id}/update`: 0.8.0+ 推荐的更新方式，规避 405 错误。
  * `POST /api/v1/prompts/command/{command}/update`: 传统更新方式（旧版兼容）。
