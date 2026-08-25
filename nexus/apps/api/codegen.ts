import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema.graphql',
  generates: {
    './src/graphql/generated/resolver-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context.js#GraphQLContext',
        mapperTypeSuffix: 'Model',
        enumsAsTypes: true,
        strictScalars: true,
        scalars: {
          DateTime: { input: 'Date', output: 'Date' },
          JSON: { input: 'unknown', output: 'unknown' },
        },
        mappers: {
          Brand: '@prisma/client#Brand',
          Creator: '@prisma/client#Creator',
          Campaign: '@prisma/client#Campaign',
          CampaignCreator: '@prisma/client#CampaignCreator',
          Deliverable: '@prisma/client#Deliverable',
          MetricsSnapshot: '@prisma/client#MetricsSnapshot',
          Insight: '@prisma/client#Insight',
        },
      },
    },
  },
};

export default config;