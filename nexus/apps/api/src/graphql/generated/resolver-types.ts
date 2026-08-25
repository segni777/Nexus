import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Brand as BrandModel, Creator as CreatorModel, Campaign as CampaignModel, CampaignCreator as CampaignCreatorModel, Deliverable as DeliverableModel, MetricsSnapshot as MetricsSnapshotModel, Insight as InsightModel } from '@prisma/client';
import { GraphQLContext } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date; }
  JSON: { input: unknown; output: unknown; }
};

export type AssignCreatorInput = {
  agreedRateCents: Scalars['Int']['input'];
  campaignId: Scalars['ID']['input'];
  creatorId: Scalars['ID']['input'];
  role: CampaignRole;
};

export type Brand = {
  __typename?: 'Brand';
  campaigns: CampaignConnection;
  contactEmail: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  industry: Scalars['String']['output'];
  name: Scalars['String']['output'];
};


export type BrandCampaignsArgs = {
  page?: InputMaybe<PaginationInput>;
};

export type BrandConnection = {
  __typename?: 'BrandConnection';
  items: Array<Brand>;
  pageInfo: PageInfo;
};

export type Campaign = {
  __typename?: 'Campaign';
  brand: Brand;
  brandId: Scalars['ID']['output'];
  budgetCents: Scalars['Int']['output'];
  creators: CampaignCreatorConnection;
  deliverables: DeliverableConnection;
  endDate: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  spentCents: Scalars['Int']['output'];
  startDate: Scalars['DateTime']['output'];
  status: CampaignStatus;
};


export type CampaignCreatorsArgs = {
  page?: InputMaybe<PaginationInput>;
};


export type CampaignDeliverablesArgs = {
  page?: InputMaybe<PaginationInput>;
};

export type CampaignConnection = {
  __typename?: 'CampaignConnection';
  items: Array<Campaign>;
  pageInfo: PageInfo;
};

export type CampaignCreator = {
  __typename?: 'CampaignCreator';
  agreedRateCents: Scalars['Int']['output'];
  campaignId: Scalars['ID']['output'];
  creator: Creator;
  creatorId: Scalars['ID']['output'];
  role: CampaignRole;
};

export type CampaignCreatorConnection = {
  __typename?: 'CampaignCreatorConnection';
  items: Array<CampaignCreator>;
  pageInfo: PageInfo;
};

export type CampaignFilter = {
  brandId?: InputMaybe<Scalars['ID']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<CampaignStatus>;
};

export type CampaignRole =
  | 'AFFILIATE'
  | 'PRIMARY'
  | 'SUPPORTING';

export type CampaignStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DRAFT';

export type CreateCampaignInput = {
  brandId: Scalars['ID']['input'];
  budgetCents: Scalars['Int']['input'];
  endDate: Scalars['DateTime']['input'];
  name: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
};

export type CreateCreatorInput = {
  displayName: Scalars['String']['input'];
  engagementRate: Scalars['Float']['input'];
  followerCount: Scalars['Int']['input'];
  handle: Scalars['String']['input'];
  primaryPlatform: Platform;
  ratePerPost: Scalars['Int']['input'];
};

export type CreateDeliverableInput = {
  campaignId: Scalars['ID']['input'];
  creatorId: Scalars['ID']['input'];
  dueDate: Scalars['DateTime']['input'];
  type: DeliverableType;
};

export type Creator = {
  __typename?: 'Creator';
  campaigns: CampaignConnection;
  createdAt: Scalars['DateTime']['output'];
  deliverables: DeliverableConnection;
  displayName: Scalars['String']['output'];
  engagementRate: Scalars['Float']['output'];
  followerCount: Scalars['Int']['output'];
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  primaryPlatform: Platform;
  ratePerPost: Scalars['Int']['output'];
  status: CreatorStatus;
};


export type CreatorCampaignsArgs = {
  page?: InputMaybe<PaginationInput>;
};


export type CreatorDeliverablesArgs = {
  page?: InputMaybe<PaginationInput>;
};

export type CreatorConnection = {
  __typename?: 'CreatorConnection';
  items: Array<Creator>;
  pageInfo: PageInfo;
};

