/**
 * Plist文件解析器
 * 将plist格式转换为Phaser可用的JSON格式
 */
export class PlistParser {
  /**
   * 解析plist XML字符串为JSON对象
   */
  static parse(xmlString: string): Record<string, unknown> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const plistElement = xmlDoc.getElementsByTagName('plist')[0];

    if (!plistElement) {
      throw new Error('Invalid plist file: no plist element found');
    }

    const dictElement = plistElement.getElementsByTagName('dict')[0];
    if (!dictElement) {
      throw new Error('Invalid plist file: no dict element found');
    }

    return this.parseDictElement(dictElement);
  }

  /**
   * 解析dict元素
   */
  private static parseDictElement(dictElement: Element): Record<string, unknown> {
    const dict: Record<string, unknown> = {};
    const children = dictElement.children;

    for (let i = 0; i < children.length; i += 2) {
      const keyElement = children[i];
      const valueElement = children[i + 1];

      if (keyElement.tagName === 'key' && valueElement) {
        const key = keyElement.textContent || '';
        dict[key] = this.parseValueElement(valueElement);
      }
    }

    return dict;
  }

  /**
   * 解析值元素
   */
  private static parseValueElement(element: Element): unknown {
    switch (element.tagName) {
      case 'dict':
        return this.parseDictElement(element);
      case 'array':
        return this.parseArrayElement(element);
      case 'string':
        return element.textContent || '';
      case 'integer':
        return parseInt(element.textContent || '0', 10);
      case 'real':
        return parseFloat(element.textContent || '0');
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return null;
    }
  }

  /**
   * 解析array元素
   */
  private static parseArrayElement(arrayElement: Element): unknown[] {
    const array: unknown[] = [];
    const children = arrayElement.children;

    for (let i = 0; i < children.length; i++) {
      array.push(this.parseValueElement(children[i]));
    }

    return array;
  }

  /**
   * 将plist格式的图集数据转换为Phaser的JSON Atlas格式
   */
  static convertToPhaser(plistData: Record<string, unknown>): Record<string, unknown> {
    const frames = plistData.frames as Record<string, Record<string, unknown>>;
    const metadata = plistData.metadata as Record<string, unknown>;

    const phaserFrames: Record<string, unknown> = {};

    for (const frameName in frames) {
      const frame = frames[frameName] as Record<string, unknown>;
      const frameRect = this.parseRect(frame.frame as string);
      const sourceSize = this.parseSize(frame.sourceSize as string);
      const sourceColorRect = this.parseRect(frame.sourceColorRect as string);
      const rotated = frame.rotated as boolean;

      phaserFrames[frameName] = {
        frame: {
          x: frameRect.x,
          y: frameRect.y,
          w: rotated ? frameRect.h : frameRect.w,
          h: rotated ? frameRect.w : frameRect.h,
        },
        rotated: rotated,
        trimmed: true,
        spriteSourceSize: {
          x: sourceColorRect.x,
          y: sourceColorRect.y,
          w: sourceColorRect.w,
          h: sourceColorRect.h,
        },
        sourceSize: {
          w: sourceSize.w,
          h: sourceSize.h,
        },
      };
    }

    return {
      frames: phaserFrames,
      meta: {
        app: 'TexturePacker',
        version: '1.0',
        image: metadata?.textureFileName || '',
        format: metadata?.format || 'RGBA8888',
        size: this.parseSize(metadata?.size as string || '{0,0}'),
        scale: '1',
      },
    };
  }

  /**
   * 解析矩形字符串 "{{x,y},{w,h}}"
   */
  private static parseRect(rectStr: string): { x: number; y: number; w: number; h: number } {
    const matches = rectStr.match(/\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}/);
    if (!matches) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }

    return {
      x: parseInt(matches[1], 10),
      y: parseInt(matches[2], 10),
      w: parseInt(matches[3], 10),
      h: parseInt(matches[4], 10),
    };
  }

  /**
   * 解析尺寸字符串 "{w,h}"
   */
  private static parseSize(sizeStr: string): { w: number; h: number } {
    const matches = sizeStr.match(/\{(\d+),(\d+)\}/);
    if (!matches) {
      return { w: 0, h: 0 };
    }

    return {
      w: parseInt(matches[1], 10),
      h: parseInt(matches[2], 10),
    };
  }
} 