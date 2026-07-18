import sys

with open('components/PebblingCanvas/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: RemoveBg handler
old1 = '''                          // 🔧 保存画布
                          await saveCurrentCanvas();
                          // 🔧 读回本地化后的 URL，避免 onImageGenerated 重复下载远程图片
                          const localizedBgNode = nodesRef.current.find(n => n.id === outputNodeId);
                          const localBgUrl = (localizedBgNode?.content && !localizedBgNode.content.startsWith('http://') && !localizedBgNode.content.startsWith('https://')) ? localizedBgNode.content : result;

                          // 🔧 同步到桌面
                          if (onImageGenerated) {
                              onImageGenerated(localBgUrl, '抠图结果', currentCanvasId || undefined, canvasName);
                          }'''

new1 = '''                          saveCurrentCanvas();
                          if (onImageGenerated) {
                              onImageGenerated(result, '抠图结果', currentCanvasId || undefined, canvasName);
                          }'''

# Pattern 2: Upscale handler
old2 = '''                          // 🔧 保存画布
                          await saveCurrentCanvas();
                          // 🔧 读回本地化后的 URL，避免 onImageGenerated 重复下载远程图片
                          const localizedUpNode = nodesRef.current.find(n => n.id === outputNodeId);
                          const localUpUrl = (localizedUpNode?.content && !localizedUpNode.content.startsWith('http://') && !localizedUpNode.content.startsWith('https://')) ? localizedUpNode.content : result;

                          // 🔧 同步到桌面
                          if (onImageGenerated) {
                              onImageGenerated(localUpUrl, '放大结果', currentCanvasId || undefined, canvasName);
                          }'''

new2 = '''                          saveCurrentCanvas();
                          if (onImageGenerated) {
                              onImageGenerated(result, '放大结果', currentCanvasId || undefined, canvasName);
                          }'''

count1 = content.count(old1)
count2 = content.count(old2)

if count1 == 0:
    print("WARNING: RemoveBg pattern not found! Checking partial match...")
    # Try to find partial matches
    if 'localBgUrl' in content:
        print("  localBgUrl found in content")
    if '抠图结果' in content:
        print("  抠图结果 found in content")

if count2 == 0:
    print("WARNING: Upscale pattern not found! Checking partial match...")
    if 'localUpUrl' in content:
        print("  localUpUrl found in content")
    if '放大结果' in content:
        print("  放大结果 found in content")

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open('components/PebblingCanvas/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'RemoveBg: {count1} replaced, Upscale: {count2} replaced')
