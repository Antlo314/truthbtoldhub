export const FUNDING_RAISED = 1000;
export const FUNDING_GOAL = 10000;
export const PRODUCTION_RESUME_AT = 5000;

export const CASH_APP_URL = 'https://cash.app/$truufbtold';
export const STRIPE_URL = 'https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01';

export function formatFunding(amount: number): string {
    return amount.toLocaleString('en-US');
}

export function fundingProgressPercent(): number {
    return (FUNDING_RAISED / FUNDING_GOAL) * 100;
}

export function fundingProgressLabel(): string {
    return `$${formatFunding(FUNDING_RAISED)} / $${formatFunding(FUNDING_GOAL)}`;
}

export const INFRASTRUCTURE_MILESTONES = [
    {
        label: 'Lights On',
        amount: FUNDING_RAISED,
        status: 'active' as const,
        description: `$${formatFunding(FUNDING_RAISED)} raised so far. Hosting, previews, and the hub stay live while we build.`,
    },
    {
        label: 'Production Resume',
        amount: PRODUCTION_RESUME_AT,
        status: 'next' as const,
        description: `At $${formatFunding(PRODUCTION_RESUME_AT)} we go back into active production and launch a massive 400 Series rollout.`,
    },
    {
        label: 'Full Infrastructure',
        amount: FUNDING_GOAL,
        status: 'goal' as const,
        description: `At $${formatFunding(FUNDING_GOAL)}: AI workstation, render pipeline, and studio gear for sustained production.`,
    },
];