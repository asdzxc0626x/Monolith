/* ──────────────────────────────────────────────
   R2 适配器 — Cloudflare R2 对象存储实现
   ────────────────────────────────────────────── */

import type { IObjectStorage, StorageObject, StorageListItem } from "../interfaces";

export class R2Adapter implements IObjectStorage {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async put(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    options?: { contentType?: string; customMetadata?: Record<string, string> }
  ): Promise<void> {
    await this.bucket.put(key, data, {
      httpMetadata: options?.contentType
        ? { contentType: options.contentType }
        : undefined,
      customMetadata: options?.customMetadata,
    });
  }

  async get(key: string): Promise<StorageObject | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;

    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
      writeHeaders(headers: Headers) {
        object.writeHttpMetadata(headers);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      },
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async list(prefix: string, limit = 50): Promise<StorageListItem[]> {
    const listed = await this.bucket.list({ prefix, limit });
    return listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));
  }
}
