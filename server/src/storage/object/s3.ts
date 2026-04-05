/* ──────────────────────────────────────────────
   S3 适配器 — S3 兼容对象存储实现
   支持：AWS S3 / Backblaze B2 / 阿里云 OSS / 腾讯云 COS
   通过 endpoint 参数区分不同厂商
   ────────────────────────────────────────────── */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { IObjectStorage, StorageObject, StorageListItem } from "../interfaces";

export type S3Config = {
  endpoint: string;      // 如 https://s3.us-west-002.backblazeb2.com
  region?: string;       // 默认 auto
  accessKey: string;
  secretKey: string;
  bucket: string;
  /** 公开访问 URL 前缀（可选，用于生成直链） */
  publicUrl?: string;
};

export class S3Adapter implements IObjectStorage {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || "auto",
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      // B2 和部分 OSS 需要 path-style
      forcePathStyle: true,
    });
  }

  async put(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    options?: { contentType?: string; customMetadata?: Record<string, string> }
  ): Promise<void> {
    // 将各种输入统一转为 Uint8Array
    let body: Uint8Array | string;
    if (typeof data === "string") {
      body = data;
    } else if (data instanceof ArrayBuffer) {
      body = new Uint8Array(data);
    } else {
      // ReadableStream → Uint8Array
      const reader = data.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.value) chunks.push(result.value);
        done = result.done;
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      body = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
    }

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options?.contentType,
      Metadata: options?.customMetadata,
    }));
  }

  async get(key: string): Promise<StorageObject | null> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      if (!response.Body) return null;

      const contentType = response.ContentType || "application/octet-stream";

      // @aws-sdk 返回的 Body 在 Node.js 是 Readable，在浏览器是 ReadableStream
      // Workers 环境中需要转换
      const bodyStream = response.Body.transformToWebStream();

      return {
        body: bodyStream,
        contentType,
        writeHeaders(headers: Headers) {
          headers.set("Content-Type", contentType);
          if (response.ContentLength) {
            headers.set("Content-Length", String(response.ContentLength));
          }
          if (response.ETag) {
            headers.set("ETag", response.ETag);
          }
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        },
      };
    } catch (err: unknown) {
      // NoSuchKey → 返回 null
      if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "NoSuchKey") {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async list(prefix: string, limit = 50): Promise<StorageListItem[]> {
    const response = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: limit,
    }));

    return (response.Contents || []).map((obj) => ({
      key: obj.Key || "",
      size: obj.Size || 0,
      uploaded: (obj.LastModified || new Date()).toISOString(),
    }));
  }
}
