export const TOUR_VERSION = '2';
export const TOUR_PROMPT_INTERVAL_DAYS = 7;

const tenantSteps = [
  {
    id: 'tenant_properties',
    icon: 'heart-outline',
    title: 'Save and unlock properties',
    description: 'Build a shortlist, unlock full property details, and return to saved homes from My Hub.',
  },
  {
    id: 'tenant_location',
    icon: 'map-outline',
    title: 'Open verified locations',
    description: 'After rent payment is confirmed, eligible property locations can open directly in Google Maps.',
  },
  {
    id: 'tenant_wallet',
    icon: 'wallet-outline',
    title: 'Wallet and rent savings',
    description: 'Fund your wallet, withdraw available money, and create a structured rent savings plan.',
  },
  {
    id: 'tenant_services',
    icon: 'sparkles-outline',
    title: 'Book home services',
    description: 'Arrange transportation, cleaning, and fumigation without leaving the app.',
  },
  {
    id: 'tenant_messages',
    icon: 'chatbubbles-outline',
    title: 'Stay connected',
    description: 'Track applications, messages, notifications, and important rental activity in one place.',
  },
];

const landlordSteps = [
  {
    id: 'landlord_listings',
    icon: 'business-outline',
    title: 'Manage your listings',
    description: 'Create properties, update availability, and review each listing from My Hub.',
  },
  {
    id: 'landlord_applications',
    icon: 'documents-outline',
    title: 'Review applications',
    description: 'Follow tenant applications and continue each approval workflow from a focused screen.',
  },
  {
    id: 'landlord_messages',
    icon: 'chatbubbles-outline',
    title: 'Coordinate securely',
    description: 'Continue conversations with applicants and tenants through the in-app message centre.',
  },
  {
    id: 'landlord_wallet',
    icon: 'wallet-outline',
    title: 'Payments and withdrawals',
    description: 'Monitor balances, payment history, property reserves, and withdrawal activity.',
  },
];

const agentSteps = [
  {
    id: 'agent_assignment',
    icon: 'person-circle-outline',
    title: 'Confirm your assignment',
    description: 'Your workspace shows the landlord account and portfolio currently delegated to you.',
  },
  {
    id: 'agent_properties',
    icon: 'business-outline',
    title: 'Operate the portfolio',
    description: 'Create, update, and manage assigned property listings from focused native screens.',
  },
  {
    id: 'agent_commissions',
    icon: 'trending-up-outline',
    title: 'Track commissions',
    description: 'Review earnings and transaction history from your commission ledger.',
  },
  {
    id: 'agent_withdrawals',
    icon: 'wallet-outline',
    title: 'Request payouts',
    description: 'Submit withdrawal requests and follow their status from the agent workspace.',
  },
];

const lawyerSteps = [
  {
    id: 'lawyer_cases',
    icon: 'briefcase-outline',
    title: 'Manage active cases',
    description: 'Open assigned disputes, review their status, and continue the legal workflow.',
  },
  {
    id: 'lawyer_evidence',
    icon: 'document-attach-outline',
    title: 'Review evidence',
    description: 'Inspect submitted evidence, verify case details, and add professional findings.',
  },
  {
    id: 'lawyer_clients',
    icon: 'people-outline',
    title: 'Support your clients',
    description: 'Keep case information and client communication together inside the app.',
  },
  {
    id: 'lawyer_verification',
    icon: 'shield-checkmark-outline',
    title: 'Verify case references',
    description: 'Use the case verification tool to confirm that a RentalHub matter is authentic.',
  },
];

const adminSteps = [
  {
    id: 'admin_metrics',
    icon: 'stats-chart-outline',
    title: 'See what needs attention',
    description: 'Dashboard metrics surface users, properties, applications, and pending verifications.',
  },
  {
    id: 'admin_workspaces',
    icon: 'apps-outline',
    title: 'Use focused workspaces',
    description: 'Open one administrative task at a time instead of working through a desktop-sized control panel.',
  },
  {
    id: 'admin_compliance',
    icon: 'shield-outline',
    title: 'Monitor compliance',
    description: 'Review risk, verification, and property issues from dedicated native screens.',
  },
  {
    id: 'admin_workflows',
    icon: 'git-branch-outline',
    title: 'Complete local workflows',
    description: 'Handle property requests, agent assignments, tenancy controls, and recruitment.',
  },
];

