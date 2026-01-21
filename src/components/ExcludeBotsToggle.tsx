import styled from "@emotion/styled";
import { observer } from "mobx-react-lite";
import React from "react";

export interface ExcludeBotsToggleProps {
  toggled: boolean;
  onToggle(): void;
}

export const ExcludeBotsToggle = observer((props: ExcludeBotsToggleProps) => {
  return (
    <Container>
      <ExcludeBotsCheckbox
        type="checkbox"
        checked={props.toggled}
        onChange={props.onToggle}
      />
      Exclude bots
    </Container>
  );
});

const Container = styled.label`
  padding: 8px;
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ExcludeBotsCheckbox = styled.input`
  margin-right: 8px;
`;