export type CreatorFilter = {
  platform?: InputMaybe<Platform>;
  status?: InputMaybe<CreatorStatus>;
};

export type CreatorStatus =
  | 'ACTIVE'
  | 'CHURNED'
  | 'PAUSED'
  | 'PROSPECT';

export type Deliverable = {
  __typename?: 'Deliverable';
  campaign: Campaign;
  campaignId: Scalars['ID']['output'];
  creator: Creator;
  creatorId: Scalars['ID']['output'];
  dueDate: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  metrics: MetricsSnapshotConnection;
  postedUrl?: Maybe<Scalars['String']['output']>;
  status: DeliverableStatus;
  type: DeliverableType;
};


export type DeliverableMetricsArgs = {
  page?: InputMaybe<PaginationInput>;
};

export type DeliverableConnection = {
  __typename?: 'DeliverableConnection';
  items: Array<Deliverable>;
  pageInfo: PageInfo;
};

export type DeliverableFilter = {
  campaignId?: InputMaybe<Scalars['ID']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<DeliverableStatus>;
};

export type DeliverableStatus =
  | 'APPROVED'
  | 'ASSIGNED'
  | 'IN_REVIEW'
  | 'OVERDUE'
  | 'POSTED';

export type DeliverableType =
  | 'LIVESTREAM'
  | 'POST'
  | 'STORY'
  | 'VIDEO';

export type Insight = {
  __typename?: 'Insight';
  generatedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  model: Scalars['String']['output'];
  payloadJson: Scalars['JSON']['output'];
  scope: InsightScope;
  scopeId: Scalars['ID']['output'];
  summaryText: Scalars['String']['output'];
};

export type InsightConnection = {
  __typename?: 'InsightConnection';
  items: Array<Insight>;
  pageInfo: PageInfo;
};

export type InsightScope =
  | 'CAMPAIGN'
  | 'CREATOR';

export type MetricsSnapshot = {
  __typename?: 'MetricsSnapshot';
  capturedAt: Scalars['DateTime']['output'];
  comments: Scalars['Int']['output'];
  deliverableId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  likes: Scalars['Int']['output'];
  shares: Scalars['Int']['output'];
  views: Scalars['Int']['output'];
  watchTimeSeconds: Scalars['Int']['output'];
};

export type MetricsSnapshotConnection = {
  __typename?: 'MetricsSnapshotConnection';
  items: Array<MetricsSnapshot>;
  pageInfo: PageInfo;
};

export type Mutation = {
  __typename?: 'Mutation';
  assignCreatorToCampaign: CampaignCreator;
  createCampaign: Campaign;
  createCreator: Creator;
  createDeliverable: Deliverable;
  updateCampaignStatus: Campaign;
  updateCreatorStatus: Creator;
  updateDeliverableStatus: Deliverable;
};


export type MutationAssignCreatorToCampaignArgs = {
  input: AssignCreatorInput;
};


export type MutationCreateCampaignArgs = {
  input: CreateCampaignInput;
};


export type MutationCreateCreatorArgs = {
  input: CreateCreatorInput;
};


export type MutationCreateDeliverableArgs = {
  input: CreateDeliverableInput;
};


export type MutationUpdateCampaignStatusArgs = {
  id: Scalars['ID']['input'];
  status: CampaignStatus;
};


export type MutationUpdateCreatorStatusArgs = {
  id: Scalars['ID']['input'];
  status: CreatorStatus;
};


export type MutationUpdateDeliverableStatusArgs = {
  input: UpdateDeliverableStatusInput;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  offset: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
};

export type PaginationInput = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type Platform =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'YOUTUBE';

export type Query = {
  __typename?: 'Query';
  brand: Brand;
  brands: BrandConnection;
  campaign: Campaign;
  campaigns: CampaignConnection;
  creator: Creator;
  creators: CreatorConnection;
  deliverable: Deliverable;
  deliverables: DeliverableConnection;
  health: Scalars['String']['output'];
  insights: InsightConnection;
};


export type QueryBrandArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBrandsArgs = {
  page?: InputMaybe<PaginationInput>;
};


