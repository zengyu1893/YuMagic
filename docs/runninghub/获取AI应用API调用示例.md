# 获取AI应用API调用示例

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/webapp/apiCallDemo:
    get:
      summary: 获取AI应用API调用示例
      deprecated: false
      description: 提供AI应用接口请求调用示例demo，可以参考示例快速发起接口调用
      tags:
        - AI 应用
      parameters:
        - name: apiKey
          in: query
          description: ''
          required: true
          schema:
            type: string
        - name: webappId
          in: query
          description: ''
          required: true
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          example: Bearer 834a792dc64d419f85592f1e57145745
          schema:
            type: string
            default: Bearer 834a792dc64d419f85592f1e57145745
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  msg:
                    type: string
                  data:
                    type: object
                    properties:
                      curl:
                        type: string
                      webappName:
                        type: string
                        description: AI应用名称
                      statisticsInfo:
                        type: object
                        properties:
                          likeCount:
                            type: string
                          downloadCount:
                            type: string
                          useCount:
                            type: string
                          pv:
                            type: string
                          collectCount:
                            type: string
                        required:
                          - likeCount
                          - downloadCount
                          - useCount
                          - pv
                          - collectCount
                        x-apifox-orders:
                          - likeCount
                          - downloadCount
                          - useCount
                          - pv
                          - collectCount
                        description: 统计信息
                      nodeInfoList:
                        type: array
                        items:
                          type: object
                          properties:
                            nodeId:
                              type: string
                            nodeName:
                              type: string
                            fieldName:
                              type: string
                            fieldValue:
                              type: string
                            fieldData:
                              type: string
                            fieldType:
                              type: string
                            description:
                              type: string
                            descriptionEn:
                              type: string
                          required:
                            - nodeId
                            - nodeName
                            - fieldName
                            - fieldValue
                            - fieldData
                            - fieldType
                            - description
                            - descriptionEn
                          x-apifox-orders:
                            - nodeId
                            - nodeName
                            - fieldName
                            - fieldValue
                            - fieldData
                            - fieldType
                            - description
                            - descriptionEn
                        description: 节点信息列表
                      covers:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            objName:
                              type: string
                            url:
                              type: string
                            thumbnailUri:
                              type: string
                            imageWidth:
                              type: string
                            imageHeight:
                              type: string
                          required:
                            - id
                            - objName
                            - url
                            - thumbnailUri
                            - imageWidth
                            - imageHeight
                          x-apifox-orders:
                            - id
                            - objName
                            - url
                            - thumbnailUri
                            - imageWidth
                            - imageHeight
                        description: 详情中所有封面信息
                      tags:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            name:
                              type: string
                            nameEn:
                              type: string
                            labels:
                              type: 'null'
                          required:
                            - id
                            - name
                            - nameEn
                            - labels
                          x-apifox-orders:
                            - id
                            - name
                            - nameEn
                            - labels
                        description: 标签
                    required:
                      - curl
                      - webappName
                      - statisticsInfo
                      - nodeInfoList
                      - covers
                      - tags
                    x-apifox-orders:
                      - curl
                      - webappName
                      - statisticsInfo
                      - nodeInfoList
                      - covers
                      - tags
                required:
                  - code
                  - msg
                  - data
                x-apifox-orders:
                  - code
                  - msg
                  - data
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: AI 应用
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/6103976/apis/api-335439604-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: https://www.runninghub.cn
    description: runninghub.cn
security: []

```
