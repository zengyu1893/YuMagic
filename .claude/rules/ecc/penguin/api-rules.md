# API 开发铁律

> 血的教训：不看文档就写代码 = 浪费时间 + 反复返工。
> 这些规则优先级最高，涉及 API 调用时必须逐条遵守。
>
> ⚠️ **注意：** 本文档中的文件路径（如 `D:\...`、`J:\...`）是原作者的本地路径，
> 换机器后需要更新。建议将 API 文档和参考项目复制到项目目录下统一管理。

---

## 规则 1: API 文档先行

```
⚠️ 调用任何 API 前，必须先从 Apifox JSON 文档中提取该端点的完整信息。

查询步骤：
1. 搜索模型名 → 找到对应 API 条目
2. 提取：请求方法 + 路径
3. 提取：请求体 JSON Schema（每个字段的类型、必填、可选值）
4. 提取：响应体 JSON Schema（字段名、类型）
5. 提取：示例请求和示例响应

❌ 禁止：看到 endpoint 是 /v1/images/generations 就假设所有模型格式一样
❌ 禁止：用一个模型的成功经验推断另一个模型
✅ 必须：每个模型都查文档，确认其在该端点下的实际格式
```

**API 文档路径：**
```
D:\360安全浏览器下载\向量API 接口对接6.1 .apifox_modified\
  向量API 接口对接6.1 .apifox_modified\
    向量引擎api接口文档.apifox.json
```

---

## 规则 2: 参考实现优先

```
⚠️ 二创/移植功能时，先搜索现有项目找到类似实现。

参考项目：
  J:\灵感魔盒\api\        ← Python 图像/视频/LLM 客户端 (openai_image.py, gemini.py 等)
  D:\Infinite-Canvas-main\  ← 前端设置页面设计 + API 配置模式

搜索步骤：
1. grep 模型名 → 找到调用代码
2. 看请求体构造 → 确认字段名、类型、可选值
3. 看响应解析 → 确认从哪里提取结果
4. 移植到 TypeScript，保持逻辑一致

❌ 禁止：从零写一个 API 调用，忽略已有实现
✅ 必须：先 grep，找到类似调用，移植而不是发明
✅ 必须：移植时注释注明来源（如"来自 灵感魔盒 api/openai_image.py line 106"）
```

---

## 规则 3: 模型→协议 精确映射

```
⚠️ 每个模型必须单独确认以下四项，缺一不可：

  [1] 端点路径    — /v1/images/generations? /v1/chat/completions? 其他?
  [2] 请求体格式  — 字段名、类型、可选值、必填项
  [3] 响应体格式  — 从哪里提取图片 (data[0].url? data[0].b64_json? choices[0].message.content?)
  [4] 特殊参数    — quality? moderation? n? seed? aspect_ratio vs size?

❌ 禁止：用正则批量匹配模型名然后统一格式
❌ 禁止：不确认响应格式就用 url 或 b64_json
✅ 必须：每个模型查文档确认，不匹配的标注为 "🔴 未验证，禁止使用"
✅ 必须：在 protocolRegistry.ts 中为每个格式单独写请求体构造逻辑
```

---

## 规则 4: 分析先行，确认再写

```
⚠️ 涉及 API 调用的修改，禁止直接写代码。

正确流程：
1. 输出分析结果：
   "模型 A → 端点 X → 请求参数 {a, b, c} → 响应解析方式 Y"
   "模型 B → 端点 X → 请求参数 {d, e, f} → 响应解析方式 Z"
   "模型 A 和 B 格式不同！需要区分处理"

2. 等待用户确认

3. 确认后再写代码

❌ 禁止：直接写代码让用户在报错中发现格式不对
✅ 必须：分析结果以表格形式展示，用户确认后再实现
```

---

## 规则 5: 外部参考项目路径速查

```
项目二创参考源：

  API 文档:
    D:\360安全浏览器下载\向量API 接口对接6.1 .apifox_modified\
      向量API 接口对接6.1 .apifox_modified\向量引擎api接口文档.apifox.json

  Python 参考实现:
    J:\灵感魔盒\api\openai_image.py   ← gpt-image 系列，含尺寸映射 ASPECT_SIZE_MAP
    J:\灵感魔盒\api\gemini.py         ← gemini 图像模型
    J:\灵感魔盒\api\rh_image.py       ← RunningHub 图像模型
    J:\灵感魔盒\main.py               ← 前端 UI 参数配置（比例/分辨率/质量/审核）

  前端设计参考:
    D:\Infinite-Canvas-main\static\api-settings.html  ← 设置页面布局
    D:\Infinite-Canvas-main\static\js\api-settings.js ← 设置页面逻辑
    D:\Infinite-Canvas-main\static\js\i18n\           ← 国际化参考
```

---

## 📋 API 调用检查清单

每次新增/修改 API 调用时，逐项确认：

```
□ 1. 从 Apifox JSON 查到了该模型的 API 条目？
□ 2. 请求体字段跟文档一致（不是猜的）？
□ 3. 响应解析方式跟文档一致？
□ 4. 跟参考实现（灵感魔盒/Infinite-Canvas）对比过？
□ 5. 不同格式的模型已分别处理？
□ 6. 把分析结果给用户确认过？
□ 7. 来源注释已写在代码里？
```

---

## ⚠️ 模型格式速查（已从文档确认）

| 模型 | 端点 | 格式 | 尺寸参数 | 响应取图 | 来源 |
|------|------|------|------|------|------|
| nano-banana-2 | /fal-ai/nano-banana [/edit] | fal-nano-banana | prompt+num_images / image_urls | images[0].url | API 文档 |
| gpt-image-2 | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 + 灵感魔盒 |
| gpt-image-2-all | /v1/images/generations [/edits] | openai-image | size(像素) 无quality | data[0].url | API 文档 |
| dall-e-3 | /v1/images/generations [/edits] | openai-image | size(像素) | data[0].url | API 文档 |
| flux-* | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| seedream-* | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| doubao-seedream-* | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| qwen-image-* | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| z-image-turbo | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| wan*-image | /v1/images/generations [/edits] | openai-image | size(像素) / multipart | data[0].b64_json | API 文档 |
| gemini-*-image | /v1beta/models/{model}:generateContent | gemini-native | imageConfig: aspectRatio+imageSize | candidates[0].content.parts | API 文档 + 灵感魔盒 |
| grok-*-image | /v1/chat/completions | openai-chat | content string (+base64) | choices[0].message.content | API 文档 |

**新增模型时必须更新上表。**