export type QueryCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCampaignsArgs = {
  filter?: InputMaybe<CampaignFilter>;
  page?: InputMaybe<PaginationInput>;
};


export type QueryCreatorArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCreatorsArgs = {
  filter?: InputMaybe<CreatorFilter>;
  page?: InputMaybe<PaginationInput>;
};


export type QueryDeliverableArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeliverablesArgs = {
  filter?: InputMaybe<DeliverableFilter>;
  page?: InputMaybe<PaginationInput>;
};


export type QueryInsightsArgs = {
  page?: InputMaybe<PaginationInput>;
  scope?: InputMaybe<InsightScope>;
  scopeId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateDeliverableStatusInput = {
  id: Scalars['ID']['input'];
  postedUrl?: InputMaybe<Scalars['String']['input']>;
  status: DeliverableStatus;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AssignCreatorInput: AssignCreatorInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Brand: ResolverTypeWrapper<BrandModel>;
  BrandConnection: ResolverTypeWrapper<Omit<BrandConnection, 'items'> & { items: Array<ResolversTypes['Brand']> }>;
  Campaign: ResolverTypeWrapper<CampaignModel>;
  CampaignConnection: ResolverTypeWrapper<Omit<CampaignConnection, 'items'> & { items: Array<ResolversTypes['Campaign']> }>;
  CampaignCreator: ResolverTypeWrapper<CampaignCreatorModel>;
  CampaignCreatorConnection: ResolverTypeWrapper<Omit<CampaignCreatorConnection, 'items'> & { items: Array<ResolversTypes['CampaignCreator']> }>;
  CampaignFilter: CampaignFilter;
  CampaignRole: CampaignRole;
  CampaignStatus: CampaignStatus;
  CreateCampaignInput: CreateCampaignInput;
  CreateCreatorInput: CreateCreatorInput;
  CreateDeliverableInput: CreateDeliverableInput;
  Creator: ResolverTypeWrapper<CreatorModel>;
  CreatorConnection: ResolverTypeWrapper<Omit<CreatorConnection, 'items'> & { items: Array<ResolversTypes['Creator']> }>;
  CreatorFilter: CreatorFilter;
  CreatorStatus: CreatorStatus;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Deliverable: ResolverTypeWrapper<DeliverableModel>;
  DeliverableConnection: ResolverTypeWrapper<Omit<DeliverableConnection, 'items'> & { items: Array<ResolversTypes['Deliverable']> }>;
  DeliverableFilter: DeliverableFilter;
  DeliverableStatus: DeliverableStatus;
  DeliverableType: DeliverableType;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Insight: ResolverTypeWrapper<InsightModel>;
  InsightConnection: ResolverTypeWrapper<Omit<InsightConnection, 'items'> & { items: Array<ResolversTypes['Insight']> }>;
  InsightScope: InsightScope;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  MetricsSnapshot: ResolverTypeWrapper<MetricsSnapshotModel>;
  MetricsSnapshotConnection: ResolverTypeWrapper<Omit<MetricsSnapshotConnection, 'items'> & { items: Array<ResolversTypes['MetricsSnapshot']> }>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginationInput: PaginationInput;
  Platform: Platform;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateDeliverableStatusInput: UpdateDeliverableStatusInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AssignCreatorInput: AssignCreatorInput;
  Boolean: Scalars['Boolean']['output'];
  Brand: BrandModel;
  BrandConnection: Omit<BrandConnection, 'items'> & { items: Array<ResolversParentTypes['Brand']> };
  Campaign: CampaignModel;
  CampaignConnection: Omit<CampaignConnection, 'items'> & { items: Array<ResolversParentTypes['Campaign']> };
  CampaignCreator: CampaignCreatorModel;
  CampaignCreatorConnection: Omit<CampaignCreatorConnection, 'items'> & { items: Array<ResolversParentTypes['CampaignCreator']> };
  CampaignFilter: CampaignFilter;
  CreateCampaignInput: CreateCampaignInput;
  CreateCreatorInput: CreateCreatorInput;
  CreateDeliverableInput: CreateDeliverableInput;
  Creator: CreatorModel;
  CreatorConnection: Omit<CreatorConnection, 'items'> & { items: Array<ResolversParentTypes['Creator']> };
  CreatorFilter: CreatorFilter;
  DateTime: Scalars['DateTime']['output'];
  Deliverable: DeliverableModel;
  DeliverableConnection: Omit<DeliverableConnection, 'items'> & { items: Array<ResolversParentTypes['Deliverable']> };
  DeliverableFilter: DeliverableFilter;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Insight: InsightModel;
  InsightConnection: Omit<InsightConnection, 'items'> & { items: Array<ResolversParentTypes['Insight']> };
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  MetricsSnapshot: MetricsSnapshotModel;
  MetricsSnapshotConnection: Omit<MetricsSnapshotConnection, 'items'> & { items: Array<ResolversParentTypes['MetricsSnapshot']> };
  Mutation: Record<PropertyKey, never>;
  PageInfo: PageInfo;
  PaginationInput: PaginationInput;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  UpdateDeliverableStatusInput: UpdateDeliverableStatusInput;
};

export type BrandResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Brand'] = ResolversParentTypes['Brand']> = {
  campaigns?: Resolver<ResolversTypes['CampaignConnection'], ParentType, ContextType, Partial<BrandCampaignsArgs>>;
  contactEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  industry?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BrandConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BrandConnection'] = ResolversParentTypes['BrandConnection']> = {
  items?: Resolver<Array<ResolversTypes['Brand']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type CampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Campaign'] = ResolversParentTypes['Campaign']> = {
  brand?: Resolver<ResolversTypes['Brand'], ParentType, ContextType>;
  brandId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  budgetCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  creators?: Resolver<ResolversTypes['CampaignCreatorConnection'], ParentType, ContextType, Partial<CampaignCreatorsArgs>>;
  deliverables?: Resolver<ResolversTypes['DeliverableConnection'], ParentType, ContextType, Partial<CampaignDeliverablesArgs>>;
  endDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spentCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CampaignStatus'], ParentType, ContextType>;
};

