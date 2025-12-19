import { PaginationResults } from "@octokit/plugin-paginate-rest/dist-types/types";
import { Octokit } from "@octokit/rest";
import { GetResponseDataTypeFromEndpointMethod } from "@octokit/types";

/**
 * A simple wrapper around GitHub's API.
 */
export interface GitHubApi {
  /**
   * Returns the information about the current authenticated user.
   */
  loadAuthenticatedUser(): Promise<
    GetResponseDataTypeFromEndpointMethod<Octokit["users"]["getAuthenticated"]>
  >;

  /**
   * Returns the full list of pull requests matching a given query.
   */
  searchPullRequests(query: string): Promise<
    // Note: There might be a more efficient way to represent this type.
    PaginationResults<
      GetResponseDataTypeFromEndpointMethod<
        Octokit["search"]["issuesAndPullRequests"]
      >["items"][number]
    >
  >;

  /**
   * Returns the details of a pull request.
   */
  loadPullRequestDetails(
    pr: PullRequestReference
  ): Promise<GetResponseDataTypeFromEndpointMethod<Octokit["pulls"]["get"]>>;

  /**
   * Returns the full list of reviews for a pull request.
   */
  loadReviews(
    pr: PullRequestReference
  ): Promise<
    GetResponseDataTypeFromEndpointMethod<Octokit["pulls"]["listReviews"]>
  >;

  /**
   * Returns the full list of comments for a pull request.
   */
  loadComments(
    pr: PullRequestReference
  ): Promise<
    GetResponseDataTypeFromEndpointMethod<Octokit["issues"]["listComments"]>
  >;

  /**
   * Returns the full list of commits for a pull request.
   */
  loadCommits(
    pr: PullRequestReference
  ): Promise<
    GetResponseDataTypeFromEndpointMethod<Octokit["pulls"]["listCommits"]>
  >;

  /**
   * Returns the current status fields for a pull request.
   */
  loadPullRequestStatus(pr: PullRequestReference): Promise<PullRequestStatus>;

  /**
   * Search pull requests via GraphQL (avoids REST search rate limits).
   *
   * The query is expected to be the same format as the REST search query used by the app,
   * without the leading "is:pr" (it will be added internally for compatibility).
   */
  searchPullRequestsGraphql(
    query: string
  ): Promise<PullRequestSearchHit[]>;

  /**
   * Bulk-load pull requests via GraphQL nodes(ids: ...).
   *
   * The input must be a list of PullRequest node IDs.
   */
  loadPullRequestsBulk(ids: string[]): Promise<BulkPullRequestData[]>;
}

// Ref: https://docs.github.com/en/graphql/reference/enums#pullrequestreviewdecision
export type ReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED";

// Ref: https://docs.github.com/en/graphql/reference/enums#statusstate
export type CheckStatus =
  | "ERROR"
  | "EXPECTED"
  | "FAILURE"
  | "PENDING"
  | "SUCCESS";

export interface PullRequestStatus {
  reviewDecision: ReviewDecision;
  checkStatus?: CheckStatus;
}

export interface RepoReference {
  owner: string;
  name: string;
}

export interface PullRequestReference {
  repo: RepoReference;
  number: number;
}

export interface PullRequestSearchHit {
  /** GraphQL node ID. */
  id: string;
}

export interface BulkPullRequestData {
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
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  requestedReviewers: string[];
  requestedTeams: string[];
  reviews: Array<{
    authorLogin: string;
    state: ReviewState;
    submittedAt?: string;
  }>;
  comments: Array<{
    authorLogin: string;
    createdAt: string;
  }>;
  lastCommit?: {
    createdAt?: string;
    checkStatus?: CheckStatus;
  };
  reviewDecision: ReviewDecision;
}

export type ReviewState =
  | "PENDING"
  | "COMMENTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";
