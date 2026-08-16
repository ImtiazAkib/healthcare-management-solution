/**
 * List result information.
 */
export type ListResultInfo = {
  /**
   * Count of items for skip and take values.
   */
  count: number;
  /**
   * Number of skipped items.
   */
  skip: number;
  /**
   * Number of taken items.
   */
  take: number;
  /**
   * Total count of items.
   */
  totalCount: number;
};
