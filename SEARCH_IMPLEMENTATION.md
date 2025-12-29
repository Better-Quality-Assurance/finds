# Full-Text Search Implementation

## Overview

Full-text search has been implemented for auctions using PostgreSQL's native tsvector capabilities. This provides fast, relevant search results without requiring external search services like Elasticsearch.

## Architecture

### Database Layer
- **Search Vector Column**: `listings.search_vector` (tsvector type)
- **GIN Index**: Fast full-text search queries using PostgreSQL's Generalized Inverted Index
- **Auto-Update Trigger**: Automatically updates the search vector when listings are created or modified
- **Weighted Fields**:
  - **A-weight** (highest): title, make, model
  - **B-weight**: description

### Service Layer
- **`auction.service.ts`**: Enhanced `getActiveAuctions()` function with optional `searchQuery` parameter
- **Raw SQL Queries**: Uses `$queryRawUnsafe` for full-text search with `ts_rank()` relevance scoring
- **Sanitization**: Removes special characters and uses AND operator for multi-word searches

### API Layer
- **Route**: `/api/auctions?q={search_query}`
- **Query Parameter**: `q` for search queries
- **Sort Option**: `relevance` (when searching, sorts by `ts_rank()`)

### UI Layer
- **Search Input**: Debounced (300ms) search input in auction filters
- **Real-time Updates**: URL parameters update as you type (after debounce)
- **Results Display**: Shows count and query when searching
- **Responsive**: Mobile-friendly search bar with clear button

## Migration

### Running the Migration

```bash
# Apply the migration to add search capabilities
npm run db:push

# Or use migrate if you want version control
npm run db:migrate
```

### Migration Details

The migration file is located at:
```
prisma/migrations/20251229173733_add_fulltext_search/migration.sql
```

It performs the following:
1. Adds `search_vector` tsvector column to `listings` table
2. Creates a GIN index on `search_vector`
3. Creates a trigger function `listings_search_vector_update()`
4. Creates a trigger to auto-update on INSERT/UPDATE
5. Populates existing rows with search vectors

## Usage Examples

### Frontend Search

Users can search from the auctions page:
```
/auctions?q=porsche 911
/auctions?q=ferrari&category=CLASSIC_CAR
/auctions?q=barn find&country=RO&sort=relevance
```

### API Queries

```typescript
// Search for "porsche 911"
GET /api/auctions?q=porsche%20911

// Search with filters
GET /api/auctions?q=ferrari&category=CLASSIC_CAR&sort=relevance

// Combine search with price filters
GET /api/auctions?q=mercedes&min_price=10000&max_price=50000
```

### Programmatic Usage

```typescript
import { getActiveAuctions } from '@/services/auction.service'

const results = await getActiveAuctions({
  searchQuery: 'porsche 911',
  category: 'CLASSIC_CAR',
  sortBy: 'relevance',
  page: 1,
  limit: 20,
})
```

## Search Features

### Query Processing
- **Sanitization**: Special characters are removed
- **Multi-word Search**: Uses AND operator (all words must match)
- **Stemming**: PostgreSQL's English dictionary handles word variations (e.g., "running" matches "run")

### Ranking
When searching, results are ranked by relevance using `ts_rank()`:
- Higher weight fields (title, make, model) rank higher
- Multiple word matches increase relevance
- Secondary sort by `current_end_time` for auctions ending soon

### Performance
- **GIN Index**: Sub-millisecond search performance even with thousands of listings
- **No External Services**: No dependency on Elasticsearch, Algolia, etc.
- **Native PostgreSQL**: Leverages database features for speed and reliability

## Customization

### Adjusting Search Weights

Edit the trigger function in the migration to change field weights:

```sql
-- A = highest weight, B = medium, C = low, D = lowest
NEW.search_vector :=
  setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(NEW.make, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(NEW.model, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
```

### Adding More Fields

To include additional fields in search (e.g., `vin`, `condition_notes`):

```sql
NEW.search_vector :=
  -- ... existing fields ...
  setweight(to_tsvector('english', coalesce(NEW.vin, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(NEW.condition_notes, '')), 'D');
```

### Language Support

Currently configured for English. To support Romanian:

```sql
-- Use Romanian dictionary
to_tsvector('romanian', coalesce(NEW.title, ''))
```

Or use simple (language-agnostic):

```sql
to_tsvector('simple', coalesce(NEW.title, ''))
```

## Monitoring

### Check Search Vector Status

```sql
-- View search vectors for all listings
SELECT id, title, search_vector FROM listings LIMIT 10;

-- Check if trigger is active
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'listings_search_vector_trigger';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'listings_search_vector_idx';
```

### Performance Monitoring

```sql
-- Explain a search query
EXPLAIN ANALYZE
SELECT * FROM listings
WHERE search_vector @@ to_tsquery('english', 'porsche & 911')
ORDER BY ts_rank(search_vector, to_tsquery('english', 'porsche & 911')) DESC;
```

## Troubleshooting

### Search Returns No Results

1. **Check search vector**: Ensure listings have populated search vectors
   ```sql
   SELECT COUNT(*) FROM listings WHERE search_vector IS NOT NULL;
   ```

2. **Test raw query**: Try a simple search directly in PostgreSQL
   ```sql
   SELECT title FROM listings
   WHERE search_vector @@ to_tsquery('english', 'porsche')
   LIMIT 5;
   ```

3. **Rebuild search vectors**: Re-populate all search vectors
   ```sql
   UPDATE listings SET
     search_vector = setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(make, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(model, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(description, '')), 'B');
   ```

### Slow Search Performance

1. **Verify index**: Ensure GIN index exists
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'listings';
   ```

2. **Analyze table**: Update statistics
   ```sql
   ANALYZE listings;
   ```

3. **Check index size**: Ensure index fits in memory
   ```sql
   SELECT pg_size_pretty(pg_relation_size('listings_search_vector_idx'));
   ```

## Future Enhancements

Possible improvements:
- **Search suggestions**: Autocomplete based on popular searches
- **Fuzzy matching**: Handle typos with trigram similarity
- **Search analytics**: Track popular search terms
- **Highlighted results**: Show matching text snippets
- **Advanced operators**: Support OR, NOT, phrase searches
- **Multi-language**: Romanian search dictionary support
- **Synonyms**: Handle "car" = "automobile", etc.

## References

- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL tsvector](https://www.postgresql.org/docs/current/datatype-textsearch.html)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
