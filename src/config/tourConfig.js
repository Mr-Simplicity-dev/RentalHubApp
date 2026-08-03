const { TOUR_STEP_COPY } = require('../i18n/tourStepCatalog.cjs');

export const TOUR_VERSION = '4';
export const TOUR_PROMPT_INTERVAL_DAYS = 7;

const destination = (name, params) => ({ name, ...(params ? { params } : {}) });
const workflow = (name, params) => ({
  destination: destination(name, params),
  action: true,
});
const step = (id, icon, options = {}) => ({ id, icon, ...options });
const settingsStep = step(
  'tour_settings',
  'settings-outline',
  workflow('Settings')
);

const tenantSteps = [
  step('tenant_properties', 'heart-outline'),
  step('tenant_location', 'map-outline'),
  step('tenant_wallet', 'wallet-outline'),
  step('tenant_applications', 'documents-outline', workflow('MainTabs', { screen: 'Applications' })),
  step('tenant_services', 'sparkles-outline', workflow('TransportationBookings')),
  step('tenant_messages', 'chatbubbles-outline', workflow('MainTabs', { screen: 'Messages' })),
  step('tenant_payments', 'receipt-outline', workflow('PaymentHistory')),
  step('tenant_support', 'headset-outline', workflow('Support')),
];

const landlordSteps = [
  step('landlord_listings', 'business-outline'),
  step('landlord_applications', 'documents-outline', workflow('MainTabs', { screen: 'Applications' })),
  step('landlord_messages', 'chatbubbles-outline', workflow('MainTabs', { screen: 'Messages' })),
  step('landlord_wallet', 'wallet-outline', workflow('PaymentHistory')),
  step('landlord_support', 'headset-outline', workflow('Support')),
];

const agentSteps = [
  step('agent_assignment', 'person-circle-outline'),
  step('agent_properties', 'business-outline', workflow('MyProperties')),
  step('agent_commissions', 'trending-up-outline', workflow('AgentEarnings')),
  step('agent_withdrawals', 'wallet-outline', workflow('AgentWithdrawals')),
];

const lawyerSteps = [
  step('lawyer_cases', 'briefcase-outline'),
  step('lawyer_evidence', 'document-attach-outline'),
  step('lawyer_clients', 'people-outline', workflow('Messages')),
  step('lawyer_verification', 'shield-checkmark-outline', workflow('VerifyCase')),
];

const adminSteps = [
  step('admin_metrics', 'stats-chart-outline'),
  step('admin_workspaces', 'apps-outline'),
  step('admin_compliance', 'shield-outline', workflow('AdminEvidenceVerifications')),
  step('admin_workflows', 'git-branch-outline'),
];

const lgaAdminSteps = [
  step('lga_admin_overview', 'stats-chart-outline'),
  step('lga_admin_services', 'apps-outline'),
  step('lga_admin_requests', 'business-outline'),
  step('lga_admin_tenancy', 'key-outline'),
];

const stateAdminSteps = [
  step('state_overview', 'stats-chart-outline'),
  step('state_management', 'map-outline'),
  step('state_requests', 'business-outline'),
  step('state_tenancy', 'key-outline'),
];

const financialSteps = [
  step('financial_overview', 'analytics-outline'),
  step('financial_transactions', 'swap-horizontal-outline', workflow('FinancialTransactions')),
  step('financial_settlements', 'cash-outline', workflow('FinancialWithdrawals')),
  step('financial_reports', 'document-text-outline', workflow('FinancialRevenueReport')),
];

const lgaFinancialSteps = [
  step('lga_financial_overview', 'analytics-outline'),
  step('lga_financial_withdrawal', 'cash-outline'),
  step('lga_financial_history', 'receipt-outline'),
];

const superAdminSteps = [
  step('super_overview', 'shield-checkmark-outline'),
  step('super_workspace', 'apps-outline'),
  step('super_trust', 'finger-print-outline'),
  step('super_analytics', 'bar-chart-outline'),
];

const serviceAdminSteps = [
  step('service_dashboard', 'speedometer-outline'),
  step('service_bookings', 'calendar-outline', workflow('ServiceBookings')),
  step('service_payments', 'card-outline'),
];

const supportSteps = [
  step('support_tickets', 'chatbox-ellipses-outline', workflow('SupportTickets')),
  step('support_operations', 'git-network-outline'),
  step('support_audit', 'reader-outline'),
];

const recruitmentSteps = [
  step('recruitment_overview', 'analytics-outline'),
  step('recruitment_filters', 'funnel-outline'),
  step('recruitment_candidates', 'people-outline'),
  step('recruitment_reports', 'document-text-outline'),
];