export type CampaignConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CampaignConnection'] = ResolversParentTypes['CampaignConnection']> = {
  items?: Resolver<Array<ResolversTypes['Campaign']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type CampaignCreatorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CampaignCreator'] = ResolversParentTypes['CampaignCreator']> = {
  agreedRateCents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  campaignId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  creator?: Resolver<ResolversTypes['Creator'], ParentType, ContextType>;
  creatorId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['CampaignRole'], ParentType, ContextType>;
};

export type CampaignCreatorConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CampaignCreatorConnection'] = ResolversParentTypes['CampaignCreatorConnection']> = {
  items?: Resolver<Array<ResolversTypes['CampaignCreator']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type CreatorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Creator'] = ResolversParentTypes['Creator']> = {
  campaigns?: Resolver<ResolversTypes['CampaignConnection'], ParentType, ContextType, Partial<CreatorCampaignsArgs>>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deliverables?: Resolver<ResolversTypes['DeliverableConnection'], ParentType, ContextType, Partial<CreatorDeliverablesArgs>>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  engagementRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  followerCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  primaryPlatform?: Resolver<ResolversTypes['Platform'], ParentType, ContextType>;
  ratePerPost?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CreatorStatus'], ParentType, ContextType>;
};

export type CreatorConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreatorConnection'] = ResolversParentTypes['CreatorConnection']> = {
  items?: Resolver<Array<ResolversTypes['Creator']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeliverableResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Deliverable'] = ResolversParentTypes['Deliverable']> = {
  campaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType>;
  campaignId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  creator?: Resolver<ResolversTypes['Creator'], ParentType, ContextType>;
  creatorId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  dueDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['MetricsSnapshotConnection'], ParentType, ContextType, Partial<DeliverableMetricsArgs>>;
  postedUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DeliverableStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DeliverableType'], ParentType, ContextType>;
};

