const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

/**
 * JSON数据存储工具类
 * 负责读写JSON文件，提供数据持久化功能
 * load/save = 同步（保留向后兼容）
 * loadAsync/saveAsync = 异步（推荐，不阻塞事件循环）
 */
class JsonStorage {
  /**
   * 加载JSON文件（同步）
   */
  static load(filePath, defaultValue = []) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`读取JSON文件失败: ${filePath}`, error.message);
      return defaultValue;
    }
  }

  /**
   * 加载JSON文件（异步）
   */
  static async loadAsync(filePath, defaultValue = []) {
    try {
      await fsp.access(filePath);
      const data = await fsp.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return defaultValue;
      console.error(`读取JSON文件失败: ${filePath}`, error.message);
      return defaultValue;
    }
  }

  /**
   * 保存数据到JSON文件（同步）
   */
  static save(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error(`保存JSON文件失败: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 保存数据到JSON文件（异步）
   */
  static async saveAsync(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error(`保存JSON文件失败: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 初始化数据文件（如果不存在则创建）
   */
  static init(filePath, defaultValue = []) {
    if (!fs.existsSync(filePath)) {
      this.save(filePath, defaultValue);
      console.log(`✓ 创建数据文件: ${filePath}`);
    }
  }
}

module.exports = JsonStorage;
