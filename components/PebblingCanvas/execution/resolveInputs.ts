import { CanvasNode, Connection } from '../../types/pebblingTypes';
import { isValidImage } from '../apiAdapters';

/**
 * Recursively collect upstream images and texts for a node by tracing
 * incoming connections. Each node type contributes differently:
 * - Leaf nodes (text/idea/show-text/prompt-line/replace-text/llm): yield text
 * - Image-producing nodes (image/edit/bp/output/remove-bg/upscale/resize): yield images
 * - Relay nodes: transparent passthrough, continue tracing
 * - Video nodes: stop tracing (block both text and image)
 *
 * Sibling paths are traversed independently (each child gets a copy of
 * the visited set) so the same upstream node can contribute to multiple
 * downstream consumers.
 */
export function resolveInputs(
    nodeId: string,
    nodes: CanvasNode[],
    connections: Connection[],
    snapshotImages: Map<string, string>,
    visited: Set<string> = new Set(),
    excludePortKeys?: string[],
): { images: string[]; texts: string[] } {
    if (visited.has(nodeId)) return { images: [], texts: [] };
    visited.add(nodeId);

    const inputConnections = connections.filter(c =>
        c.toNode === nodeId &&
        (!excludePortKeys || !excludePortKeys.includes(c.toPortKey || ''))
    );
    const inputNodes = inputConnections
        .map(c => nodes.find(n => n.id === c.fromNode))
        .filter((n): n is CanvasNode => !!n);

    inputNodes.sort((a, b) => a.y - b.y);

    let images: string[] = [];
    let texts: string[] = [];

    // Pre-scan: detect if PromptLine / ShowText is distributing per-line output
    let promptLineProvided = false;
    for (const preNode of inputNodes) {
        if ((preNode.type === 'prompt-line' || preNode.type === 'show-text') && preNode.data?.output) {
            promptLineProvided = true;
            break;
        }
    }

    for (const node of inputNodes) {
        let foundTextInThisPath = false;
        let foundImageInThisPath = false;

        if (node.type === 'image') {
            if (isValidImage(node.content)) {
                const snap = snapshotImages.get(node.id);
                images.push(snap || node.content);
                foundImageInThisPath = true;
            } else {
                const outputConn = connections.find(c => c.fromNode === node.id);
                if (outputConn) {
                    const outputNode = nodes.find(
                        n => n.id === outputConn.toNode && n.type === 'output'
                    );
                    if (outputNode && isValidImage(outputNode.content)) {
                        images.push(outputNode.content);
                        foundImageInThisPath = true;
                    }
                }
            }
        } else if (node.type === 'text' || node.type === 'idea') {
            if (node.content && !promptLineProvided) {
                texts.push(node.content);
            }
            foundTextInThisPath = true;
        } else if (node.type === 'prompt-line') {
            if (node.data?.output) {
                texts.push(node.data.output);
                foundTextInThisPath = true;
            }
        } else if (node.type === 'show-text') {
            if (node.content && !promptLineProvided) {
                texts.push(node.content);
                foundTextInThisPath = true;
            }
        } else if (node.type === 'replace-text') {
            if (node.data?.output && !promptLineProvided) {
                texts.push(node.data.output);
                foundTextInThisPath = true;
            }
        } else if (node.type === 'llm') {
            if (node.data?.output && !promptLineProvided) {
                texts.push(node.data.output);
                foundTextInThisPath = true;
            }
        } else if (node.type === 'relay') {
            // Transparent passthrough — do NOT set found flags
        } else if (node.type === 'video' || node.type === 'video-output' || node.type === 'frame-extractor') {
            foundTextInThisPath = true;
            foundImageInThisPath = true;
        } else if (node.type === 'edit') {
            if (node.data?.output && isValidImage(node.data.output)) {
                images.push(node.data.output);
            } else {
                const editOutConn = connections.find(c => c.fromNode === node.id);
                if (editOutConn) {
                    const outNode = nodes.find(
                        n => n.id === editOutConn.toNode && n.type === 'output'
                    );
                    if (outNode && isValidImage(outNode.content)) {
                        images.push(outNode.content);
                    }
                }
            }
            foundTextInThisPath = true;
            foundImageInThisPath = true;
        } else if (node.type === 'remove-bg' || node.type === 'upscale' || node.type === 'resize') {
            if (node.data?.output && isValidImage(node.data.output)) {
                images.push(node.data.output);
            } else {
                const toolOutConn = connections.find(c => c.fromNode === node.id);
                if (toolOutConn) {
                    const outNode = nodes.find(
                        n => n.id === toolOutConn.toNode && n.type === 'output'
                    );
                    if (outNode && isValidImage(outNode.content)) {
                        images.push(outNode.content);
                    }
                }
            }
            foundTextInThisPath = true;
            foundImageInThisPath = true;
        } else if (node.type === 'bp') {
            const bpOutput = node.data?.output;
            if (node.status === 'completed') {
                if (bpOutput && isValidImage(bpOutput)) {
                    images.push(bpOutput);
                    foundImageInThisPath = true;
                } else if (isValidImage(node.content)) {
                    images.push(node.content);
                    foundImageInThisPath = true;
                }
            }
            foundTextInThisPath = true;
        } else if (node.type === 'output') {
            if (node.status === 'completed' && isValidImage(node.content)) {
                images.push(node.content);
                foundImageInThisPath = true;
            }
            foundTextInThisPath = true;
        }

        const child = resolveInputs(
            node.id, nodes, connections, snapshotImages,
            new Set(visited),
        );
        if (!foundTextInThisPath) texts.push(...child.texts);
        if (!foundImageInThisPath) images.push(...child.images);
    }

    return { images, texts };
}
