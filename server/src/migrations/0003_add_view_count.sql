-- 0003: 为 posts 表添加 view_count 字段（阅读统计功能）
-- 注意：SQLite 的 ALTER TABLE ADD COLUMN 不支持 IF NOT EXISTS
-- 如果字段已存在会报错，但不影响数据

ALTER TABLE posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
