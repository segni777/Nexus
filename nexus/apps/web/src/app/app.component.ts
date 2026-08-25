import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="shell-header">
      <a class="brand" routerLink="/creators" aria-label="Nexus dashboard home">Nexus</a>
      <nav aria-label="Primary navigation">
        <a routerLink="/creators" routerLinkActive="active">Creators</a>
        <a routerLink="/campaigns" routerLinkActive="active">Campaigns</a>
        <a routerLink="/insights" routerLinkActive="active">Insights</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    .shell-header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid var(--nx-border);
      padding: 0.85rem clamp(1rem, 4vw, 3rem);
      background: color-mix(in srgb, var(--nx-bg) 92%, transparent);
      backdrop-filter: blur(12px);
    }

    .brand {
      color: var(--nx-text);
      font-size: 1.25rem;
      font-weight: 800;
      text-decoration: none;
    }

    nav {
      display: flex;
      gap: 0.4rem;
    }
    nav a {
      border-radius: 7px;
      padding: 0.5rem 0.7rem;
      color: var(--nx-muted);
      text-decoration: none;
    }
    nav a:hover,
    nav a.active {
      color: var(--nx-text);
      background: var(--nx-surface-raised);
    }

    main {
      width: min(1440px, 100%);
      margin: 0 auto;
      padding: clamp(1rem, 4vw, 3rem);
    }

    @media (max-width: 520px) {
      .shell-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class AppComponent {}
