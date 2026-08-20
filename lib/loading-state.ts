export type FetchPresentation = "skeleton" | "content" | "content-refreshing";

export function getFetchPresentation({
  isInitialLoading,
  isRefreshing,
  hasData,
}: {
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasData: boolean;
}): FetchPresentation {
  if (isInitialLoading && !hasData) return "skeleton";
  if (isRefreshing && hasData) return "content-refreshing";
  return "content";
}