const localizeSteps = (steps, language = 'en') => {
  const locale = TOUR_STEP_COPY[language] ? language : 'en';
  return [...steps, settingsStep].map((definition, index) => {
    const copy = TOUR_STEP_COPY[locale]?.[definition.id] || TOUR_STEP_COPY.en[definition.id];
    const [title, description] = copy || [definition.id, definition.id];
    return {
      ...definition,
      targetId: definition.id,
      targetLabel: title,
      targetHint: description,
      targetZone: ['top', 'middle', 'bottom', 'bottomLeft', 'bottomRight'][index % 5],
      title,
      description,
    };
  });
};

export const getEffectiveTourRole = (user) => (
  user?.is_recruitment_admin === true && user?.user_type !== 'super_admin'
    ? 'recruitment_admin'
    : user?.user_type || 'tenant'
);

const getWorkflowGroupsForRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (['tenant', 'user'].includes(normalizedRole)) {
    return [
      ['property_access', ['tenant_properties', 'tenant_location']],
      ['applications_messages', ['tenant_applications', 'tenant_messages']],
      ['wallet_payments', ['tenant_wallet', 'tenant_payments']],
      ['bookings_support', ['tenant_services', 'tenant_support']],
      ['tour_preferences', ['tour_settings']],
    ];
  }
  if (normalizedRole === 'landlord') {
    return [
      ['listing_management', ['landlord_listings']],
      ['applications_messages', ['landlord_applications', 'landlord_messages']],
      ['payments_support', ['landlord_wallet', 'landlord_support']],
      ['tour_preferences', ['tour_settings']],
    ];
  }
  if (normalizedRole === 'agent') {
    return [
      ['portfolio_operations', ['agent_assignment', 'agent_properties']],
      ['commissions_payouts', ['agent_commissions', 'agent_withdrawals']],
      ['tour_preferences', ['tour_settings']],
    ];
  }
  if (['lawyer', 'state_lawyer', 'super_lawyer'].includes(normalizedRole)) {
    return [
      ['legal_casework', ['lawyer_cases', 'lawyer_evidence', 'lawyer_clients', 'lawyer_verification']],
      ['tour_preferences', ['tour_settings']],
    ];
  }

  const category = normalizedRole.includes('financial')
    ? 'finance_operations'
    : normalizedRole === 'recruitment_admin'
      ? 'recruitment_operations'
      : normalizedRole.includes('support') ||
          normalizedRole.includes('transportation') ||
          normalizedRole.includes('fumigation')
        ? 'support_service_operations'
        : 'platform_operations';

  return [
    [category, null],
    ['tour_preferences', ['tour_settings']],
  ];
};

export const getTourStepsForRole = (role, language = 'en') => {
  if (role === 'tenant' || role === 'user') return localizeSteps(tenantSteps, language);
  if (role === 'landlord') return localizeSteps(landlordSteps, language);
  if (role === 'agent') return localizeSteps(agentSteps, language);
  if (['lawyer', 'state_lawyer', 'super_lawyer'].includes(role)) return localizeSteps(lawyerSteps, language);
  if (role === 'lga_financial_admin') return localizeSteps(lgaFinancialSteps, language);
  if (role === 'state_financial_admin' || role === 'state_admin') return localizeSteps(stateAdminSteps, language);
  if (['financial_admin', 'super_financial_admin'].includes(role)) return localizeSteps(financialSteps, language);
  if (role === 'super_admin') return localizeSteps(superAdminSteps, language);
  if (['lga_support_admin', 'state_support_admin', 'super_support_admin'].includes(role)) return localizeSteps(supportSteps, language);
  if (role === 'recruitment_admin') return localizeSteps(recruitmentSteps, language);
  if (role === 'lga_admin') return localizeSteps(lgaAdminSteps, language);
  if ([
    'transportation_admin',
    'lga_transportation_admin',
    'state_transportation_admin',
    'super_transportation_admin',
    'fumigation_admin',
    'lga_fumigation_admin',
    'state_fumigation_admin',
    'super_fumigation_admin',
  ].includes(role)) return localizeSteps(serviceAdminSteps, language);
  return localizeSteps(adminSteps, language);
};

