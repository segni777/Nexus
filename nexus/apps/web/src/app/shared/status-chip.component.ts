import { Component, computed, input } from '@angular/core';

type StatusTone = 'positive' | 'warning' | 'terminal' | 'neutral';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="chip" [class]="'chip chip--' + tone()">{{ label() }}</span>`,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.025em;
      line-height: 1.2;
      text-transform: capitalize;
    }

    .chip--positive {
      color: var(--nx-success);
    }
    .chip--warning {
      color: var(--nx-warning);
    }
    .chip--terminal {
      color: var(--nx-danger);
    }
    .chip--neutral {
      color: var(--nx-muted);
    }
  `,
})
export class StatusChipComponent {
  readonly status = input.required<string>();

  readonly label = computed(() => this.status().toLocaleLowerCase().replaceAll('_', ' '));

  readonly tone = computed<StatusTone>(() => {
    const status = this.status().toUpperCase();

    if (['ACTIVE', 'APPROVED', 'POSTED', 'COMPLETED'].includes(status)) {
      return 'positive';
    }

    if (['DRAFT', 'PROSPECT', 'ASSIGNED', 'IN_REVIEW', 'PAUSED'].includes(status)) {
      return 'warning';
    }

    if (['CANCELLED', 'CHURNED', 'OVERDUE'].includes(status)) {
      return 'terminal';
    }

    return 'neutral';
  });
}
