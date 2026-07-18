# AI应用完整接入示例

# 📝 RunningHub AI 应用 Python 交互操作脚本使用手册

## 1. 脚本功能概述

这个 Python 脚本可以帮助你：

- 获取指定 AI 应用（WebApp）的可修改节点信息（`nodeInfoList`）。
- 根据节点类型（图片，文本）修改节点值。
- 上传本地文件到 AI 应用。
- 提交修改后的任务到 AI 应用。
- 自动轮询任务状态，直到生成结果。
- 输出生成结果的文件链接。

> 简单说：你可以通过这个脚本，把本地文件或者文本发送给 RunningHub AI 应用，让它生成或处理内容，并自动获取结果。

---

## 2. 代码介绍

- `def get_nodo(webappId,Api_Key)`

  - 获取 AI 应用的节点列表（`nodeInfoList`）。
  - 可参考 RunningHub 官方 API 文档的“获取 AI 应用信息示例”。

- `def upload_file(API_KEY,file_path)`

  - 上传本地文件到 RunningHub 服务器（图片）。
  - 可参考官方 API 文档的“上传资源示例”。

- `def submit_task(webapp_id, node_info_list,API_KEY)`

  - 提交 AI 应用任务。
  - 可参考官方 API 文档的“发起任务示例”。

- `def query_task_outputs(task_id,API_KEY)`

  - 查询任务状态（/task/openapi/status已停止维护）与查询任务生成结果。
  - 可参考官方 API 文档的“查询任务生成结果示例”。

- `main` 函数

  - 用户可在控制台与脚本交互，完成从： `获取节点列表 → 修改节点信息 → 提交任务 → 轮询查询任务状态 → 获取任务结果` 的整个流程。

---

## 3. 用户在控制台操作步骤（详细版）

### Step 1：输入 API 信息

脚本首先会提示你输入 API Key 和 WebApp ID，用于获取 AI 应用所需的节点信息。

```text
请输入你的 api_key:
```

> 示例：`a0fa3e****************345171`

```text
请输入 webappId:
```

> 示例：`1937084629516193794`

> 说明：WebApp 链接为 `https://www.runninghub.cn/ai-detail/1937084629516193794`，末尾数字即 `webappId`。

等待脚本获取 `nodeInfoList`，其中包含所有可修改的节点：

```json
✅ 提取的 nodeInfoList:
[
  {
    "nodeId": "39",
    "nodeName": "LoadImage",
    "fieldName": "image",
    "fieldValue": "a293d89506f9c484f4ea5695f93024a80cd62ef98f4ee4543faba357536b37ec.jpg",
    "fieldType": "IMAGE",
    "description": "上传图像"
  },
  {
    "nodeId": "37",
    "nodeName": "RH_ComfyFluxKontext",
    "fieldName": "model",
    "fieldValue": "flux-kontext-pro",
    "fieldType": "LIST",
    "description": "模型切换"
  },
  {
    "nodeId": "37",
    "nodeName": "RH_ComfyFluxKontext",
    "fieldName": "aspect_ratio",
    "fieldValue": "match_input_image",
    "fieldType": "LIST",
    "description": "输出比例"
  },
  {
    "nodeId": "52",
    "nodeName": "RH_Translator",
    "fieldName": "prompt",
    "fieldValue": "给这个女人的发型变成齐耳短发,",
    "fieldType": "STRING",
    "description": "图像编辑文本输入框"
  }
]
```

---

### Step 2：选择要修改的节点

生成 `nodeInfoList` 后，脚本会提示输入节点 ID 和字段名进行修改。

```text
请输入 nodeId（输入 'exit' 结束修改）:
```

> 示例输入：`39`

```text
请输入 fieldName:
```

> 示例输入：`image`

脚本会显示选中的节点信息：

```text
选中节点: {'nodeId': '39', 'nodeName': 'LoadImage', 'fieldName': 'image', 'fieldValue': 'a293d8...', 'fieldType': 'IMAGE', 'description': '上传图像'}
```

---

### Step 3：修改节点值

#### 3.1 IMAGE  类型

脚本提示：

```text
请输入您本地IMAGE文件路径:
```

> 示例输入：`D:\R.jpg`

上传成功后，脚本返回文件信息并自动更新节点值：

```text
等待文件上传中
上传结果: {'code': 0, 'msg': 'success', 'data': {'fileName': 'api/xxxx.jpg', 'fileType': 'image'}}
✅ 已更新 IMAGE fieldValue: api/xxxx.jpg
```

#### 3.2 STRING 类型

脚本提示：

```text
请输入新的 fieldValue (STRING):
```

> 示例输入：`给这个男人的发型变成齐耳短发`

返回更新结果：

```text
✅ 已更新 fieldValue: 给这个男人的发型变成齐耳短发
```


