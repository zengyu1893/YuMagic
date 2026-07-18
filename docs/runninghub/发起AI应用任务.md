# 发起AI应用任务

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /task/openapi/ai-app/run:
    post:
      summary: 发起AI应用任务
      deprecated: false
      description: |-
        在AI应用详情页中可查看示例nodeInfoList
        注：调用本接口生成的图片、视频等结果不带有工作流信息。
      tags:
        - AI 应用
      parameters:
        - name: Host
          in: header
          description: ''
          required: true
          example: www.runninghub.cn
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          example: Bearer 834a792dc64d419f85592f1e57145745
          schema:
            type: string
            default: Bearer 834a792dc64d419f85592f1e57145745
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TaskRunWebappByKeyRequest'
              description: ''
            example:
              webappId: 1877265245566922800
              apiKey: '{{apiKey}}'
              nodeInfoList:
                - nodeId: '122'
                  fieldName: prompt
                  fieldValue: 一个在教室里的金发女孩
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RTaskCreateResponse'
                description: ''
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: AI 应用
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/6103976/apis/api-279098421-run
components:
  schemas:
    TaskRunWebappByKeyRequest:
      type: object
      properties:
        apiKey:
          type: string
          description: ''
        webappId:
          type: integer
          description: ''
          format: int64
        nodeInfoList:
          type: array
          items:
            $ref: '#/components/schemas/NodeInfo'
            description: com.haima.runninghub.common.model.pojo.NodeInfo
          description: ''
        webhookUrl:
          type: string
          description: ''
        instanceType:
          type: string
          description: 非必须，默认'default'调用24g显存机器，传'plus' 调用48g显存机器
      x-apifox-orders:
        - apiKey
        - webappId
        - nodeInfoList
        - webhookUrl
        - instanceType
      required:
        - apiKey
        - webappId
        - nodeInfoList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    NodeInfo:
      type: object
      properties:
        nodeId:
          type: string
          description: ''
        nodeName:
          type: string
          description: ''
        fieldName:
          type: string
          description: ''
        fieldValue:
          type: string
          description: ''
        fieldData:
          type: string
          description: ''
        description:
          type: string
          description: ''
        descriptionEn:
          type: string
          description: ''
      x-apifox-orders:
        - nodeId
        - nodeName
        - fieldName
        - fieldValue
        - fieldData
        - description
        - descriptionEn
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    RTaskCreateResponse:
      type: object
      properties:
        code:
          type: integer
          description: 返回标记：成功标记=0，非0失败，或者是功能码
        msg:
          type: string
          description: 返回信息
        data:
          $ref: '#/components/schemas/TaskCreateResponse'
          description: 数据
      x-apifox-orders:
        - code
        - msg
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    TaskCreateResponse:
      type: object
      properties:
        netWssUrl:
          type: string
          description: Wss服务地址
        taskId:
          type: integer
          description: 任务Id
          format: int64
        clientId:
          type: string
          description: 客户端ID，当客户端首次接收clientId时，需要保存到本地，以便页面刷新重连或者二次运行任务传参使用
        taskStatus:
          type: string
          description: '任务状态: CREATE, SUCCESS, FAILED, RUNNING, QUEUED;'
        promptTips:
          type: string
          description: 工作流验证结果提示,当不为空是UI需要展示节点错误信息
      x-apifox-orders:
        - netWssUrl
        - taskId
        - clientId
        - taskStatus
        - promptTips
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: https://www.runninghub.cn
    description: runninghub.cn
security: []

```
