import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'creators',
  },
  {
    path: 'creators',
    title: 'Creator Roster - Nexus',
    loadComponent: () =>
      import('./features/creators/creator-roster.component').then(
        (module) => module.CreatorRosterComponent,
      ),
  },
  {
    path: 'campaigns',
    title: 'Campaign Board - Nexus',
    loadComponent: () =>
      import('./features/campaigns/campaign-board.component').then(
        (module) => module.CampaignBoardComponent,
      ),
  },
  {
    path: 'campaigns/:id',
    title: 'Campaign Detail - Nexus',
    loadComponent: () =>
      import('./features/campaigns/campaign-detail.component').then(
        (module) => module.CampaignDetailComponent,
      ),
  },
  {
    path: 'insights',
    title: 'Insights - Nexus',
    loadComponent: () =>
      import('./features/insights/insights-panel.component').then(
        (module) => module.InsightsPanelComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'creators',
  },
];
