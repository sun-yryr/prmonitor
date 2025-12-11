import styled from "@emotion/styled";

export const ToggleSwitch = styled.input`
  appearance: none;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: #e2e8f0;
  position: relative;
  transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
    transition: transform 0.2s ease;
  }

  &:checked {
    background: linear-gradient(135deg, #10b981, #22c55e);
    border-color: #10b981;
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
  }

  &:checked::after {
    transform: translateX(18px);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
  }
`;
