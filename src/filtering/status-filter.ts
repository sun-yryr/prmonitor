import { EnrichedPullRequest } from "./enriched-pull-request";
import { FilteredPullRequests } from "./filters";

export type PullRequestStatus = "open" | "draft";

export interface PullRequestStatusFilter {
  open: boolean;
  draft: boolean;
}

export const DEFAULT_STATUS_FILTER: PullRequestStatusFilter = {
  open: true,
  draft: true,
};

export function filterPullRequestsByStatus(
  pullRequests: FilteredPullRequests,
  statusFilter: PullRequestStatusFilter
): FilteredPullRequests {
  const matchesStatus = (pullRequest: EnrichedPullRequest) =>
    pullRequest.draft ? statusFilter.draft : statusFilter.open;

  const filterBucket = (bucket: EnrichedPullRequest[]) =>
    bucket.filter(matchesStatus);

  return {
    incoming: filterBucket(pullRequests.incoming),
    muted: filterBucket(pullRequests.muted),
    reviewed: filterBucket(pullRequests.reviewed),
    mine: filterBucket(pullRequests.mine),
    ignored: filterBucket(pullRequests.ignored),
  };
}
