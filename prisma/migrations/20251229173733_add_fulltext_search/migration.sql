-- Add tsvector column for full-text search
ALTER TABLE "listings" ADD COLUMN "search_vector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX "listings_search_vector_idx" ON "listings" USING GIN("search_vector");

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.make, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.model, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector on INSERT or UPDATE
CREATE TRIGGER listings_search_vector_trigger
BEFORE INSERT OR UPDATE ON "listings"
FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- Update existing rows to populate search_vector
UPDATE "listings" SET
  search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(make, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(model, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B');
