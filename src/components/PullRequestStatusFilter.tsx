import styled from "@emotion/styled";
import React from "react";
import { PullRequestStatus, PullRequestStatusFilter } from "../filtering/status-filter";

export interface PullRequestStatusFilterProps {
  statusFilter: PullRequestStatusFilter;
  onToggle(status: PullRequestStatus): void;
}

export function PullRequestStatusFilter(props: PullRequestStatusFilterProps) {
  const renderCheckbox = (status: PullRequestStatus, label: string) => (
    <StatusPill key={status} checked={props.statusFilter[status]}>
      <StatusCheckbox
        type="checkbox"
        checked={props.statusFilter[status]}
        onChange={() => props.onToggle(status)}
      />
      <span>{label}</span>
    </StatusPill>
  );

  return (
    <Container>
      <Label>Statuses</Label>
      <Description>Toggle which PRs appear in this view.</Description>
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
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px 12px;
`;

const Label = styled.span`
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-size: 14px;
`;

const Description = styled.span`
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
  flex-basis: 100%;
`;

const Checkboxes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const StatusPill = styled.label<{ checked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${(props) => (props.checked ? "#2563eb" : "#e2e8f0")};
  background: ${(props) =>
    props.checked ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "#f8fafc"};
  color: ${(props) => (props.checked ? "#0f172a" : "#4b5563")};
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;

  &:hover {
    border-color: #2563eb;
    box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12);
  }
`;

const StatusCheckbox = styled.input`
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 2px solid #cbd5e1;
  background: #fff;
  position: relative;
  transition: all 0.2s ease;

  &:checked {
    border-color: #2563eb;
    background: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
  }

  &:checked::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 10px;
    border: 2px solid #fff;
    border-top: 0;
    border-left: 0;
    top: 1px;
    left: 4px;
    transform: rotate(45deg);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
  }
`;