const financialSteps = [
  {
    id: 'financial_overview',
    icon: 'analytics-outline',
    title: 'Review financial health',
    description: 'See revenue, pending money, and completed transaction counts at a glance.',
  },
  {
    id: 'financial_transactions',
    icon: 'swap-horizontal-outline',
    title: 'Inspect transactions',
    description: 'Move into the transaction workspace for detailed payment review.',
  },
  {
    id: 'financial_settlements',
    icon: 'cash-outline',
    title: 'Manage payouts',
    description: 'Review withdrawals, commissions, settlements, and reconciliation tasks.',
  },
  {
    id: 'financial_reports',
    icon: 'document-text-outline',
    title: 'Follow revenue trends',
    description: 'Use focused reports to understand platform income and settlement performance.',
  },
];

const superAdminSteps = [
  {
    id: 'super_overview',
    icon: 'shield-checkmark-outline',
    title: 'Platform control, simplified',
    description: 'The mobile dashboard loads only the workspace you choose, reducing clutter and startup time.',
  },
  {
    id: 'super_workspace',
    icon: 'apps-outline',
    title: 'Choose a workspace',
    description: 'Use the searchable workspace picker to move between users, trust, finance, content, and system tools.',
  },
  {
    id: 'super_trust',
    icon: 'finger-print-outline',
    title: 'Protect platform trust',
    description: 'Manage verification, fraud, reports, flags, lawyers, and administrative approvals.',
  },
  {
    id: 'super_analytics',
    icon: 'bar-chart-outline',
    title: 'Track platform performance',
    description: 'Open analytics and audit workspaces only when you need detailed operational data.',
  },
];

const serviceAdminSteps = [
  {
    id: 'service_dashboard',
    icon: 'speedometer-outline',
    title: 'Your service workspace',
    description: 'Open the operational dashboard assigned to your role and jurisdiction.',
  },
  {
    id: 'service_bookings',
    icon: 'calendar-outline',
    title: 'Manage bookings',
    description: 'Review incoming bookings, assignments, status changes, and customer details.',
  },
  {
    id: 'service_payments',
    icon: 'card-outline',
    title: 'Track payments',
    description: 'Follow service payments, commissions, and revenue from the appropriate workspace.',
  },
];

const supportSteps = [
  {
    id: 'support_tickets',
    icon: 'chatbox-ellipses-outline',
    title: 'Resolve support requests',
    description: 'Review user tickets, take ownership, and follow each issue through resolution.',
  },
  {
    id: 'support_operations',
    icon: 'git-network-outline',
    title: 'Coordinate operations',
    description: 'Handle migration, property, and tenancy requests for your assigned jurisdiction.',
  },
  {
    id: 'support_audit',
    icon: 'reader-outline',
    title: 'Keep an audit trail',
    description: 'Review operational history and escalations before taking sensitive actions.',
  },
];

