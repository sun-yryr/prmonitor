import styled from "@emotion/styled";
import { observer } from "mobx-react-lite";
import React from "react";
import { ToggleSwitch } from "./design/Toggle";

export interface NewCommitsToggleProps {
  toggled: boolean;
  onToggle(): void;
}

const Container = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
`;

const Title = styled.span`
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const Description = styled.span`
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
`;

const ToggleLabel = styled.span`
  color: #0f172a;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const NewCommitsCheckbox = styled(ToggleSwitch)`
  &:checked {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    border-color: #2563eb;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
  }
`;

export const NewCommitsToggle = observer((props: NewCommitsToggleProps) => {
  return (
    <Container>
      <Title>Notifications</Title>
      <Description>Include PRs with new commits since your last review.</Description>
      <ToggleRow>
        <NewCommitsCheckbox
          type="checkbox"
          checked={props.toggled}
          onChange={props.onToggle}
        />
        <ToggleLabel>Include new commits</ToggleLabel>
      </ToggleRow>
    </Container>
  );
});
