import { config } from "@remotion/eslint-config-flat";

const overrides = [
  // Ignore JS tests for lint now (Node globals, CommonJS)
  {
    ignores: ["test/**"],
  },
];

export default [...config, ...overrides];
