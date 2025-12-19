import { throttling } from "@octokit/plugin-throttling";
import { Octokit } from "@octokit/rest";
import {
  BulkPullRequestData,
  CheckStatus,
  GitHubApi,
  PullRequestSearchHit,
  ReviewDecision,
  ReviewState,
} from "./api";
import { GraphQLClient, gql } from "graphql-request";

const ThrottledOctokit = Octokit.plugin(throttling);
const graphQLEndpoint = "https://api.github.com/graphql";

interface ThrottlingOptions {
  method: string;
  url: string;
}

interface PullRequestStatusQueryVariables {
  owner: string;
  name: string;
  pullNumber: number;
}

interface PullRequestStatusQueryResult {
  rateLimit?: {
    cost?: number;
    remaining?: number;
  };
  repository: {
    pullRequest: {
      reviewDecision: ReviewDecision;
      commits: {
        nodes?: Array<{
          commit: {
            statusCheckRollup?: {
              state?: CheckStatus;
            };
          };
        }>;
      };
    };
  };
}

interface SearchPullRequestsQueryResult {
  rateLimit?: {
    cost?: number;
    remaining?: number;
  };
  search: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes?: Array<
      | {
          __typename?: string;
          id?: string;
        }
      | null
    >;
  };
}

interface SearchPullRequestsQueryVariables {
  query: string;
  cursor?: string | null;
}

interface LoadPullRequestsBulkQueryResult {
  rateLimit?: {
    cost?: number;
    remaining?: number;
  };
  nodes?: Array<
    | ({
        __typename?: "PullRequest";
      } & {
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
        reviewDecision: ReviewDecision;
        reviewRequests: {
          nodes?: Array<
            | {
                requestedReviewer?:
                  | { __typename?: "User"; login: string }
                  | { __typename?: "Team"; name: string }
                  | null;
              }
            | null
          >;
        };
        reviews: {
          nodes?: Array<
            | {
                author?: { login: string } | null;
                state: ReviewState;
                submittedAt?: string | null;
              }
            | null
          >;
        };
        comments: {
          nodes?: Array<
            | {
                author?: { login: string } | null;
                createdAt: string;
              }
            | null
          >;
        };
        commits: {
          nodes?: Array<
            | {
                commit: {
                  committedDate?: string | null;
                  statusCheckRollup?: {
                    state?: CheckStatus | null;
                  } | null;
                };
              }
            | null
          >;
        };
      })
    | null
  >;
}

interface LoadPullRequestsBulkQueryVariables {
  ids: string[];
}

