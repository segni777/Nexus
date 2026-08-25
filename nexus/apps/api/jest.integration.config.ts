import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

const config: Config = {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30_000,
};

export default config;