export type DeliverableConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliverableConnection'] = ResolversParentTypes['DeliverableConnection']> = {
  items?: Resolver<Array<ResolversTypes['Deliverable']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type InsightResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Insight'] = ResolversParentTypes['Insight']> = {
  generatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  payloadJson?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  scope?: Resolver<ResolversTypes['InsightScope'], ParentType, ContextType>;
  scopeId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  summaryText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type InsightConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InsightConnection'] = ResolversParentTypes['InsightConnection']> = {
  items?: Resolver<Array<ResolversTypes['Insight']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MetricsSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetricsSnapshot'] = ResolversParentTypes['MetricsSnapshot']> = {
  capturedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  comments?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deliverableId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  likes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  shares?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  views?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  watchTimeSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MetricsSnapshotConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetricsSnapshotConnection'] = ResolversParentTypes['MetricsSnapshotConnection']> = {
  items?: Resolver<Array<ResolversTypes['MetricsSnapshot']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  assignCreatorToCampaign?: Resolver<ResolversTypes['CampaignCreator'], ParentType, ContextType, RequireFields<MutationAssignCreatorToCampaignArgs, 'input'>>;
  createCampaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<MutationCreateCampaignArgs, 'input'>>;
  createCreator?: Resolver<ResolversTypes['Creator'], ParentType, ContextType, RequireFields<MutationCreateCreatorArgs, 'input'>>;
  createDeliverable?: Resolver<ResolversTypes['Deliverable'], ParentType, ContextType, RequireFields<MutationCreateDeliverableArgs, 'input'>>;
  updateCampaignStatus?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<MutationUpdateCampaignStatusArgs, 'id' | 'status'>>;
  updateCreatorStatus?: Resolver<ResolversTypes['Creator'], ParentType, ContextType, RequireFields<MutationUpdateCreatorStatusArgs, 'id' | 'status'>>;
  updateDeliverableStatus?: Resolver<ResolversTypes['Deliverable'], ParentType, ContextType, RequireFields<MutationUpdateDeliverableStatusArgs, 'input'>>;
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  offset?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  brand?: Resolver<ResolversTypes['Brand'], ParentType, ContextType, RequireFields<QueryBrandArgs, 'id'>>;
  brands?: Resolver<ResolversTypes['BrandConnection'], ParentType, ContextType, Partial<QueryBrandsArgs>>;
  campaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<QueryCampaignArgs, 'id'>>;
  campaigns?: Resolver<ResolversTypes['CampaignConnection'], ParentType, ContextType, Partial<QueryCampaignsArgs>>;
  creator?: Resolver<ResolversTypes['Creator'], ParentType, ContextType, RequireFields<QueryCreatorArgs, 'id'>>;
  creators?: Resolver<ResolversTypes['CreatorConnection'], ParentType, ContextType, Partial<QueryCreatorsArgs>>;
  deliverable?: Resolver<ResolversTypes['Deliverable'], ParentType, ContextType, RequireFields<QueryDeliverableArgs, 'id'>>;
  deliverables?: Resolver<ResolversTypes['DeliverableConnection'], ParentType, ContextType, Partial<QueryDeliverablesArgs>>;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  insights?: Resolver<ResolversTypes['InsightConnection'], ParentType, ContextType, Partial<QueryInsightsArgs>>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Brand?: BrandResolvers<ContextType>;
  BrandConnection?: BrandConnectionResolvers<ContextType>;
  Campaign?: CampaignResolvers<ContextType>;
  CampaignConnection?: CampaignConnectionResolvers<ContextType>;
  CampaignCreator?: CampaignCreatorResolvers<ContextType>;
  CampaignCreatorConnection?: CampaignCreatorConnectionResolvers<ContextType>;
  Creator?: CreatorResolvers<ContextType>;
  CreatorConnection?: CreatorConnectionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Deliverable?: DeliverableResolvers<ContextType>;
  DeliverableConnection?: DeliverableConnectionResolvers<ContextType>;
  Insight?: InsightResolvers<ContextType>;
  InsightConnection?: InsightConnectionResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  MetricsSnapshot?: MetricsSnapshotResolvers<ContextType>;
  MetricsSnapshotConnection?: MetricsSnapshotConnectionResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

