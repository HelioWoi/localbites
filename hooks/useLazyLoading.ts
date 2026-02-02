import { useEffect, useCallback, RefObject } from 'react';

interface UseLazyLoadingProps {
  feedRef: RefObject<HTMLDivElement>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  onLoadMore: () => void;
}

export function useLazyLoading({
  feedRef,
  isLoading,
  isLoadingMore,
  hasMorePages,
  onLoadMore,
}: UseLazyLoadingProps) {
  const handleScroll = useCallback(() => {
    if (!feedRef.current || isLoading || isLoadingMore || !hasMorePages) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // When user scrolls to 90% of the feed, load more
    if (scrollPercentage > 0.9) {
      console.log('[LazyLoading] 🔄 Triggering load more at', Math.round(scrollPercentage * 100), '%');
      onLoadMore();
    }
  }, [feedRef, isLoading, isLoadingMore, hasMorePages, onLoadMore]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    feed.addEventListener('scroll', handleScroll);
    return () => feed.removeEventListener('scroll', handleScroll);
  }, [feedRef, handleScroll]);
}
