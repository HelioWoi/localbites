-- Clear pizza text search cache to force fresh API calls
DELETE FROM api_cache WHERE cache_key LIKE 'text_search_pizza%';