export const getTourWorkflowCatalog = (role, language = 'en') => {
  const allSteps = getTourStepsForRole(role, language);
  const allOperationalIds = allSteps
    .filter(({ id }) => id !== 'tour_settings')
    .map(({ id }) => id);

  return getWorkflowGroupsForRole(role).map(([id, configuredIds]) => {
    const stepIds = configuredIds || allOperationalIds;
    const workflowSteps = stepIds
      .map((stepId) => allSteps.find(({ id: candidateId }) => candidateId === stepId))
      .filter(Boolean);
    const lead = workflowSteps[0];

    return {
      id,
      title: lead?.title || id,
      description: lead?.description || '',
      stepIds: workflowSteps.map(({ id: stepId }) => stepId),
    };
  }).filter(({ stepIds }) => stepIds.length > 0);
};

export const getTourStepsForWorkflow = (role, workflowId, language = 'en') => {
  const allSteps = getTourStepsForRole(role, language);
  const workflowDefinition = getTourWorkflowCatalog(role, language)
    .find(({ id }) => id === workflowId);
  if (!workflowDefinition) return allSteps;
  const selected = new Set(workflowDefinition.stepIds);
  return allSteps.filter(({ id }) => selected.has(id));
};

export const getTourDashboardType = (role) => {
  const dashboardByRole = {
    user: 'tenant_dashboard',
    tenant: 'tenant_dashboard',
    landlord: 'landlord_dashboard',
    agent: 'agent_dashboard',
    lawyer: 'lawyer_dashboard',
    state_lawyer: 'state_lawyer_dashboard',
    super_lawyer: 'super_lawyer_dashboard',
    admin: 'admin_dashboard',
    lga_admin: 'lga_admin_dashboard',
    state_admin: 'state_admin_dashboard',
    financial_admin: 'financial_admin_dashboard',
    lga_financial_admin: 'lga_financial_admin_dashboard',
    state_financial_admin: 'state_financial_admin_dashboard',
    super_financial_admin: 'super_financial_admin_dashboard',
    lga_support_admin: 'lga_support_admin_dashboard',
    state_support_admin: 'state_support_admin_dashboard',
    super_support_admin: 'super_support_admin_dashboard',
    transportation_admin: 'transportation_admin_dashboard',
    lga_transportation_admin: 'lga_transportation_admin_dashboard',
    state_transportation_admin: 'state_transportation_admin_dashboard',
    super_transportation_admin: 'super_transportation_admin_dashboard',
    fumigation_admin: 'fumigation_admin_dashboard',
    lga_fumigation_admin: 'lga_fumigation_admin_dashboard',
    state_fumigation_admin: 'state_fumigation_admin_dashboard',
    super_fumigation_admin: 'super_fumigation_admin_dashboard',
    recruitment_admin: 'recruitment_admin_dashboard',
    super_admin: 'super_admin_dashboard',
  };
  return dashboardByRole[role] || 'admin_dashboard';
};

export const getTourDestinationForRole = (role, stepDefinition = {}) => {
  if (stepDefinition.destination?.name) {
    if (
      stepDefinition.destination.name === 'ServiceBookings' &&
      !stepDefinition.destination.params
    ) {
      return destination('ServiceBookings', {
        type: String(role || '').includes('fumigation') ? 'fumigation' : 'transportation',
      });
    }
    return stepDefinition.destination;
  }

  const normalizedRole = String(role || '').trim().toLowerCase();
  if (['tenant', 'user', 'landlord'].includes(normalizedRole)) {
    return destination('MainTabs', { screen: 'DashboardTab' });
  }
  if (normalizedRole === 'agent') return destination('AgentDashboard');
  if (['lawyer', 'state_lawyer', 'super_lawyer'].includes(normalizedRole)) return destination('LawyerDashboard');
  if (normalizedRole === 'super_admin') return destination('SuperAdminDashboard', {
    initialPanel: stepDefinition.id === 'super_trust'
      ? 'verifications'
      : stepDefinition.id === 'super_analytics'
        ? 'analytics'
        : 'overview',
  });
  if (normalizedRole === 'lga_financial_admin') return destination('LgaFinancialAdminDashboard');
  if (normalizedRole === 'super_financial_admin') return destination('SuperFinancialAdminDashboard');
  if (normalizedRole === 'financial_admin') return destination('FinancialAdminDashboard');
  if (['state_admin', 'state_financial_admin'].includes(normalizedRole)) return destination('StateAdminDashboard');
  if (normalizedRole === 'recruitment_admin') return destination('RecruitmentAdmin');
  if (
    normalizedRole.includes('support') ||
    normalizedRole.includes('transportation') ||
    normalizedRole.includes('fumigation')
  ) return destination('ServiceOperationsDashboard');
  return destination('AdminDashboard');
};
