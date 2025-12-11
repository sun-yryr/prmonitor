import styled from "@emotion/styled";
import { observer } from "mobx-react-lite";
import React, { useRef, useState } from "react";
import { LargeButton } from "./design/Button";
import { ToggleSwitch } from "./design/Toggle";

export interface WhitelistedTeamsProps {
  onlyDirectRequestsToggled: boolean;
  whitelistedTeams: string[];
  userLogin?: string;
  onToggleOnlyDirectRequests(): void;
  onChangeWhitelistedTeams(text: string): void;
}

export const WhitelistedTeams = observer((props: WhitelistedTeamsProps) => {
  const defaultWhitelistedTeams = props.whitelistedTeams.join(", ");
  const [whitelistedTeams, setWhitelistedTeams] = useState(
    defaultWhitelistedTeams
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const handleWhitelistedTeamsChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current) {
      return;
    }

    setWhitelistedTeams(inputRef.current.value);
  };
  const handleApplyWhitelistedTeamsChange = (e: React.FormEvent) => {
    e.preventDefault();
    props.onChangeWhitelistedTeams(whitelistedTeams);
  };
  return (
    <Container>
      <HeaderRow>
        <Title>Request source</Title>
        {props.userLogin && <LoginTag>@{props.userLogin}</LoginTag>}
      </HeaderRow>
      <Description>
        Focus on PRs that mention you directly or include selected teams.
      </Description>
      <ToggleRow>
        <ToggleSwitch
          type="checkbox"
          checked={props.onlyDirectRequestsToggled}
          onChange={props.onToggleOnlyDirectRequests}
        />
        <ToggleLabel>
          Only direct requests and whitelisted teams
          <Hint>Uncheck to see every request</Hint>
        </ToggleLabel>
      </ToggleRow>
      {props.onlyDirectRequestsToggled && (
        <TeamsRow>
          <WhitelistedTeamsInput
            ref={inputRef}
            placeholder="team1, team2"
            value={whitelistedTeams}
            onInput={handleWhitelistedTeamsChange}
          ></WhitelistedTeamsInput>
          <LargeButton
            disabled={whitelistedTeams === defaultWhitelistedTeams}
            onClick={handleApplyWhitelistedTeamsChange}
          >
            Apply
          </LargeButton>
        </TeamsRow>
      )}
    </Container>
  );
});

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.span`
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const LoginTag = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  font-size: 12px;
`;

const Description = styled.span`
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
`;

const ToggleLabel = styled.div`
  display: flex;
  flex-direction: column;
  color: #0f172a;
  font-weight: 600;
  letter-spacing: 0.01em;
  gap: 2px;
`;

const Hint = styled.span`
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
`;

const TeamsRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const WhitelistedTeamsInput = styled.input`
  flex-grow: 1;
  padding: 10px 12px;
  min-width: 200px;
  border-radius: 10px;
  border: 1px solid #d8dee9;
  background: #f8fafc;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &:focus {
    outline: none;
    border-color: #2563eb;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
`;