const coachMarks = {
  tenant_properties: ['Saved homes / Browse', 'Use this control to return to properties you are comparing.', 'top'],
  tenant_location: ['Location tools', 'Open verified location actions only after the right payment or access step is complete.', 'middle'],
  tenant_wallet: ['Wallet / Savings', 'This is where rent savings, wallet movement and payment history connect.', 'bottomLeft'],
  tenant_services: ['Services', 'Book transport, cleaning and fumigation from the service shortcuts.', 'bottomRight'],
  tenant_messages: ['Messages', 'Use messages and notifications to continue rental conversations.', 'bottom'],
  landlord_listings: ['My properties', 'Create and manage listings from this dashboard action.', 'top'],
  landlord_applications: ['Applications', 'Open tenant applications and continue review workflows.', 'middle'],
  landlord_messages: ['Messages', 'Coordinate securely with applicants and tenants.', 'bottomRight'],
  landlord_wallet: ['Payments', 'Follow landlord payments, balances and withdrawals.', 'bottomLeft'],
  agent_assignment: ['Assignment card', 'Start here to confirm which landlord portfolio you are managing.', 'top'],
  agent_properties: ['Portfolio tools', 'Use these actions to create and maintain assigned listings.', 'middle'],
  agent_commissions: ['Earnings', 'Your commission ledger and trends live behind this control.', 'bottomLeft'],
  agent_withdrawals: ['Withdrawals', 'Request and track commission payouts here.', 'bottomRight'],
  lawyer_cases: ['Case list', 'Open active disputes and assigned legal matters from this area.', 'top'],
  lawyer_evidence: ['Evidence tools', 'Review documents, verification data and case evidence here.', 'middle'],
  lawyer_clients: ['Client support', 'Keep case communication and client support together.', 'bottomLeft'],
  lawyer_verification: ['Verify case', 'Use this control to confirm case references are authentic.', 'bottomRight'],
  admin_metrics: ['Metrics cards', 'These cards show the first operational problems to check.', 'top'],
  admin_workspaces: ['Workspace list', 'Pick one focused admin workspace instead of scrolling through a web-sized dashboard.', 'middle'],
  admin_compliance: ['Compliance', 'Verification, risk and trust checks are grouped here.', 'bottomLeft'],
  admin_workflows: ['Workflow actions', 'Continue local operations like property requests, agents and recruitment.', 'bottomRight'],
  financial_overview: ['Finance metrics', 'Start with revenue, pending money and completed transaction health.', 'top'],
  financial_transactions: ['Transactions', 'Open this control for reconciliation-level payment review.', 'middle'],
  financial_settlements: ['Settlements', 'Withdrawals, commissions and frozen-fund controls are grouped here.', 'bottomLeft'],
  financial_reports: ['Reports', 'Use revenue reports and export handoff for finance reporting.', 'bottomRight'],
  super_overview: ['Platform overview', 'This is the high-level control point before opening heavy modules.', 'top'],
  super_workspace: ['Workspace picker', 'Search and jump into the exact super-admin tool you need.', 'middle'],
  super_trust: ['Trust controls', 'Verification, fraud, reports and lawyer tools sit in this area.', 'bottomLeft'],
  super_analytics: ['Analytics', 'Open detailed analytics and audit views from here.', 'bottomRight'],
  service_dashboard: ['Operations metrics', 'Start with bookings, queue health and service status.', 'top'],
  service_bookings: ['Bookings queue', 'Open customer bookings and update operational progress.', 'middle'],
  service_payments: ['Service payments', 'Track revenue, commissions and payment status here.', 'bottom'],
  support_tickets: ['Ticket queue', 'Open and resolve user support tickets from this control.', 'top'],
  support_operations: ['Operations', 'Coordinate migrations, property and tenancy support actions.', 'middle'],
  support_audit: ['Audit trail', 'Review escalation history before sensitive support actions.', 'bottom'],
};

const withCoachMarks = (steps) =>
  steps.map((step, index) => {
    const [targetLabel, targetHint, targetZone] = coachMarks[step.id] || [
      step.title,
      'This highlighted area represents the dashboard control related to this step.',
      ['top', 'middle', 'bottom', 'bottomLeft', 'bottomRight'][index % 5],
    ];

    return {
      ...step,
      targetLabel,
      targetHint,
      targetZone,
    };
  });

export const getTourStepsForRole = (role) => {
  if (role === 'tenant' || role === 'user') return withCoachMarks(tenantSteps);
  if (role === 'landlord') return withCoachMarks(landlordSteps);
  if (role === 'agent') return withCoachMarks(agentSteps);
  if (['lawyer', 'state_lawyer', 'super_lawyer'].includes(role)) return withCoachMarks(lawyerSteps);
  if (['financial_admin', 'lga_financial_admin', 'state_financial_admin', 'super_financial_admin'].includes(role)) {
    return withCoachMarks(financialSteps);
  }
  if (role === 'super_admin') return withCoachMarks(superAdminSteps);
  if (['lga_support_admin', 'state_support_admin', 'super_support_admin'].includes(role)) return withCoachMarks(supportSteps);
  if (
    [
      'transportation_admin',
      'lga_transportation_admin',
      'state_transportation_admin',
      'super_transportation_admin',
      'fumigation_admin',
      'lga_fumigation_admin',
      'state_fumigation_admin',
      'super_fumigation_admin',
      'recruitment_admin',
    ].includes(role)
  ) {
    return withCoachMarks(serviceAdminSteps);
  }
  return withCoachMarks(adminSteps);
};

export const getTourDashboardType = (role) => {
  if (role === 'tenant' || role === 'user') return 'tenant_dashboard';
  if (role === 'landlord') return 'landlord_dashboard';
  if (role === 'agent') return 'agent_dashboard';
  if (['lawyer', 'state_lawyer', 'super_lawyer'].includes(role)) return 'lawyer_dashboard';
  if (role === 'super_admin') return 'super_admin_dashboard';
  if (String(role || '').includes('financial')) return 'financial_admin_dashboard';
  if (String(role || '').includes('support')) return 'support_dashboard';
  if (String(role || '').includes('transportation')) return 'transportation_admin_dashboard';
  if (String(role || '').includes('fumigation')) return 'fumigation_admin_dashboard';
  if (role === 'recruitment_admin') return 'recruitment_admin_dashboard';
  return 'admin_dashboard';
};
