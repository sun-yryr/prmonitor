import { GitHubApi } from "../../github-api/api";
import { mocked } from "../../testing/mocked";
import { refreshOpenPullRequests } from "./pull-requests";

describe("refreshOpenPullRequests", () => {
  it("returns an empty list when there are no PRs", async () => {
    const githubApi = mockGitHubApi();
    mocked(githubApi.searchPullRequestsGraphql).mockReturnValue(
      Promise.resolve([])
    );
    const result = await refreshOpenPullRequests(githubApi, "author");
    expect(result).toHaveLength(0);
  });

  it("loads pull requests from all three queries", async () => {
    const githubApi = mockGitHubApi();
    mocked(githubApi.searchPullRequestsGraphql).mockImplementation(
      async (query) => {
        if (query.startsWith("author:")) {
          return [{ id: "authored" }];
        } else if (query.startsWith("commenter:")) {
          return [{ id: "commented" }];
        } else if (query.startsWith("review-requested:")) {
          return [{ id: "review-requested" }];
        } else {
          throw new Error(
            `Unknown query: "${query}". Do you need to fix the mock?`
          );
        }
      }
    );
    mocked(githubApi.loadPullRequestsBulk).mockImplementation(async (ids) => {
      return ids.map((id) => ({
        id,
        url: `http://${id}`,
        title: id,
        updatedAt: "16 May 2019",
        number: id === "authored" ? 1 : id === "commented" ? 2 : 3,
        isDraft: false,
        mergeable: "UNKNOWN",
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        author: { login: "someone", avatarUrl: "http://avatar" },
        repository: { name: "prmonitor", owner: { login: "zenclabs" } },
        requestedReviewers: [],
        requestedTeams: [],
        reviews: [],
        comments: [],
        lastCommit: { createdAt: "16 May 2019", checkStatus: undefined },
        reviewDecision: "REVIEW_REQUIRED",
      }));
    });
    const result = await refreshOpenPullRequests(githubApi, "fwouts");
    expect(result).toHaveLength(3);
    expect(mocked(githubApi.searchPullRequestsGraphql).mock.calls).toEqual([
      [`review-requested:fwouts -author:fwouts is:open archived:false`],
      [
        `commenter:fwouts -author:fwouts -review-requested:fwouts is:open archived:false`,
      ],
      [`author:fwouts is:open archived:false`],
    ]);

    // Ensure reviewRequested is set only for the review-requested query hit.
    const prById = new Map(result.map((pr) => [pr.nodeId, pr]));
    expect(prById.get("review-requested")?.reviewRequested).toBe(true);
    expect(prById.get("commented")?.reviewRequested).toBe(false);
    expect(prById.get("authored")?.reviewRequested).toBe(false);
  });
});

function mockGitHubApi(): GitHubApi {
  return {
    loadAuthenticatedUser: jest.fn(),
    searchPullRequests: jest.fn(),
    loadPullRequestDetails: jest.fn(),
    loadReviews: jest.fn(),
    loadComments: jest.fn(),
    loadCommits: jest.fn(),
    loadPullRequestStatus: jest.fn(),
    searchPullRequestsGraphql: jest.fn(),
    loadPullRequestsBulk: jest.fn(),
  };
}
