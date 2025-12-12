import { throttling } from "@octokit/plugin-throttling";
import { Octokit } from "@octokit/rest";
import { CheckStatus, GitHubApi, ReviewDecision } from "./api";
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
  };
}
