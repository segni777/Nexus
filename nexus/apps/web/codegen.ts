import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/graphql/schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    './src/app/core/graphql/generated/operations.ts': {
      plugins: [
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        strictScalars: true,
        useTypeImports: true,
        scalars: {
          DateTime: {
            input: 'string',
            output: 'string',
          },
          JSON: {
            input: 'unknown',
            output: 'unknown',
          },
        },
      },
    },
  },
};

export default config;
