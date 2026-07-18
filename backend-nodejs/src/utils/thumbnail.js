const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * 缩略图生成工具
 * 使用串行队列避免多个 sharp 并发导致 OOM 崩溃
 */
class ThumbnailGenerator {
  /** @type {Array<{sourcePath: string, sourceDir: string, resolve: Function}>} */
  static queue = [];
  static processing = false;

  /**
   * 生成缩略图（入队，串行执行）
   * @param {string} sourcePath - 原图路径
   * @param {string} sourceDir - 原图所在目录名称（output/input/creative_images）
   * @returns {Promise<{success: boolean, thumbnailUrl?: string, error?: string}>}
   */
  static generate(sourcePath, sourceDir) {
    return new Promise((resolve) => {
      this.queue.push({ sourcePath, sourceDir, resolve });
      this._processQueue();
    });
  }

  /**
   * 串行处理队列，同一时间只允许一个 sharp 实例运行
   */
  static async _processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { sourcePath, sourceDir, resolve } = this.queue.shift();
      try {
        const result = await this._doGenerate(sourcePath, sourceDir);
        resolve(result);
      } catch (error) {
        console.error('生成缩略图失败:', error.message);
        resolve({ success: false, error: error.message });
      }
    }

    this.processing = false;
  }

  /**
   * 实际生成缩略图（含文件有效性验证）
   */
  static async _doGenerate(sourcePath, sourceDir) {
    // 1. 验证源文件存在且有效
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return { success: false, error: `源文件不存在: ${sourcePath}` };
    }

    let stat;
    try {
      stat = fs.statSync(sourcePath);
    } catch {
      return { success: false, error: `无法读取文件状态: ${sourcePath}` };
    }

    if (stat.size === 0) {
      return { success: false, error: '文件大小为 0，跳过' };
    }

    // 2. 验证文件 magic bytes（防止非图片文件传入 sharp 导致崩溃）
    try {
      const fd = fs.openSync(sourcePath, 'r');
      const buf = Buffer.alloc(8);
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);

      const isPNG = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      const isJPEG = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
      const isWebP = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46; // RIFF
      const isGIF = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;  // GIF8

      if (!isPNG && !isJPEG && !isWebP && !isGIF) {
        return { success: false, error: `不支持的图片格式 (magic: ${buf.slice(0,4).toString('hex')})` };
      }
    } catch (e) {
      // magic bytes 读取失败，可能是特殊文件，仍然尝试生成
      console.warn('[Thumbnail] magic bytes 验证跳过:', e.message);
    }

    // 3. 确保缩略图目录存在
    if (!fs.existsSync(config.THUMBNAILS_DIR)) {
      fs.mkdirSync(config.THUMBNAILS_DIR, { recursive: true });
    }

    // 4. 生成缩略图
    const filename = path.basename(sourcePath);
    const nameWithoutExt = path.parse(filename).name;
    const thumbnailFilename = `${sourceDir}_${nameWithoutExt}_thumb.jpg`;
    const thumbnailPath = path.join(config.THUMBNAILS_DIR, thumbnailFilename);

    // 如果缩略图已存在且不比原图旧，跳过
    if (fs.existsSync(thumbnailPath)) {
      const thumbStat = fs.statSync(thumbnailPath);
      if (thumbStat.mtime >= stat.mtime) {
        console.log(`✓ 缩略图已存在（跳过）: ${thumbnailFilename}`);
        return {
          success: true,
          thumbnailUrl: `/files/thumbnails/${thumbnailFilename}`,
          thumbnailPath
        };
      }
    }

    await sharp(sourcePath)
      .resize(config.THUMBNAIL_SIZE, config.THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: config.THUMBNAIL_QUALITY,
        progressive: true
      })
      .toFile(thumbnailPath);

    console.log(`✓ 缩略图已生成: ${thumbnailFilename}`);
    return {
      success: true,
      thumbnailUrl: `/files/thumbnails/${thumbnailFilename}`,
      thumbnailPath
    };
  }

  /**
   * 批量生成缩略图（用于历史数据迁移）
   * @param {string} sourceDir - 源目录路径
   * @param {string} dirName - 目录名称
   */
  static async generateBatch(sourceDir, dirName) {
    try {
      if (!fs.existsSync(sourceDir)) {
        console.log(`目录不存在: ${sourceDir}`);
        return { success: false, count: 0 };
      }

      const files = fs.readdirSync(sourceDir);
      const imageFiles = files.filter(f =>
        /\.(png|jpg|jpeg|webp|gif)$/i.test(f)
      );

      let successCount = 0;
      let skipCount = 0;

      for (const filename of imageFiles) {
        const sourcePath = path.join(sourceDir, filename);
        const result = await this.generate(sourcePath, dirName);
        if (result.success) {
          successCount++;
        } else if (result.error?.includes('已存在')) {
          skipCount++;
        }
      }

      console.log(`批量生成完成: ${successCount} 成功, ${skipCount} 跳过`);
      return { success: true, count: successCount, skipped: skipCount };
    } catch (error) {
      console.error('批量生成缩略图失败:', error.message);
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * 删除缩略图
   * @param {string} originalFilename - 原图文件名
   * @param {string} sourceDir - 原图目录名称
   */
  static delete(originalFilename, sourceDir) {
    try {
      const nameWithoutExt = path.parse(originalFilename).name;
      const thumbnailFilename = `${sourceDir}_${nameWithoutExt}_thumb.jpg`;
      const thumbnailPath = path.join(config.THUMBNAILS_DIR, thumbnailFilename);

      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log(`✓ 缩略图已删除: ${thumbnailFilename}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除缩略图失败:', error.message);
      return false;
    }
  }

  /**
   * 获取缩略图URL
   * @param {string} originalUrl - 原图URL (如 /files/output/xxx.png)
   * @returns {string} 缩略图URL
   */
  static getThumbnailUrl(originalUrl) {
    if (!originalUrl || !originalUrl.startsWith('/files/')) {
      return originalUrl;
    }

    const parts = originalUrl.split('/');
    if (parts.length < 4) return originalUrl;

    const dirName = parts[2];
    const filename = parts[parts.length - 1]; // 取最后一段作为文件名
    const nameWithoutExt = path.parse(filename).name;

    return `/files/thumbnails/${dirName}_${nameWithoutExt}_thumb.jpg`;
  }
}

module.exports = ThumbnailGenerator;
