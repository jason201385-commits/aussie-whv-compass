ALTER TABLE news_items
ADD COLUMN topics_json TEXT NOT NULL DEFAULT '[]';