export function buildGitHubApi(token: string): GitHubApi {
  const octokit: Octokit = new ThrottledOctokit({
    auth: `token ${token}`,
    // https://developer.github.com/v3/pulls/#list-pull-requests
    // Enable Draft Pull Request API.
    previews: ["shadow-cat"],
    throttle: {
      onRateLimit: (retryAfter: number, options: ThrottlingOptions, _: Octokit, retryCount: number) => {
        console.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );
        // Only retry twice.
        if (retryCount < 2) {
          console.log(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
        return false;
      },
      onSecondaryRateLimit: (retryAfter: number, options: ThrottlingOptions, _: Octokit, retryCount: number) => {
        console.warn(
          `Secondary Rate Limit detected for request ${options.method} ${options.url}`
        );
        // Only retry twice.
        if (retryCount < 2) {
          console.log(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
        return false;
      },
    },
  });

  octokit.hook.after("request", (response, options) => {
    const rateLimitRemaining = response.headers?.["x-ratelimit-remaining"];
    const rateLimitLimit = response.headers?.["x-ratelimit-limit"];
    const rateLimitResource = response.headers?.["x-ratelimit-resource"];
    console.debug(
      `[REST] ${options.method} ${options.url} -> remaining ${
        rateLimitRemaining ?? "unknown"
      }/${rateLimitLimit ?? "?"} (${rateLimitResource ?? "unknown"} resource)`
    );
  });

  const graphQLClient = new GraphQLClient(graphQLEndpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    fetch: globalThis.fetch,
  });

  return {
    async loadAuthenticatedUser() {
      const response = await octokit.users.getAuthenticated({});
      return response.data;
    },
    searchPullRequests(query) {
      return octokit.paginate(
        octokit.search.issuesAndPullRequests.endpoint.merge({
          q: `is:pr ${query}`,
        })
      );
    },
    async loadPullRequestDetails(pr) {
      const response = await octokit.pulls.get({
        owner: pr.repo.owner,
        repo: pr.repo.name,
        pull_number: pr.number,
      });
      return response.data;
    },
    loadReviews(pr) {
      return octokit.paginate(
        octokit.pulls.listReviews.endpoint.merge({
          owner: pr.repo.owner,
          repo: pr.repo.name,
          pull_number: pr.number,
        })
      );
    },
    loadComments(pr) {
      return octokit.paginate(
        octokit.issues.listComments.endpoint.merge({
          owner: pr.repo.owner,
          repo: pr.repo.name,
          issue_number: pr.number,
        })
      );
    },
    loadCommits(pr) {
      return octokit.paginate(
        octokit.pulls.listCommits.endpoint.merge({
          owner: pr.repo.owner,
          repo: pr.repo.name,
          pull_number: pr.number,
        })
      );
    },
    loadPullRequestStatus(pr) {
      const query = gql`
        query PullRequestStatus(
          $owner: String!
          $name: String!
          $pullNumber: Int!
        ) {
          rateLimit {
            cost
            remaining
          }
          repository(owner: $owner, name: $name) {
            pullRequest(number: $pullNumber) {
              reviewDecision
              commits(last: 1) {
                nodes {
                  commit {
                    statusCheckRollup {
                      state
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables: PullRequestStatusQueryVariables = {
        owner: pr.repo.owner,
        name: pr.repo.name,
        pullNumber: pr.number,
      };

      return graphQLClient
        .rawRequest<PullRequestStatusQueryResult, PullRequestStatusQueryVariables>(
          query,
          variables
        )
        .then(({ data }) => {
          const rateLimitInfo = data.rateLimit;
          console.debug(
            `[GraphQL] loadPullRequestStatus owner=${variables.owner} repo=${variables.name} pr=${variables.pullNumber} -> remaining ${
              rateLimitInfo?.remaining ?? "unknown"
            } cost ${rateLimitInfo?.cost ?? "unknown"}`
          );

          const result = data.repository.pullRequest;
          const reviewDecision = result.reviewDecision;
          const checkStatus =
            result.commits.nodes?.[0]?.commit.statusCheckRollup?.state;
          return {
            reviewDecision,
            checkStatus,
          };
        });
    },

    async searchPullRequestsGraphql(query) {
      const gqlQuery = gql`
        query SearchPullRequests($query: String!, $cursor: String) {
          rateLimit {
            cost
            remaining
          }
          search(query: $query, type: ISSUE, first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              __typename
              ... on PullRequest {
                id
              }
            }
          }
        }
      `;

      const hits: PullRequestSearchHit[] = [];
      let cursor: string | null = null;
      // Keep compatibility with previous REST search implementation which always prepended "is:pr".
      const fullQuery = `is:pr ${query}`;

      for (;;) {
        const variables: SearchPullRequestsQueryVariables = {
          query: fullQuery,
          cursor,
        };
        const { data } = await graphQLClient.rawRequest<
          SearchPullRequestsQueryResult,
          SearchPullRequestsQueryVariables
        >(gqlQuery, variables);

        const rateLimitInfo = data.rateLimit;
        console.debug(
          `[GraphQL] searchPullRequestsGraphql -> remaining ${
            rateLimitInfo?.remaining ?? "unknown"
          } cost ${rateLimitInfo?.cost ?? "unknown"}`
        );

        for (const node of data.search.nodes || []) {
          if (!node || node.__typename !== "PullRequest" || !node.id) {
            continue;
          }
          hits.push({ id: node.id });
        }

        if (!data.search.pageInfo.hasNextPage) {
          break;
        }
        cursor = data.search.pageInfo.endCursor;
      }

      return hits;
    },

    async loadPullRequestsBulk(ids) {
      if (ids.length === 0) {
        return [];
      }

      const gqlQuery = gql`
        query LoadPullRequestsBulk($ids: [ID!]!) {
          rateLimit {
            cost
            remaining
          }
          nodes(ids: $ids) {
            __typename
            ... on PullRequest {
              id
              url
              title
              updatedAt
              number
              isDraft
              mergeable
              additions
              deletions
              changedFiles
              author {
                login
                avatarUrl
              }
              repository {
                name
                owner {
                  login
                }
              }
              reviewDecision
              reviewRequests(first: 100) {
                nodes {
                  requestedReviewer {
                    __typename
                    ... on User {
                      login
                    }
                    ... on Team {
                      name
                    }
                  }
                }
              }
              reviews(last: 100) {
                nodes {
                  author {
                    login
                  }
                  state
                  submittedAt
                }
              }
              comments(last: 100) {
                nodes {
                  author {
                    login
                  }
                  createdAt
                }
              }
              commits(last: 1) {
                nodes {
                  commit {
                    committedDate
                    statusCheckRollup {
                      state
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables: LoadPullRequestsBulkQueryVariables = { ids };
      const { data } = await graphQLClient.rawRequest<
        LoadPullRequestsBulkQueryResult,
        LoadPullRequestsBulkQueryVariables
      >(gqlQuery, variables);

      const rateLimitInfo = data.rateLimit;
      console.debug(
        `[GraphQL] loadPullRequestsBulk count=${ids.length} -> remaining ${
          rateLimitInfo?.remaining ?? "unknown"
        } cost ${rateLimitInfo?.cost ?? "unknown"}`
      );

      const out: BulkPullRequestData[] = [];
      for (const node of data.nodes || []) {
        if (!node || node.__typename !== "PullRequest") {
          continue;
        }

        const requestedReviewers: string[] = [];
        const requestedTeams: string[] = [];
        for (const rr of node.reviewRequests.nodes || []) {
          const reviewer = rr?.requestedReviewer;
          if (!reviewer) {
            continue;
          }
          if (reviewer.__typename === "User") {
            requestedReviewers.push(reviewer.login);
          } else if (reviewer.__typename === "Team") {
            requestedTeams.push(reviewer.name);
          }
        }

        const reviews =
          node.reviews.nodes
            ?.filter((r): r is NonNullable<typeof r> => !!r)
            .map((r) => ({
              authorLogin: r.author?.login ?? "",
              state: r.state,
              submittedAt: r.submittedAt ?? undefined,
            })) ?? [];

        const comments =
          node.comments.nodes
            ?.filter((c): c is NonNullable<typeof c> => !!c)
            .map((c) => ({
              authorLogin: c.author?.login ?? "",
              createdAt: c.createdAt,
            })) ?? [];

        const lastCommitNode = node.commits.nodes?.find((c) => !!c) ?? null;
        const lastCommitCreatedAt =
          lastCommitNode?.commit.committedDate ?? undefined;
        const lastCommitCheckStatus =
          lastCommitNode?.commit.statusCheckRollup?.state ?? undefined;

        out.push({
          id: node.id,
          url: node.url,
          title: node.title,
          updatedAt: node.updatedAt,
          number: node.number,
          isDraft: node.isDraft,
          mergeable: node.mergeable,
          additions: node.additions,
          deletions: node.deletions,
          changedFiles: node.changedFiles,
          author: node.author
            ? { login: node.author.login, avatarUrl: node.author.avatarUrl }
            : null,
          repository: {
            name: node.repository.name,
            owner: { login: node.repository.owner.login },
          },
          requestedReviewers,
          requestedTeams,
          reviews,
          comments,
          lastCommit: {
            createdAt: lastCommitCreatedAt,
            checkStatus: lastCommitCheckStatus,
          },
          reviewDecision: node.reviewDecision,
        });
      }

      return out;
    },
  };
}
