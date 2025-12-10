import styled from "@emotion/styled";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react-lite";
import React, { useMemo, useState } from "react";
import { Badge, Tab, Tabs } from "react-bootstrap";
import { Filter } from "../filtering/filters";
import {
  DEFAULT_STATUS_FILTER,
  filterPullRequestsByStatus,
  PullRequestStatus,
  PullRequestStatusFilter,
} from "../filtering/status-filter";
import { isRunningAsPopup } from "../popup-environment";
import { Core } from "../state/core";
import { PullRequest, ref } from "../storage/loaded-state";
import { MuteType } from "../storage/mute-configuration";
import { Link } from "./design/Link";
import { Row } from "./design/Row";
import { IgnoredRepositories } from "./IgnoredRepositories";
import { Loader } from "./Loader";
import { NewCommitsToggle } from "./NewCommitsToggle";
import { PullRequestList } from "./PullRequestList";
import { PullRequestStatusFilter as PullRequestStatusFilterComponent } from "./PullRequestStatusFilter";
import { Settings } from "./Settings";
import { Status } from "./Status";
import { WhitelistedTeams } from "./WhitelistedTeams";

export interface PopupProps {
  core: Core;
}

export interface PopupState {
  currentFilter: Filter;
  statusFilter: PullRequestStatusFilter;
}

export const Popup = observer((props: PopupProps) => {
  const [state, setState] = useState<PopupState>({
    currentFilter: Filter.INCOMING,
    statusFilter: { ...DEFAULT_STATUS_FILTER },
  });

  const filteredPullRequests = useMemo(
    () =>
      props.core.filteredPullRequests
        ? filterPullRequestsByStatus(
            props.core.filteredPullRequests,
            state.statusFilter
          )
        : null,
    [props.core.filteredPullRequests, state.statusFilter]
  );

  const onOpenAll = () => {
    const pullRequests = filteredPullRequests
      ? filteredPullRequests[state.currentFilter]
      : [];
    for (const pullRequest of pullRequests) {
      onOpen(pullRequest.htmlUrl);
    }
  };

  const onOpen = (pullRequestUrl: string) => {
    props.core.openPullRequest(pullRequestUrl).catch(console.error);
  };

  const onMute = (pullRequest: PullRequest, muteType: MuteType) => {
    props.core.mutePullRequest(ref(pullRequest), muteType);
  };

  const onUnmute = (pullRequest: PullRequest) => {
    props.core.unmutePullRequest(ref(pullRequest));
  };

  const onToggleNewCommitsNotification = () => {
    props.core.toggleNewCommitsNotificationSetting();
  };

  const onToggleOnlyDirectRequests = () => {
    props.core.toggleOnlyDirectRequestsSetting();
  };

  const onChangeWhitelistedTeams = (teamsText: string) => {
    const teams = teamsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length);
    props.core.onChangeWhitelistedTeamsSetting(teams);
  };

  const onToggleStatusFilter = (status: PullRequestStatus) => {
    setState((currentState) => ({
      ...currentState,
      statusFilter: {
        ...currentState.statusFilter,
        [status]: !currentState.statusFilter[status],
      },
    }));
  };

  if (props.core.overallStatus !== "loaded") {
    return <Loader />;
  }

  return (
    <>
      <Row>
        <Status core={props.core} />
        {isRunningAsPopup() && (
          <FullScreenLink
            target="_blank"
            href={chrome.runtime.getURL("index.html")}
          >
            <FontAwesomeIcon icon="clone" />
          </FullScreenLink>
        )}
      </Row>
      {props.core.token &&
        // Don't show the list if there was an error, we're not refreshing
        // anymore (because of the error) and we don't have any loaded state.
        !(
          props.core.lastError &&
          !props.core.refreshing &&
          !props.core.loadedState
        ) && (
          <>
            <Tabs
              id="popup-tabs"
              activeKey={state.currentFilter}
              onSelect={(key) =>
                setState((currentState) => ({
                  ...currentState,
                  currentFilter: key as Filter,
                }))
              }
            >
              <Tab
                title={
                  <>
                    Incoming PRs{" "}
                    {filteredPullRequests && (
                      <Badge
                        pill
                        bg={
                          filteredPullRequests.incoming.length > 0
                            ? "danger"
                            : "secondary"
                        }
                      >
                        {filteredPullRequests.incoming.length}
                      </Badge>
                    )}
                  </>
                }
                eventKey={Filter.INCOMING}
              />
              <Tab
                title={
                  <>
                    Muted{" "}
                    {filteredPullRequests && (
                      <Badge bg="secondary">
                        {filteredPullRequests.muted.length}
                      </Badge>
                    )}
                  </>
                }
                eventKey={Filter.MUTED}
              />
              <Tab
                title={
                  <>
                    Already reviewed{" "}
                    {filteredPullRequests && (
                      <Badge bg="secondary">
                        {filteredPullRequests.reviewed.length}
                      </Badge>
                    )}
                  </>
                }
                eventKey={Filter.REVIEWED}
              />
              <Tab
                title={
                  <>
                    My PRs{" "}
                    {filteredPullRequests && (
                      <Badge bg="secondary">
                        {filteredPullRequests.mine.length}
                      </Badge>
                    )}
                  </>
                }
                eventKey={Filter.MINE}
              />
            </Tabs>
            <PullRequestList
              header={
                <>
                  <PullRequestStatusFilterComponent
                    statusFilter={state.statusFilter}
                    onToggle={onToggleStatusFilter}
                  />
                  {state.currentFilter === Filter.INCOMING && (
                    <>
                      <WhitelistedTeams
                        onlyDirectRequestsToggled={
                          !!props.core.muteConfiguration.onlyDirectRequests
                        }
                        whitelistedTeams={
                          props.core.muteConfiguration.whitelistedTeams || []
                        }
                        userLogin={
                          props.core.loadedState
                            ? props.core.loadedState.userLogin
                            : undefined
                        }
                        onToggleOnlyDirectRequests={onToggleOnlyDirectRequests}
                        onChangeWhitelistedTeams={onChangeWhitelistedTeams}
                      />
                      <NewCommitsToggle
                        toggled={!!props.core.muteConfiguration.notifyNewCommits}
                        onToggle={onToggleNewCommitsNotification}
                      />
                    </>
                  )}
                </>
              }
              pullRequests={
                filteredPullRequests
                  ? filteredPullRequests[state.currentFilter]
                  : null
              }
              emptyMessage={
                state.currentFilter === Filter.INCOMING
                  ? `Nothing to review, yay!`
                  : `There's nothing to see here.`
              }
              mutingConfiguration={
                state.currentFilter === Filter.INCOMING
                  ? "allow-muting"
                  : state.currentFilter === Filter.MUTED
                  ? "allow-unmuting"
                  : "none"
              }
              onOpenAll={onOpenAll}
              onOpen={onOpen}
              onMute={onMute}
              onUnmute={onUnmute}
            />
          </>
        )}
      <IgnoredRepositories core={props.core} />
      <Settings core={props.core} />
    </>
  );
});

const FullScreenLink = styled(Link)`
  padding: 16px;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;
