import { buildTestingEnvironment } from "../environment/testing/fake";
import { NOTHING_MUTED } from "../storage/mute-configuration";
import { fakePullRequest } from "../testing/fake-pr";
import { filterPullRequests } from "./filters";
import {
  DEFAULT_STATUS_FILTER,
  filterPullRequestsByStatus,
} from "./status-filter";

describe("filterPullRequestsByStatus", () => {
  it("keeps open and draft pull requests by default", () => {
    const filtered = filterPullRequestsByStatus(
      buildFilteredPullRequests(),
      DEFAULT_STATUS_FILTER
    );

    expect(filtered.incoming).toHaveLength(2);
    expect(filtered.mine).toHaveLength(2);
  });

  it("only returns drafts when the draft filter is enabled", () => {
    const filtered = filterPullRequestsByStatus(
      buildFilteredPullRequests(),
      { open: false, draft: true }
    );

    expect(filtered.incoming.map((pr) => pr.draft)).toEqual([true]);
    expect(filtered.mine.map((pr) => pr.draft)).toEqual([true]);
  });

  it("only returns open pull requests when the open filter is enabled", () => {
    const filtered = filterPullRequestsByStatus(
      buildFilteredPullRequests(),
      { open: true, draft: false }
    );

    expect(filtered.incoming.map((pr) => pr.draft)).toEqual([false]);
    expect(filtered.mine.map((pr) => pr.draft)).toEqual([false]);
  });
});

function buildFilteredPullRequests() {
  const env = buildTestingEnvironment();
  const pullRequests = [
    fakePullRequest().reviewRequested(["fwouts"]).build(),
    fakePullRequest().reviewRequested(["fwouts"]).draft().build(),
    fakePullRequest().author("fwouts").build(),
    fakePullRequest().author("fwouts").draft().build(),
  ];

  return filterPullRequests(env, "fwouts", pullRequests, {
    ...NOTHING_MUTED,
    onlyDirectRequests: false,
    whitelistedTeams: [],
  });
}
