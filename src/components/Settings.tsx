import styled from "@emotion/styled";
import { observer } from "mobx-react-lite";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Core } from "../state/core";
import {
  MAX_REFRESH_INTERVAL_MINUTES,
  MIN_REFRESH_INTERVAL_MINUTES,
} from "../storage/refresh-interval";
import { LargeButton } from "./design/Button";
import { Center } from "./design/Center";
import { Header } from "./design/Header";
import { Link } from "./design/Link";
import { Paragraph } from "./design/Paragraph";
import { Row } from "./design/Row";

const UserLogin = styled.span`
  color: #000;
`;

const TokenInput = styled.input`
  flex-grow: 1;
  padding: 4px 8px;
  margin-right: 8px;

  &:focus {
    outline-color: #2ee59d;
  }
`;

const RefreshIntervalInput = styled.input`
  flex-grow: 1;
  padding: 4px 8px;
  margin-right: 8px;

  &:focus {
    outline-color: #2ee59d;
  }
`;

export interface SettingsProps {
  core: Core;
}

export const Settings = observer((props: SettingsProps) => {
  const [state, setState] = useState<{
    editing: boolean | "default";
  }>({
    editing: "default",
  });

  const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState(
    props.core.refreshIntervalMinutes.toString()
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRefreshIntervalMinutes(props.core.refreshIntervalMinutes.toString());
  }, [props.core.refreshIntervalMinutes]);

  // Show the token editing form if:
  // - editing is "default" (user has not said whether they want to open or dismiss the form)
  //   AND the token is not set; or
  // - editing is explicitly set to true (user opened the form).
  const editing =
    state.editing === "default" ? !props.core.token : state.editing;

  const openForm = () => {
    setState({
      editing: true,
    });
  };

  const saveForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputRef.current) {
      return;
    }
    const token = inputRef.current.value;
    props.core
      .setNewToken(token)
      .then(() => console.log("GitHub API token updated."));
    setState({
      editing: false,
    });
  };

  const saveRefreshInterval = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = parseInt(refreshIntervalMinutes, 10);
    if (Number.isNaN(minutes)) {
      return;
    }
    props.core.updateRefreshInterval(minutes).catch(console.error);
  };

  const cancelForm = () => {
    setState({
      editing: false,
    });
  };

  return (
    <>
      <Header>Settings</Header>
      {!editing ? (
        props.core.loadedState ? (
          <Row>
            <Paragraph>
              Signed in as{" "}
              <UserLogin>
                {props.core.loadedState.userLogin || "unknown"}
              </UserLogin>
              .
            </Paragraph>
            <LargeButton onClick={openForm}>Update token</LargeButton>
          </Row>
        ) : props.core.lastError ? (
          <Row>
            <Paragraph>Is your token valid?</Paragraph>
            <LargeButton onClick={openForm}>Update token</LargeButton>
          </Row>
        ) : props.core.token ? (
          <Row>
            <Paragraph>
              We're loading your pull requests. This could take a while...
            </Paragraph>
            <LargeButton onClick={openForm}>Update token</LargeButton>
          </Row>
        ) : (
          <>
            <Paragraph>
              Welcome to PR Monitor! In order to use this Chrome extension, you
              need to provide a GitHub API token. This will be used to load your
              pull requests.
            </Paragraph>
            <Center>
              <LargeButton onClick={openForm}>Update token</LargeButton>
            </Center>
          </>
        )
      ) : (
        <form onSubmit={saveForm}>
          {!props.core.token && (
            <Paragraph>
              Welcome to PR Monitor! In order to use this Chrome extension, you
              need to provide a GitHub API token. This will be used to load your
              pull requests.
            </Paragraph>
          )}
          <Paragraph>
            Enter a GitHub API token with <b>repo</b> scope (
            <Link
              href="https://github.com/settings/tokens/new?description=PR%20Monitor&amp;scopes=repo"
              target="_blank"
            >
              create a new one
            </Link>
            ):
          </Paragraph>
          <Row>
            <TokenInput ref={inputRef} />
            <LargeButton type="submit">Save</LargeButton>
            <LargeButton onClick={cancelForm}>Cancel</LargeButton>
          </Row>
        </form>
      )}
      <form onSubmit={saveRefreshInterval}>
        <Paragraph>
          Adjust how often PR Monitor should check GitHub. Increase the interval
          if you run into rate limits.
        </Paragraph>
        <Row>
          <RefreshIntervalInput
            type="number"
            min={MIN_REFRESH_INTERVAL_MINUTES}
            max={MAX_REFRESH_INTERVAL_MINUTES}
            value={refreshIntervalMinutes}
            onChange={(event) => setRefreshIntervalMinutes(event.target.value)}
          />
          <LargeButton type="submit">Save interval</LargeButton>
        </Row>
      </form>
    </>
  );
});