#### 3.3 LIST 类型

脚本提示：

```text
请输入新的 fieldValue (LIST):
```

> 示例说明：`fieldData里面选择列表里面一个index的值更新到fieldValue里面`

返回更新结果：

```text
✅ 已更新 fieldValue: 1:1
```

> 可以循环修改多个节点，直到输入 `exit` 结束。

其他的节点信息修改步骤和示例修改的节点信息步骤一致

---

### Step 4：提交任务

完成节点修改后，脚本自动提交任务：

```text
开始提交任务，请等待
📌 提交任务返回: {'code': 0, 'msg': 'success', 'data': {'taskId': '1979110509284917250', ... ,'promptTips': '{"result": true, "error": null, "outputs_to_execute": ["36"], "node_errors": {}}'}}}
如果promptTips中node_errors不为空，说明有节点出错了
⚠️ 节点错误信息如下：
node_errors{}
📝 taskId: 1979110509284917250
```

> 说明：`taskId` 用于查询任务状态和获取结果。
>说明: 如果`promptTips`中`node_errors`不为空，说明有节点出错了
---

### Step 5：轮询任务状态

脚本会自动每隔 5 秒查询一次任务状态：

```text
⏳ 任务排队中...
⏳ 任务运行中...
🎉 生成结果完成！
✅ 任务完成！
```

- `SUCCESS` → 任务完成
- `有failedReason` → 任务失败
- 其他状态 → 等待中

---

### Step 6：获取生成结果

任务完成后，脚本输出结果链接：

```text
🎉 生成结果完成！
https://rh-images.xiaoyaoyou.com/f24a6365b08fa3bc02f55cd1f63e74a7/output/ComfyUI_00001_vpvtp_1760691733.png
```

> 直接打开链接即可查看生成文件。

---

### ⚡ 小贴士

1. **文件路径格式**

   - Windows 用户使用：`D:\path\to\file.jpg`

2. **网络问题**

   - 上传或提交任务可能因网络慢导致失败，可重试。

3. **一次修改多个节点**

   - 循环输入 `nodeId + fieldName + 新内容`，输入 `exit` 结束循环。

4. **文件类型处理**

   - `IMAGE` → 自动上传文件
   - `STRING` → 直接输入文本
   - `LIST` → 直接在fieldData里面选择列表里面一个index的值更新到fieldValue里面

---

## 4. 使用流程总结

1. 输入 `api_key` 和 `webappId`
2. 获取 `nodeInfoList`
3. 循环修改节点
4. 提交任务
5. 自动轮询状态
6. 获取生成结果文件链接

> 完全通过 Python 脚本操作 RunningHub AI 应用，无需在网页上手动操作，非常适合批量处理任务。

---

## 5. Python 自动操作脚本完整示例

