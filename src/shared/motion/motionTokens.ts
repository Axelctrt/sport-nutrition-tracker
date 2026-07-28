export interface SportPilotMotionTokens {
  durationFast: number;
  durationStandard: number;
  durationPanel: number;
  durationEmphasis: number;
  durationReveal: number;
  easingStandard: string;
  easingEnter: string;
  easingExit: string;
  pressScale: number;
}

export const sportPilotMotionTokens: SportPilotMotionTokens = {
  durationFast: 140,
  durationStandard: 220,
  durationPanel: 280,
  durationEmphasis: 420,
  durationReveal: 1_000,
  easingStandard: "cubic-bezier(0.2, 0, 0, 1)",
  easingEnter: "cubic-bezier(0.16, 1, 0.3, 1)",
  easingExit: "cubic-bezier(0.4, 0, 1, 1)",
  pressScale: 0.98,
};

