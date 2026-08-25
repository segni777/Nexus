import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

const config: Config = {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/services/**/*.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};

export default config;