import styled from "@emotion/styled";
import React from "react";
import { PullRequestStatus, PullRequestStatusFilter } from "../filtering/status-filter";

export interface PullRequestStatusFilterProps {
  statusFilter: PullRequestStatusFilter;
  onToggle(status: PullRequestStatus): void;
}

export function PullRequestStatusFilter(props: PullRequestStatusFilterProps) {
  const renderCheckbox = (status: PullRequestStatus, label: string) => (
    <StatusCheckbox key={status}>
      <input
        type="checkbox"
        checked={props.statusFilter[status]}
        onChange={() => props.onToggle(status)}
      />
      {label}
    </StatusCheckbox>
  );

  return (
    <Container>
      <Label>Show pull requests:</Label>
      <Checkboxes>
        {renderCheckbox("open", "Open")}
        {renderCheckbox("draft", "Draft")}
      </Checkboxes>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8px;
  gap: 8px;
`;

const Label = styled.span`
  color: #555;
  font-weight: 500;
`;

const Checkboxes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const StatusCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
`;
