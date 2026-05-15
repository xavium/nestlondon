-- 0003_blog_posts.sql
-- Adds blog_posts table for the resources section.
--
-- Body is stored as markdown text (rendered via react-markdown on the public side).
-- Posts are draft-by-default and only render publicly when status='published' AND
-- published_at <= now() (allows scheduling for the future).
--
-- RLS:
-- - Anyone can SELECT posts where status='published' and published_at <= now().
-- - Admins (user_metadata->>'role' = 'admin') can SELECT/INSERT/UPDATE/DELETE everything.
--
-- Slug is unique — used in /blog/[slug] URLs. Generated client-side from title at
-- post-creation time; admin can override.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,                -- shown on /blog index cards. Plain text, no markdown.
  body TEXT NOT NULL,          -- markdown source
  hero_image_url TEXT,         -- optional, top of post + meta og:image
  author TEXT,                 -- free-text display name
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,    -- set when transitioning to published
  seo_title TEXT,              -- defaults to title if null
  seo_description TEXT,        -- defaults to excerpt if null
  tags TEXT[] DEFAULT '{}',    -- e.g. ['neighbourhood-guides', 'buying']
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON blog_posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- updated_at maintained by trigger
CREATE OR REPLACE FUNCTION blog_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_posts_set_updated_at();

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blog_posts_public_select ON blog_posts;
CREATE POLICY blog_posts_public_select ON blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

-- Admin policies (anyone with role=admin in their JWT metadata)
DROP POLICY IF EXISTS blog_posts_admin_all ON blog_posts;
CREATE POLICY blog_posts_admin_all ON blog_posts
  FOR ALL
  TO authenticated
  USING (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

COMMENT ON TABLE blog_posts IS 'Blog posts for /blog. RLS: public sees published, admins see all.';
