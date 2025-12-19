import {
  GitHubApi,
  PullRequestStatus,
  RepoReference,
} from "../../github-api/api";
import { nonEmptyItems } from "../../helpers";
import {
  Comment,
  Commit,
  PullRequest,
  Review,
  ReviewState,
} from "../../storage/loaded-state";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Refreshes the list of pull requests for a list of repositories.
 *
 * This optimizes for the minimum number of API requests to GitHub as
 * brute-forcing would quickly go over API rate limits if the user has several
 * hundred repositories or many pull requests opened.
 */
export async function refreshOpenPullRequests(
  githubApi: GitHubApi,
  userLogin: string
): Promise<PullRequest[]> {
  // Note: each query should specifically exclude the previous ones so we don't end up having
  // to deduplicate PRs across lists.
  const reviewRequestedPullRequests = await githubApi.searchPullRequestsGraphql(
    `review-requested:${userLogin} -author:${userLogin} is:open archived:false`
  );
  const commentedPullRequests = await githubApi.searchPullRequestsGraphql(
    `commenter:${userLogin} -author:${userLogin} -review-requested:${userLogin} is:open archived:false`
  );
  const ownPullRequests = await githubApi.searchPullRequestsGraphql(
    `author:${userLogin} is:open archived:false`
  );

  const reviewRequestedIds = new Set(reviewRequestedPullRequests.map((p) => p.id));
  const allIds = nonEmptyItems([
    ...reviewRequestedPullRequests.map((p) => p.id),
    ...commentedPullRequests.map((p) => p.id),
    ...ownPullRequests.map((p) => p.id),
  ]);

  // Preserve first-seen order for stable sorting before downstream timestamp sort.
  const uniqueIds: string[] = [];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    uniqueIds.push(id);
  }

  // MEMO: when chunk size is 100, 502 error occurred.
  const chunks = chunk(uniqueIds, 50);
  const bulk = [];
  for (const ids of chunks) {
    const part = await githubApi.loadPullRequestsBulk(ids);
    bulk.push(...part);
  }

  // Convert to existing storage model.
  return bulk.map((pr) => pullRequestFromBulk(pr, reviewRequestedIds.has(pr.id)));
}

function pullRequestFromBulk(
  pr: {
    id: string;
    url: string;
    title: string;
    updatedAt: string;
    number: number;
    isDraft: boolean;
    mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
    additions: number;
    deletions: number;
    changedFiles: number;
    author: { login: string; avatarUrl: string } | null;
    repository: { name: string; owner: { login: string } };
    requestedReviewers: string[];
    requestedTeams: string[];
    reviews: Array<{ authorLogin: string; state: ReviewState; submittedAt?: string }>;
    comments: Array<{ authorLogin: string; createdAt: string }>;
    lastCommit?: { createdAt?: string; checkStatus?: PullRequestStatus["checkStatus"] };
    reviewDecision: PullRequestStatus["reviewDecision"];
  },
  reviewRequested: boolean
): PullRequest {
  const repo: RepoReference = {
    owner: pr.repository.owner.login,
    name: pr.repository.name,
  };

  const reviews: Review[] = pr.reviews.map((r) => ({
    authorLogin: r.authorLogin,
    state: r.state,
    submittedAt: r.submittedAt,
  }));

  const comments: Comment[] = pr.comments.map((c) => ({
    authorLogin: c.authorLogin,
    createdAt: c.createdAt,
  }));

  const commits: Commit[] = pr.lastCommit?.createdAt
    ? [
        {
          authorLogin: "",
          createdAt: pr.lastCommit.createdAt,
        },
      ]
    : [];

  return {
    nodeId: pr.id,
    htmlUrl: pr.url,
    repoOwner: repo.owner,
    repoName: repo.name,
    pullRequestNumber: pr.number,
    updatedAt: pr.updatedAt,
    author: pr.author,
    changeSummary: {
      changedFiles: pr.changedFiles,
      additions: pr.additions,
      deletions: pr.deletions,
    },
    title: pr.title,
    draft: pr.isDraft,
    mergeable: pr.mergeable === "MERGEABLE",
    reviewRequested,
    requestedReviewers: nonEmptyItems(pr.requestedReviewers),
    requestedTeams: nonEmptyItems(pr.requestedTeams),
    reviews,
    comments,
    commits,
    reviewDecision: pr.reviewDecision,
    checkStatus: pr.lastCommit?.checkStatus,
  };
}