```python
import http.client
import json
import mimetypes
from codecs import encode
import time
import os
import requests
API_HOST = "www.runninghub.cn"
def get_nodo(webappId,Api_Key):
    conn = http.client.HTTPSConnection(API_HOST)
    payload = ''
    headers = {}
    conn.request("GET", f"/api/webapp/apiCallDemo?apiKey={Api_Key}&webappId={webappId}", payload, headers)
    res = conn.getresponse()
    # 读取响应内容
    data = res.read()
    # 转成 Python 字典
    data_json = json.loads(data.decode("utf-8"))
    # 取出 nodeInfoList
    node_info_list = data_json.get("data", {}).get("nodeInfoList", [])
    print("✅ 提取的 nodeInfoList:")
    print(json.dumps(node_info_list, indent=2, ensure_ascii=False))
    return node_info_list
def upload_file(API_KEY, file_path):
    """
    上传文件到 RunningHub 平台
    """
    url = "https://www.runninghub.cn/task/openapi/upload"
    headers = {
        'Host': 'www.runninghub.cn'
    }
    data = {
        'apiKey': API_KEY,
        'fileType': 'input'
    }
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, headers=headers, files=files, data=data)
    return response.json()
# 1️⃣ 提交任务
def submit_task(webapp_id, node_info_list,API_KEY):
    conn = http.client.HTTPSConnection(API_HOST)
    payload = json.dumps({
        "webappId": webapp_id,
        "apiKey": API_KEY,
        # "quickCreateCode": quick_create_code,
        "nodeInfoList": node_info_list
    })
    headers = {
        'Host': API_HOST,
        'Content-Type': 'application/json'
    }
    conn.request("POST", "/task/openapi/ai-app/run", payload, headers)
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    conn.close()
    return data
def query_task_outputs(task_id,API_KEY):
    conn = http.client.HTTPSConnection(API_HOST)
    payload = json.dumps({
        "apiKey": API_KEY,
        "taskId": task_id
    })
    headers = {
        'Host': API_HOST,
        'Content-Type': 'application/json'
    }
    conn.request("POST", "/task/openapi/outputs", payload, headers)
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    conn.close()
    return data
if __name__ == "__main__":
    print("下面两个输入用于获得AI应用所需要的信息，api_key为用户的密钥从api调用——进入控制台中获得，webappId为（此为示例，具体的webappId为你所选择的AI应用界面上方的链接https://www.runninghub.cn/ai-detail/1937084629516193794，最后的数字为webappId）")
    Api_key = input("请输入你的 api_key: ").strip()
    webappid = input("请输入 webappId: ").strip()
    print("等待node_info_list生成（包涵所有的可以修改的node节点）")
    node_info_list = get_nodo(webappid, Api_key)
    print("下面用户可以输入AI应用可以修改的节点id：nodeId,以及对应的fileName,锁定具体的节点位置，在找到具体位置之后，输入您需要修改的fileValue信息完成信息的修改用户发送AI应用请求")
    while True:
        node_id_input = input("请输入 nodeId（输入 'exit' 结束修改）: ").strip()
        if node_id_input.lower() == "exit":
            break
        field_name_input = input("请输入 fieldName: ").strip()
        # 查找对应节点
        target_node = next(
            (n for n in node_info_list if n['nodeId'] == node_id_input and n['fieldName'] == field_name_input), None)
        if not target_node:
            print("❌ 未找到对应节点")
            continue
        print(f"选中节点: {target_node}")
        # 根据类型处理
        if target_node['fieldType'] in ["IMAGE", "AUDIO", "VIDEO"]:
            file_path = input(f"请输入您本地{target_node['fieldType']}文件路径: ").strip()
            print("等待文件上传中")
            upload_result = upload_file(Api_key, file_path)
            print("上传结果:", upload_result)
            # 假设 upload_file 已返回解析后的 JSON 字典
            if upload_result and upload_result.get("msg") == "success":
                uploaded_file_name = upload_result.get("data", {}).get("fileName")
                if uploaded_file_name:
                    target_node['fieldValue'] = uploaded_file_name
                    print(f"✅ 已更新 {target_node['fieldType']} fieldValue:", uploaded_file_name)
            else:
                print("❌ 上传失败或返回格式异常:", upload_result)
        else:
            # 其他类型直接修改
            new_value = input(f"请输入新的 fieldValue ({target_node['fieldType']}): ").strip()
            target_node['fieldValue'] = new_value
            print("✅ 已更新 fieldValue:", new_value)
    print("开始提交任务，请等待")
    # 提交任务
    submit_result = submit_task(webappid, node_info_list,Api_key)
    print("📌 提交任务返回:", submit_result)
    if submit_result.get("code") != 0:
        print("❌ 提交任务失败:", submit_result)
        exit()
    task_id = submit_result["data"]["taskId"]
    print(f"📝 taskId: {task_id}")
    # 解析成功返回
    prompt_tips_str = submit_result["data"].get("promptTips")
    if prompt_tips_str:
        try:
            prompt_tips = json.loads(prompt_tips_str)
            node_errors = prompt_tips.get("node_errors", {})
            if node_errors:
                print("⚠️ 节点错误信息如下：")
                for node_id, err in node_errors.items():
                    print(f"  节点 {node_id} 错误: {err}")
            else:
                print("✅ 无节点错误，任务提交成功。")
        except Exception as e:
            print("⚠️ 无法解析 promptTips:", e)
    else:
        print("⚠️ 未返回 promptTips 字段。")
    timeout = 600
    start_time = time.time()
    while True:
        outputs_result = query_task_outputs(task_id, Api_key)
        code = outputs_result.get("code")
        msg = outputs_result.get("msg")
        data = outputs_result.get("data")
        if code == 0 and data:  # 成功
            file_url = data[0].get("fileUrl")
            print("🎉 生成结果完成！")
            print(data)
            break
        elif code == 805:  # 任务失败
            failed_reason = data.get("failedReason") if data else None
            print("❌ 任务失败！")
            if failed_reason:
                print(f"节点 {failed_reason.get('node_name')} 失败原因: {failed_reason.get('exception_message')}")
                print("Traceback:", failed_reason.get("traceback"))
            else:
                print(outputs_result)
            break
        elif code == 804 or code == 813:  # 运行中或排队中
            status_text = "运行中" if code == 804 else "排队中"
            print(f"⏳ 任务{status_text}...")
        else:
            print("⚠️ 未知状态:", outputs_result)
        # 超时检查
        if time.time() - start_time > timeout:
            print("⏰ 等待超时（超过10分钟），任务未完成。")
            break
        time.sleep(5)
    print("✅ 任务完成！")

```


