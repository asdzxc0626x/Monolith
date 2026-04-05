/* ──────────────────────────────────────────────
   PostgreSQL 适配器
   通过 postgres.js + Drizzle ORM 操作
   支持：Neon / Supabase / 自建 PG / 任何 PostgreSQL
   ────────────────────────────────────────────── */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, sql } from "drizzle-orm";
import { pgPosts, pgTags, pgPostTags, pgPages, pgSettings } from "../../db/schema-pg";
import type {
  IDatabase, Post, PostSummary, Tag, Page, PageSummary,
  CreatePostInput, UpdatePostInput, UpsertPageInput,
  BackupData, ImportResult,
} from "../interfaces";

type DrizzlePG = ReturnType<typeof drizzle>;

export class PostgresAdapter implements IDatabase {
  private db: DrizzlePG;
  private client: ReturnType<typeof postgres>;

  constructor(connectionString: string) {
    // postgres.js 自动支持连接池
    this.client = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    this.db = drizzle(this.client);
  }

  /* ── 自动建表 ─────────────────── */

  async ensureCoreTables(): Promise<void> {
    await this.client`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        excerpt TEXT DEFAULT '',
        cover_color TEXT DEFAULT 'from-gray-500/20 to-gray-600/20',
        published BOOLEAN NOT NULL DEFAULT true,
        listed BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.client`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `;
    await this.client`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `;
    await this.client`
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        published BOOLEAN NOT NULL DEFAULT true,
        show_in_nav BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.client`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;
  }

  /* ── 内部辅助 ─────────────────── */

  private async getPostTags(postId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: pgTags.name })
      .from(pgPostTags)
      .innerJoin(pgTags, eq(pgPostTags.tagId, pgTags.id))
      .where(eq(pgPostTags.postId, postId));
    return rows.map((r) => r.name);
  }

  private async syncPostTags(postId: number, tagNames: string[]): Promise<void> {
    await this.db.delete(pgPostTags).where(eq(pgPostTags.postId, postId));
    for (const tagName of tagNames) {
      await this.db.insert(pgTags).values({ name: tagName }).onConflictDoNothing();
      const [tag] = await this.db
        .select()
        .from(pgTags)
        .where(eq(pgTags.name, tagName))
        .limit(1);
      if (tag) {
        await this.db
          .insert(pgPostTags)
          .values({ postId, tagId: tag.id })
          .onConflictDoNothing();
      }
    }
  }

  /** 将 PG timestamp 转为 ISO 字符串 */
  private ts(d: Date | string | null): string {
    if (!d) return new Date().toISOString();
    return d instanceof Date ? d.toISOString() : d;
  }

  /* ── 文章 ─────────────────────── */

  async getPublishedPosts(): Promise<PostSummary[]> {
    const allPosts = await this.db
      .select({
        id: pgPosts.id,
        slug: pgPosts.slug,
        title: pgPosts.title,
        excerpt: pgPosts.excerpt,
        coverColor: pgPosts.coverColor,
        createdAt: pgPosts.createdAt,
      })
      .from(pgPosts)
      .where(eq(pgPosts.published, true))
      .orderBy(desc(pgPosts.createdAt));

    return Promise.all(
      allPosts.map(async (post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt || "",
        coverColor: post.coverColor || "",
        createdAt: this.ts(post.createdAt),
        tags: await this.getPostTags(post.id),
      }))
    );
  }

  async getAllPosts(): Promise<(Post & { tags: string[] })[]> {
    const allPosts = await this.db
      .select()
      .from(pgPosts)
      .orderBy(desc(pgPosts.createdAt));

    return Promise.all(
      allPosts.map(async (post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || "",
        coverColor: post.coverColor || "",
        published: post.published,
        listed: post.listed,
        createdAt: this.ts(post.createdAt),
        updatedAt: this.ts(post.updatedAt),
        tags: await this.getPostTags(post.id),
      }))
    );
  }

  async getPostBySlug(slug: string): Promise<(Post & { tags: string[] }) | null> {
    const [post] = await this.db
      .select()
      .from(pgPosts)
      .where(eq(pgPosts.slug, slug))
      .limit(1);

    if (!post) return null;

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      coverColor: post.coverColor || "",
      published: post.published,
      listed: post.listed,
      createdAt: this.ts(post.createdAt),
      updatedAt: this.ts(post.updatedAt),
      tags: await this.getPostTags(post.id),
    };
  }

  async createPost(data: CreatePostInput): Promise<Post> {
    const [newPost] = await this.db
      .insert(pgPosts)
      .values({
        slug: data.slug,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || "",
        coverColor: data.coverColor || "from-gray-500/20 to-gray-600/20",
        published: data.published ?? true,
        listed: data.listed ?? true,
      })
      .returning();

    if (data.tags?.length) {
      await this.syncPostTags(newPost.id, data.tags);
    }

    return {
      id: newPost.id,
      slug: newPost.slug,
      title: newPost.title,
      content: newPost.content,
      excerpt: newPost.excerpt || "",
      coverColor: newPost.coverColor || "",
      published: newPost.published,
      listed: newPost.listed,
      createdAt: this.ts(newPost.createdAt),
      updatedAt: this.ts(newPost.updatedAt),
    };
  }

  async updatePost(slug: string, data: UpdatePostInput): Promise<Post | null> {
    const [existing] = await this.db
      .select()
      .from(pgPosts)
      .where(eq(pgPosts.slug, slug))
      .limit(1);

    if (!existing) return null;

    const [updated] = await this.db
      .update(pgPosts)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.coverColor !== undefined && { coverColor: data.coverColor }),
        ...(data.published !== undefined && { published: data.published }),
        ...(data.listed !== undefined && { listed: data.listed }),
        updatedAt: sql`NOW()`,
      })
      .where(eq(pgPosts.id, existing.id))
      .returning();

    if (data.tags !== undefined) {
      await this.syncPostTags(existing.id, data.tags);
    }

    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      content: updated.content,
      excerpt: updated.excerpt || "",
      coverColor: updated.coverColor || "",
      published: updated.published,
      listed: updated.listed,
      createdAt: this.ts(updated.createdAt),
      updatedAt: this.ts(updated.updatedAt),
    };
  }

  async deletePost(slug: string): Promise<boolean> {
    const result = await this.db.delete(pgPosts).where(eq(pgPosts.slug, slug)).returning();
    return result.length > 0;
  }

  /* ── 标签 ─────────────────────── */

  async getAllTags(): Promise<Tag[]> {
    return this.db.select().from(pgTags).orderBy(pgTags.name);
  }

  /* ── 独立页 ───────────────────── */

  async getPublishedPages(): Promise<PageSummary[]> {
    return this.db
      .select({
        slug: pgPages.slug,
        title: pgPages.title,
        showInNav: pgPages.showInNav,
        sortOrder: pgPages.sortOrder,
      })
      .from(pgPages)
      .where(eq(pgPages.published, true))
      .orderBy(pgPages.sortOrder);
  }

  async getAllPages(): Promise<Page[]> {
    const rows = await this.db.select().from(pgPages).orderBy(pgPages.sortOrder);
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content,
      sortOrder: p.sortOrder,
      published: p.published,
      showInNav: p.showInNav,
      createdAt: this.ts(p.createdAt),
      updatedAt: this.ts(p.updatedAt),
    }));
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    const [page] = await this.db.select().from(pgPages).where(eq(pgPages.slug, slug));
    if (!page) return null;
    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      sortOrder: page.sortOrder,
      published: page.published,
      showInNav: page.showInNav,
      createdAt: this.ts(page.createdAt),
      updatedAt: this.ts(page.updatedAt),
    };
  }

  async getPublishedPageBySlug(slug: string): Promise<Page | null> {
    const page = await this.getPageBySlug(slug);
    if (!page || !page.published) return null;
    return page;
  }

  async upsertPage(data: UpsertPageInput): Promise<{ action: "created" | "updated" }> {
    const existing = await this.db
      .select({ id: pgPages.id })
      .from(pgPages)
      .where(eq(pgPages.slug, data.slug));

    if (existing.length > 0) {
      await this.db.update(pgPages).set({
        title: data.title,
        content: data.content,
        sortOrder: data.sortOrder ?? 0,
        published: data.published ?? true,
        showInNav: data.showInNav ?? false,
        updatedAt: sql`NOW()`,
      }).where(eq(pgPages.slug, data.slug));
      return { action: "updated" };
    } else {
      await this.db.insert(pgPages).values({
        slug: data.slug,
        title: data.title,
        content: data.content,
        sortOrder: data.sortOrder ?? 0,
        published: data.published ?? true,
        showInNav: data.showInNav ?? false,
      });
      return { action: "created" };
    }
  }

  async deletePage(slug: string): Promise<boolean> {
    const result = await this.db.delete(pgPages).where(eq(pgPages.slug, slug)).returning();
    return result.length > 0;
  }

  /* ── 设置 ─────────────────────── */

  async getSettings(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(pgSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(pgSettings)
      .where(eq(pgSettings.key, key))
      .limit(1);
    return row?.value ?? null;
  }

  async saveSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.db
        .insert(pgSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: pgSettings.key,
          set: { value },
        });
    }
  }

  /* ── 备份与恢复 ───────────────── */

  async exportAll(): Promise<BackupData> {
    const allPosts = await this.db.select().from(pgPosts).orderBy(desc(pgPosts.createdAt));
    const allTags = await this.db.select().from(pgTags);
    const allPostTags = await this.db.select().from(pgPostTags);
    const settings = await this.getSettings();

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      posts: allPosts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: p.content,
        excerpt: p.excerpt || "",
        coverColor: p.coverColor || "",
        published: p.published,
        listed: p.listed,
        createdAt: this.ts(p.createdAt),
        updatedAt: this.ts(p.updatedAt),
      })),
      tags: allTags,
      postTags: allPostTags,
      settings,
      meta: {
        postCount: allPosts.length,
        tagCount: allTags.length,
      },
    };
  }

  async importAll(data: {
    posts?: CreatePostInput[];
    tags?: { name: string }[];
    settings?: Record<string, string>;
    mode?: "merge" | "overwrite";
  }): Promise<ImportResult> {
    const mode = data.mode || "merge";
    const imported: ImportResult = { posts: 0, tags: 0, settings: 0 };

    if (data.tags?.length) {
      for (const tag of data.tags) {
        try {
          await this.db.insert(pgTags).values({ name: tag.name }).onConflictDoNothing();
          imported.tags++;
        } catch { /* 已存在 */ }
      }
    }

    if (data.posts?.length) {
      for (const post of data.posts) {
        const existing = await this.db
          .select({ id: pgPosts.id })
          .from(pgPosts)
          .where(eq(pgPosts.slug, post.slug));

        if (existing.length > 0) {
          if (mode === "overwrite") {
            await this.db.update(pgPosts).set({
              title: post.title,
              content: post.content,
              excerpt: post.excerpt || "",
              coverColor: post.coverColor || "",
              published: post.published ?? true,
              updatedAt: sql`NOW()`,
            }).where(eq(pgPosts.slug, post.slug));
            imported.posts++;
          }
        } else {
          await this.db.insert(pgPosts).values({
            slug: post.slug,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || "",
            coverColor: post.coverColor || "",
            published: post.published ?? true,
          });
          imported.posts++;
        }
      }
    }

    if (data.settings && Object.keys(data.settings).length > 0) {
      await this.saveSettings(data.settings);
      imported.settings = Object.keys(data.settings).length;
    }

    return imported;
  }

  /* ── 搜索 ─────────────────────── */

  async searchPosts(query: string, limit = 20): Promise<PostSummary[]> {
    const pattern = `%${query}%`;
    const rows = await this.db
      .select({
        id: pgPosts.id,
        slug: pgPosts.slug,
        title: pgPosts.title,
        excerpt: pgPosts.excerpt,
        coverColor: pgPosts.coverColor,
        createdAt: pgPosts.createdAt,
      })
      .from(pgPosts)
      .where(
        sql`${pgPosts.published} = true AND (${pgPosts.title} ILIKE ${pattern} OR ${pgPosts.content} ILIKE ${pattern} OR ${pgPosts.excerpt} ILIKE ${pattern})`
      )
      .orderBy(desc(pgPosts.createdAt))
      .limit(limit);

    return Promise.all(
      rows.map(async (post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt || "",
        coverColor: post.coverColor || "",
        createdAt: this.ts(post.createdAt),
        tags: await this.getPostTags(post.id),
      }))
    );
  }

  /* ── RSS 专用 ─────────────────── */

  async getRecentPublishedPosts(limit: number) {
    const rows = await this.db
      .select({
        slug: pgPosts.slug,
        title: pgPosts.title,
        excerpt: pgPosts.excerpt,
        content: pgPosts.content,
        createdAt: pgPosts.createdAt,
      })
      .from(pgPosts)
      .where(eq(pgPosts.published, true))
      .orderBy(desc(pgPosts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r,
      excerpt: r.excerpt || "",
      createdAt: this.ts(r.createdAt),
    }));
  }
}
