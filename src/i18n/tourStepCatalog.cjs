/*
 * Compact, testable tour copy. Every supported locale must contain every ID.
 * Values are [title, description]; the localized title/description also serve
 * as the target label/hint so no English coach-mark copy can leak through.
 */
const TOUR_STEP_COPY = {
  en: {
    tenant_properties: ['Save and unlock properties', 'Build a shortlist, unlock full property details, and return to saved homes from My Hub.'],
    tenant_location: ['Open verified locations', 'Eligible property locations open in Maps after the required access or rent payment is confirmed.'],
    tenant_wallet: ['Wallet', 'Open More, then Wallet to see your balance and choose Fund Wallet or Withdraw Funds. Rent Savings has its own card.'],
    tenant_applications: ['Track every application', 'Open Applications to follow decisions, payments, and the next required action.'],
    tenant_services: ['Manage service bookings', 'Review transportation, cleaning, and fumigation bookings from their native workflow.'],
    tenant_messages: ['Continue secure conversations', 'Open Messages to speak with landlords and follow important rental updates.'],
    tenant_payments: ['Review payment records', 'Use Payment history to verify references, amounts, and transaction status.'],
    tenant_support: ['Get help when it matters', 'Open Support for account, property, payment, or safety guidance.'],
    landlord_listings: ['Manage your listings', 'Create properties, update availability, and review each listing from My Hub.'],
    landlord_applications: ['Review applications', 'Open the application workflow to approve, reject, or continue a tenant request.'],
    landlord_messages: ['Coordinate securely', 'Continue conversations with applicants and tenants in the message centre.'],
    landlord_wallet: ['Wallet', 'Open More, then Wallet for funding and withdrawals. Payment history remains a separate option.'],
    landlord_support: ['Reach platform support', 'Get help with listings, tenancies, payments, or account access.'],
    agent_assignment: ['Confirm your assignment', 'Check the landlord account and portfolio currently delegated to you.'],
    agent_properties: ['Operate the portfolio', 'Create, update, and manage assigned property listings.'],
    agent_commissions: ['Track commissions', 'Review earnings and transaction history in your commission workspace.'],
    agent_withdrawals: ['Request payouts', 'Submit a withdrawal request and follow its status.'],
    lawyer_cases: ['Manage active cases', 'Open assigned disputes, review status, and continue the legal workflow.'],
    lawyer_evidence: ['Review evidence', 'Inspect submitted evidence, verification data, and case details.'],
    lawyer_clients: ['Support your clients', 'Keep case information and client communication together.'],
    lawyer_verification: ['Verify case references', 'Confirm that a RentalHub case reference is authentic.'],
    admin_metrics: ['See what needs attention', 'Metrics surface users, properties, applications, and pending checks.'],
    admin_workspaces: ['Use focused workspaces', 'Open one administrative task at a time from the native workspace.'],
    admin_compliance: ['Verify evidence and compliance', 'Review paid evidence checks, risk, and trust records.'],
    admin_workflows: ['Complete local workflows', 'Handle property requests, assignments, tenancy controls, and recruitment.'],
    lga_admin_overview: ['See local operations clearly', 'Review the key operational totals for your assigned LGA.'],
    lga_admin_services: ['Open service workspaces', 'Move directly into transportation or fumigation operations.'],
    lga_admin_requests: ['Review property requests', 'Continue tenant property-request decisions for your LGA.'],
    lga_admin_tenancy: ['Manage tenancy controls', 'Handle eligible grace-period and refund controls.'],
    state_overview: ['Review your state overview', 'Start with users, commission health, and available funds.'],
    state_management: ['Open state tools', 'Continue approvals, migrations, and other state-level work.'],
    state_requests: ['Review property requests', 'Manage tenant property requests in the state workflow.'],
    state_tenancy: ['Use tenancy controls', 'Review eligible state grace-period and refund actions.'],
    financial_overview: ['Review financial health', 'See revenue, pending money, and completed transactions at a glance.'],
    financial_transactions: ['Inspect transactions', 'Open detailed payment and reconciliation records.'],
    financial_settlements: ['Manage payouts', 'Review withdrawals, commissions, settlements, and frozen funds.'],
    financial_reports: ['Follow revenue trends', 'Use focused reports to understand income and settlement performance.'],
    lga_financial_overview: ['Review commission health', 'See withdrawable commission, total earnings, and pending payouts.'],
    lga_financial_withdrawal: ['Request a secure payout', 'Start a verified commission withdrawal when eligible.'],
    lga_financial_history: ['Track withdrawal history', 'Follow each payout destination, date, and approval status.'],
    super_overview: ['Platform control, simplified', 'Start from the high-level control point before opening heavy modules.'],
    super_workspace: ['Choose a workspace', 'Search and open the exact platform tool you need.'],
    super_trust: ['Protect platform trust', 'Manage verification, fraud, reports, flags, and approvals.'],
    super_analytics: ['Track platform performance', 'Open analytics and audit views for detailed operating data.'],
    service_dashboard: ['Your service workspace', 'Review queue health and operations for your role and jurisdiction.'],
    service_bookings: ['Manage bookings', 'Review assignments, customer details, payments, and status changes.'],
    service_payments: ['Track service payments', 'Follow revenue, commissions, and payment status.'],
    support_tickets: ['Resolve support requests', 'Open user tickets, take ownership, and follow them to resolution.'],
    support_operations: ['Coordinate the support team', 'Open Admin Pool to review available support administrators and authorized assignment capacity.'],
    support_audit: ['Keep an audit trail', 'Review history and escalation context before sensitive actions.'],
    recruitment_overview: ['See the hiring picture', 'Review applicant volume, fees, interviews, and assessment scores.'],
    recruitment_filters: ['Find the right candidates', 'Filter Employment and Volunteer separately, then narrow by status, cycle, role or reference. Volunteer payment is Not Applicable.'],
    recruitment_candidates: ['Review candidate records', 'Review answers and shortlist or reject with the existing controls. Volunteers start with manual follow-up, without automatic interviews, employment or privileged accounts.'],
    recruitment_reports: ['Export hiring reports', 'Send a filtered candidate report through the secure workflow.'],
    tour_settings: ['Personalise and replay tours', 'Choose language and accessibility preferences, then replay this guide whenever you need it.'],
    tab_explore: ['Explore properties', 'Browse and search available rental properties around your preferred locations.'],
    tab_dashboard: ['My Hub', 'Your personal dashboard with stats, quick actions, wallet, and activity all in one place.'],
    tab_applications: ['Applications', 'Track every rental application, payment status, and next required action from this tab.'],
    tab_messages: ['Secure messages', 'Continue conversations with landlords, tenants, and support in one secure inbox.'],
    header_notifications: ['Notifications bell', 'Tap the bell to view admin reminders, verification requests, and system alerts.'],
    settings_profile_biometric: ['Profile and biometric login', 'Manage your name, phone, and enable fingerprint or face unlock for faster sign-in.'],
    settings_privacy: ['Privacy Policy', 'Review how RentalHub collects, uses, and protects your personal information.'],
    settings_terms: ['Terms of use', 'Read the agreement that governs your use of the RentalHub platform.'],
    settings_replay: ['Replay app tour', 'Restart the guided walkthrough to rediscover features and navigate with confidence.'],
    settings_reset: ['Reset local settings', 'Clear stored preferences and return the app to its default configuration.'],
    settings_account: ['Account deletion', 'Permanently remove your account and all associated data from RentalHub.'],
  },
  fr: {
    tenant_properties: ['Enregistrer et débloquer des biens', 'Créez une sélection, débloquez les détails et retrouvez vos logements enregistrés.'],
    tenant_location: ['Ouvrir les emplacements vérifiés', 'Les emplacements admissibles s’ouvrent dans Maps après la confirmation de l’accès ou du loyer.'],
    tenant_wallet: ['Portefeuille et épargne-loyer', 'Alimentez le portefeuille, retirez des fonds et créez un plan d’épargne-loyer.'],
    tenant_applications: ['Suivre chaque candidature', 'Ouvrez Candidatures pour suivre les décisions, paiements et prochaines actions.'],
    tenant_services: ['Gérer les réservations de services', 'Suivez transport, nettoyage et désinfection dans leur parcours natif.'],
    tenant_messages: ['Poursuivre les conversations sécurisées', 'Ouvrez Messages pour échanger avec les propriétaires et suivre les nouvelles.'],
    tenant_payments: ['Consulter les paiements', 'Vérifiez les références, montants et statuts dans l’historique.'],
    tenant_support: ['Obtenir de l’aide', 'Ouvrez Assistance pour les questions de compte, bien, paiement ou sécurité.'],
    landlord_listings: ['Gérer vos annonces', 'Créez des biens, actualisez leur disponibilité et consultez chaque annonce.'],
    landlord_applications: ['Examiner les candidatures', 'Approuvez, refusez ou poursuivez une demande de locataire.'],
    landlord_messages: ['Coordonner en sécurité', 'Échangez avec les candidats et locataires dans la messagerie.'],
    landlord_wallet: ['Paiements et retraits', 'Consultez soldes, historique, réserves et retraits.'],
    landlord_support: ['Contacter l’assistance', 'Obtenez de l’aide pour les annonces, locations, paiements ou accès.'],
    agent_assignment: ['Confirmer votre mission', 'Vérifiez le propriétaire et le portefeuille qui vous sont délégués.'],
    agent_properties: ['Gérer le portefeuille', 'Créez, modifiez et gérez les annonces attribuées.'],
    agent_commissions: ['Suivre les commissions', 'Consultez les revenus et transactions de commission.'],
    agent_withdrawals: ['Demander un versement', 'Envoyez une demande de retrait et suivez son statut.'],
    lawyer_cases: ['Gérer les dossiers actifs', 'Ouvrez les litiges attribués et poursuivez le parcours juridique.'],
    lawyer_evidence: ['Examiner les preuves', 'Consultez les preuves, vérifications et détails du dossier.'],
    lawyer_clients: ['Accompagner vos clients', 'Regroupez informations du dossier et échanges clients.'],
    lawyer_verification: ['Vérifier une référence', 'Confirmez l’authenticité d’une référence de dossier RentalHub.'],
    admin_metrics: ['Voir les priorités', 'Les indicateurs signalent utilisateurs, biens, candidatures et contrôles en attente.'],
    admin_workspaces: ['Utiliser des espaces ciblés', 'Ouvrez une tâche administrative à la fois.'],
    admin_compliance: ['Vérifier preuves et conformité', 'Contrôlez les preuves payées, les risques et les données de confiance.'],
    admin_workflows: ['Terminer les parcours locaux', 'Gérez demandes de biens, affectations, locations et recrutement.'],
    lga_admin_overview: ['Voir clairement les opérations locales', 'Consultez les totaux clés de votre LGA.'],
    lga_admin_services: ['Ouvrir les services', 'Accédez directement au transport ou à la désinfection.'],
    lga_admin_requests: ['Examiner les demandes de biens', 'Traitez les décisions locales des locataires.'],
    lga_admin_tenancy: ['Gérer les locations', 'Traitez les délais de grâce et remboursements admissibles.'],
    state_overview: ['Voir l’aperçu de l’État', 'Commencez par les utilisateurs, commissions et fonds disponibles.'],
    state_management: ['Ouvrir les outils de l’État', 'Poursuivez approbations, migrations et tâches régionales.'],
    state_requests: ['Examiner les demandes de biens', 'Gérez les demandes dans le parcours de l’État.'],
    state_tenancy: ['Utiliser les contrôles locatifs', 'Examinez les délais de grâce et remboursements admissibles.'],
    financial_overview: ['Examiner la santé financière', 'Voyez revenus, fonds en attente et transactions terminées.'],
    financial_transactions: ['Inspecter les transactions', 'Ouvrez les paiements détaillés et le rapprochement.'],
    financial_settlements: ['Gérer les versements', 'Examinez retraits, commissions, règlements et fonds gelés.'],
    financial_reports: ['Suivre les tendances de revenu', 'Analysez les revenus et performances de règlement.'],
    lga_financial_overview: ['Examiner les commissions', 'Voyez commission disponible, revenus et versements en attente.'],
    lga_financial_withdrawal: ['Demander un versement sécurisé', 'Démarrez un retrait de commission vérifié si vous êtes admissible.'],
    lga_financial_history: ['Suivre les retraits', 'Consultez destination, date et statut de chaque versement.'],
    super_overview: ['Contrôle simplifié de la plateforme', 'Commencez par la vue globale avant les modules détaillés.'],
    super_workspace: ['Choisir un espace', 'Recherchez et ouvrez l’outil exact dont vous avez besoin.'],
    super_trust: ['Protéger la confiance', 'Gérez vérification, fraude, signalements, alertes et approbations.'],
    super_analytics: ['Suivre les performances', 'Ouvrez les analyses et audits détaillés.'],
    service_dashboard: ['Votre espace de services', 'Consultez la file et les opérations de votre juridiction.'],
    service_bookings: ['Gérer les réservations', 'Examinez affectations, clients, paiements et changements de statut.'],
    service_payments: ['Suivre les paiements de service', 'Suivez revenus, commissions et statut des paiements.'],
    support_tickets: ['Résoudre les demandes', 'Ouvrez les tickets, prenez-les en charge et résolvez-les.'],
    support_operations: ['Coordonner les opérations', 'Traitez migrations, biens et demandes locatives.'],
    support_audit: ['Conserver une piste d’audit', 'Consultez historique et escalades avant une action sensible.'],
    recruitment_overview: ['Voir la situation du recrutement', 'Consultez candidats, frais, entretiens et évaluations.'],
    recruitment_filters: ['Trouver les bons candidats', 'Filtrez par statut, paiement, cycle, rôle, nom ou référence.'],
    recruitment_candidates: ['Examiner les candidats', 'Poursuivez présélection, approbation, rejet et rapports.'],
    recruitment_reports: ['Exporter les rapports', 'Envoyez un rapport filtré par le parcours sécurisé.'],
    tour_settings: ['Personnaliser et relancer les visites', 'Choisissez la langue et l’accessibilité, puis relancez ce guide à tout moment.'],
    tab_explore: ['Explorer les biens', 'Parcourez et recherchez les biens locatifs disponibles.'],
    tab_dashboard: ['Mon Hub', 'Votre tableau de bord avec statistiques, actions rapides et portefeuille.'],
    tab_applications: ['Candidatures', 'Suivez chaque candidature, statut de paiement et action suivante.'],
    tab_messages: ['Messages', 'Continuez vos conversations avec propriétaires et locataires.'],
    header_notifications: ['Cloche de notifications', 'Appuyez pour voir les rappels, vérifications et alertes système.'],
    settings_profile_biometric: ['Profil et connexion biométrique', 'Gérez votre nom, téléphone et activez le déverrouillage par empreinte.'],
    settings_privacy: ['Politique de confidentialité', 'Consultez comment RentalHub collecte et protège vos données.'],
    settings_terms: ['Conditions d\'utilisation', 'Lisez l\'accord régissant votre utilisation de RentalHub.'],
    settings_replay: ['Rejouer la visite guidée', 'Relancez la visite pour redécouvrir les fonctionnalités.'],
    settings_reset: ['Réinitialiser les paramètres', 'Effacez les préférences stockées et revenez à la configuration par défaut.'],
    settings_account: ['Suppression du compte', 'Supprimez définitivement votre compte et toutes vos données.'],
  },
  ar: {
    tenant_properties: ['حفظ العقارات وفتح تفاصيلها', 'أنشئ قائمة مختصرة وافتح التفاصيل وارجع إلى المنازل المحفوظة.'],
    tenant_location: ['فتح المواقع الموثقة', 'تُفتح المواقع المؤهلة في الخرائط بعد تأكيد الوصول أو دفع الإيجار المطلوب.'],
    tenant_wallet: ['المحفظة وادخار الإيجار', 'موّل محفظتك واسحب الرصيد وأنشئ خطة منظمة لادخار الإيجار.'],
    tenant_applications: ['متابعة كل طلب', 'افتح الطلبات لمتابعة القرارات والمدفوعات والإجراء التالي.'],
    tenant_services: ['إدارة حجوزات الخدمات', 'راجع حجوزات النقل والتنظيف والتعقيم في مسارها المخصص.'],
    tenant_messages: ['متابعة المحادثات الآمنة', 'افتح الرسائل للتواصل مع الملاك ومتابعة تحديثات الإيجار.'],
    tenant_payments: ['مراجعة سجلات الدفع', 'تحقق من المراجع والمبالغ وحالة المعاملة في سجل الدفع.'],
    tenant_support: ['الحصول على المساعدة', 'افتح الدعم للمساعدة في الحساب أو العقار أو الدفع أو السلامة.'],
    landlord_listings: ['إدارة إعلاناتك', 'أنشئ العقارات وحدّث توفرها وراجع كل إعلان.'],
    landlord_applications: ['مراجعة الطلبات', 'وافق على طلب المستأجر أو ارفضه أو تابع إجراءاته.'],
    landlord_messages: ['تنسيق آمن', 'تواصل مع المتقدمين والمستأجرين في مركز الرسائل.'],
    landlord_wallet: ['المدفوعات والسحوبات', 'راجع الأرصدة وسجل الدفع والاحتياطيات والسحوبات.'],
    landlord_support: ['التواصل مع الدعم', 'احصل على مساعدة للإعلانات والإيجارات والمدفوعات والوصول.'],
    agent_assignment: ['تأكيد مهمتك', 'تحقق من حساب المالك والمحفظة المفوضة إليك.'],
    agent_properties: ['إدارة المحفظة العقارية', 'أنشئ الإعلانات المخصصة وحدّثها وأدرها.'],
    agent_commissions: ['متابعة العمولات', 'راجع الأرباح والمعاملات في مساحة العمولات.'],
    agent_withdrawals: ['طلب دفعة', 'أرسل طلب سحب وتابع حالته.'],
    lawyer_cases: ['إدارة القضايا النشطة', 'افتح النزاعات المسندة وتابع المسار القانوني.'],
    lawyer_evidence: ['مراجعة الأدلة', 'افحص الأدلة وبيانات التحقق وتفاصيل القضية.'],
    lawyer_clients: ['دعم عملائك', 'اجمع معلومات القضية ومراسلات العميل في مكان واحد.'],
    lawyer_verification: ['التحقق من مرجع القضية', 'تأكد من صحة مرجع قضية RentalHub.'],
    admin_metrics: ['معرفة ما يحتاج الانتباه', 'تعرض المؤشرات المستخدمين والعقارات والطلبات والتحققات المعلقة.'],
    admin_workspaces: ['استخدام مساحات عمل مركزة', 'افتح مهمة إدارية واحدة في كل مرة.'],
    admin_compliance: ['التحقق من الأدلة والامتثال', 'راجع فحوص الأدلة المدفوعة والمخاطر وسجلات الثقة.'],
    admin_workflows: ['إكمال مسارات العمل المحلية', 'أدر طلبات العقارات والتعيينات والإيجارات والتوظيف.'],
    lga_admin_overview: ['رؤية العمليات المحلية بوضوح', 'راجع أهم إجماليات منطقة الإدارة المحلية.'],
    lga_admin_services: ['فتح مساحات الخدمات', 'انتقل مباشرة إلى عمليات النقل أو التعقيم.'],
    lga_admin_requests: ['مراجعة طلبات العقارات', 'تابع قرارات طلبات المستأجرين المحلية.'],
    lga_admin_tenancy: ['إدارة ضوابط الإيجار', 'عالج فترات السماح والاسترداد المؤهلة.'],
    state_overview: ['مراجعة نظرة الولاية', 'ابدأ بالمستخدمين وصحة العمولات والأموال المتاحة.'],
    state_management: ['فتح أدوات الولاية', 'تابع الموافقات وعمليات النقل والمهام على مستوى الولاية.'],
    state_requests: ['مراجعة طلبات العقارات', 'أدر طلبات المستأجرين ضمن مسار الولاية.'],
    state_tenancy: ['استخدام ضوابط الإيجار', 'راجع إجراءات السماح والاسترداد المؤهلة.'],
    financial_overview: ['مراجعة الصحة المالية', 'شاهد الإيرادات والأموال المعلقة والمعاملات المكتملة.'],
    financial_transactions: ['فحص المعاملات', 'افتح سجلات الدفع والتسوية التفصيلية.'],
    financial_settlements: ['إدارة الدفعات', 'راجع السحوبات والعمولات والتسويات والأموال المجمدة.'],
    financial_reports: ['متابعة اتجاهات الإيرادات', 'استخدم التقارير لفهم الدخل وأداء التسوية.'],
    lga_financial_overview: ['مراجعة صحة العمولات', 'شاهد العمولة المتاحة والأرباح والدفعات المعلقة.'],
    lga_financial_withdrawal: ['طلب دفعة آمنة', 'ابدأ سحب عمولة موثقة عند الأهلية.'],
    lga_financial_history: ['متابعة سجل السحب', 'تابع وجهة وتاريخ وحالة كل دفعة.'],
    super_overview: ['تحكم مبسط بالمنصة', 'ابدأ بنقطة التحكم العامة قبل فتح الوحدات التفصيلية.'],
    super_workspace: ['اختيار مساحة عمل', 'ابحث عن أداة المنصة المطلوبة وافتحها.'],
    super_trust: ['حماية ثقة المنصة', 'أدر التحقق والاحتيال والبلاغات والتنبيهات والموافقات.'],
    super_analytics: ['متابعة أداء المنصة', 'افتح التحليلات وسجلات التدقيق التفصيلية.'],
    service_dashboard: ['مساحة عمل خدماتك', 'راجع صحة قوائم الانتظار والعمليات في نطاقك.'],
    service_bookings: ['إدارة الحجوزات', 'راجع التعيينات والعملاء والمدفوعات وتغييرات الحالة.'],
    service_payments: ['متابعة مدفوعات الخدمات', 'تابع الإيرادات والعمولات وحالة الدفع.'],
    support_tickets: ['حل طلبات الدعم', 'افتح التذاكر وتولّها وتابعها حتى الحل.'],
    support_operations: ['تنسيق العمليات', 'عالج طلبات النقل والعقارات والإيجارات.'],
    support_audit: ['الاحتفاظ بسجل تدقيق', 'راجع السجل والتصعيد قبل الإجراءات الحساسة.'],
    recruitment_overview: ['رؤية صورة التوظيف', 'راجع عدد المتقدمين والرسوم والمقابلات والتقييمات.'],
    recruitment_filters: ['العثور على المرشحين المناسبين', 'صفِّ حسب الحالة والدفع والدورة والدور والاسم والمرجع.'],
    recruitment_candidates: ['مراجعة سجلات المرشحين', 'تابع الفرز والموافقة والرفض والتقارير.'],
    recruitment_reports: ['تصدير تقارير التوظيف', 'أرسل تقريرًا مصفى عبر المسار الآمن.'],
    tour_settings: ['تخصيص الجولات وإعادتها', 'اختر اللغة وخيارات سهولة الوصول، ثم أعد هذا الدليل متى شئت.'],
    tab_explore: ['استكشاف العقارات', 'تصفح وابحث عن العقارات المتاحة للإيجار.'],
    tab_dashboard: ['مركزي', 'لوحة تحكم شخصية مع الإحصائيات والإجراءات السريعة والمحفظة.'],
    tab_applications: ['الطلبات', 'تتبع كل طلب إيجار وحالة الدفع والإجراء المطلوب التالي.'],
    tab_messages: ['الرسائل', 'واصل المحادثات مع الملاك والمستأجرين والدعم.'],
    header_notifications: ['جرس الإشعارات', 'انقر لعرض التذكيرات وطلبات التحقق وتنبيهات النظام.'],
    settings_profile_biometric: ['الملف الشخصي وتسجيل الدخول البيومتري', 'أدر اسمك وهاتفك وفعّل بصمة الإصبع أو الوجه.'],
    settings_privacy: ['سياسة الخصوصية', 'راجع كيفية جمع RentalHub لمعلوماتك الشخصية واستخدامها وحمايتها.'],
    settings_terms: ['شروط الاستخدام', 'اقرأ الاتفاقية التي تحكم استخدامك لمنصة RentalHub.'],
    settings_replay: ['إعادة تشغيل الجولة', 'أعد تشغيل الجولة الإرشادية لاكتشاف الميزات.'],
    settings_reset: ['إعادة ضبط الإعدادات', 'امسح التفضيلات المخزنة وأعد التطبيق إلى الإعدادات الافتراضية.'],
    settings_account: ['حذف الحساب', 'احذف حسابك وجميع البيانات المرتبطة به من RentalHub بشكل دائم.'],
  },
  ru: {
    tenant_properties: ['Сохраняйте и открывайте объекты', 'Создавайте список, открывайте полные сведения и возвращайтесь к сохранённым домам.'],
    tenant_location: ['Открывайте проверенные адреса', 'Доступные адреса откроются в Картах после подтверждения доступа или оплаты аренды.'],
    tenant_wallet: ['Кошелёк и накопления', 'Пополняйте кошелёк, выводите средства и создавайте план накопления аренды.'],
    tenant_applications: ['Следите за заявками', 'Откройте Заявки, чтобы видеть решения, платежи и следующие действия.'],
    tenant_services: ['Управляйте заказами услуг', 'Проверяйте транспорт, уборку и обработку в нативном процессе.'],
    tenant_messages: ['Продолжайте безопасное общение', 'Откройте Сообщения для связи с арендодателями и важных обновлений.'],
    tenant_payments: ['Проверяйте платежи', 'Сверяйте номера, суммы и статусы в истории платежей.'],
    tenant_support: ['Получайте помощь', 'Откройте Поддержку по вопросам аккаунта, объекта, оплаты или безопасности.'],
    landlord_listings: ['Управляйте объявлениями', 'Создавайте объекты, меняйте доступность и проверяйте объявления.'],
    landlord_applications: ['Рассматривайте заявки', 'Одобряйте, отклоняйте или продолжайте заявку арендатора.'],
    landlord_messages: ['Общайтесь безопасно', 'Продолжайте диалоги с кандидатами и арендаторами.'],
    landlord_wallet: ['Платежи и выводы', 'Проверяйте балансы, историю, резервы и вывод средств.'],
    landlord_support: ['Свяжитесь с поддержкой', 'Получайте помощь с объявлениями, арендой, платежами и доступом.'],
    agent_assignment: ['Подтвердите назначение', 'Проверьте арендодателя и переданный вам портфель.'],
    agent_properties: ['Управляйте портфелем', 'Создавайте, обновляйте и ведите назначенные объекты.'],
    agent_commissions: ['Следите за комиссиями', 'Проверяйте доходы и операции в разделе комиссий.'],
    agent_withdrawals: ['Запрашивайте выплаты', 'Отправьте запрос на вывод и отслеживайте его статус.'],
    lawyer_cases: ['Ведите активные дела', 'Открывайте назначенные споры и продолжайте юридический процесс.'],
    lawyer_evidence: ['Проверяйте доказательства', 'Изучайте материалы, проверки и сведения о деле.'],
    lawyer_clients: ['Поддерживайте клиентов', 'Храните сведения о деле и общение с клиентом вместе.'],
    lawyer_verification: ['Проверяйте номер дела', 'Подтвердите подлинность номера дела RentalHub.'],
    admin_metrics: ['Смотрите приоритеты', 'Показатели выделяют пользователей, объекты, заявки и ожидающие проверки.'],
    admin_workspaces: ['Используйте рабочие разделы', 'Открывайте по одной административной задаче.'],
    admin_compliance: ['Проверяйте доказательства и соответствие', 'Изучайте оплаченные проверки, риски и записи доверия.'],
    admin_workflows: ['Выполняйте местные процессы', 'Обрабатывайте запросы, назначения, аренду и найм.'],
    lga_admin_overview: ['Видьте местные операции', 'Проверяйте ключевые показатели назначенного LGA.'],
    lga_admin_services: ['Открывайте службы', 'Переходите к транспорту или обработке.'],
    lga_admin_requests: ['Рассматривайте запросы объектов', 'Продолжайте местные решения по запросам арендаторов.'],
    lga_admin_tenancy: ['Управляйте арендой', 'Обрабатывайте доступные отсрочки и возвраты.'],
    state_overview: ['Проверяйте обзор штата', 'Начните с пользователей, комиссий и доступных средств.'],
    state_management: ['Открывайте инструменты штата', 'Продолжайте одобрения, миграции и региональные задачи.'],
    state_requests: ['Рассматривайте запросы объектов', 'Ведите запросы арендаторов на уровне штата.'],
    state_tenancy: ['Используйте контроль аренды', 'Проверяйте доступные отсрочки и возвраты.'],
    financial_overview: ['Оценивайте финансы', 'Смотрите доход, ожидающие средства и завершённые операции.'],
    financial_transactions: ['Проверяйте транзакции', 'Откройте подробные платежи и сверку.'],
    financial_settlements: ['Управляйте выплатами', 'Проверяйте выводы, комиссии, расчёты и замороженные средства.'],
    financial_reports: ['Следите за доходом', 'Используйте отчёты для анализа доходов и расчётов.'],
    lga_financial_overview: ['Проверяйте комиссии', 'Смотрите доступную комиссию, доход и ожидающие выплаты.'],
    lga_financial_withdrawal: ['Запрашивайте безопасную выплату', 'Начните проверенный вывод комиссии при наличии права.'],
    lga_financial_history: ['Следите за выводами', 'Проверяйте назначение, дату и статус каждой выплаты.'],
    super_overview: ['Упрощённое управление платформой', 'Начните с общего центра перед подробными модулями.'],
    super_workspace: ['Выберите рабочий раздел', 'Найдите и откройте нужный инструмент платформы.'],
    super_trust: ['Защищайте доверие', 'Управляйте проверками, мошенничеством, жалобами и одобрениями.'],
    super_analytics: ['Следите за эффективностью', 'Открывайте подробную аналитику и аудит.'],
    service_dashboard: ['Ваш раздел услуг', 'Проверяйте очередь и операции вашей юрисдикции.'],
    service_bookings: ['Управляйте заказами', 'Проверяйте назначения, клиентов, платежи и статусы.'],
    service_payments: ['Следите за оплатой услуг', 'Контролируйте доход, комиссии и статус оплаты.'],
    support_tickets: ['Решайте обращения', 'Открывайте заявки, берите их в работу и доводите до решения.'],
    support_operations: ['Координируйте операции', 'Обрабатывайте миграции, объекты и аренду.'],
    support_audit: ['Сохраняйте журнал аудита', 'Проверяйте историю и эскалации перед важными действиями.'],
    recruitment_overview: ['Смотрите картину найма', 'Проверяйте кандидатов, сборы, собеседования и оценки.'],
    recruitment_filters: ['Находите нужных кандидатов', 'Фильтруйте по статусу, оплате, циклу, роли, имени или номеру.'],
    recruitment_candidates: ['Проверяйте кандидатов', 'Продолжайте отбор, одобрение, отказ и отчётность.'],
    recruitment_reports: ['Экспортируйте отчёты', 'Отправляйте отфильтрованный отчёт через защищённый процесс.'],
    tour_settings: ['Настройте и повторите экскурсию', 'Выберите язык и параметры доступности, а затем повторите этот гид в любое время.'],
    tab_explore: ['Поиск недвижимости', 'Просматривайте и ищите доступное арендное жильё.'],
    tab_dashboard: ['Мой центр', 'Ваша личная панель со статистикой, быстрыми действиями и кошельком.'],
    tab_applications: ['Заявки', 'Отслеживайте заявки на аренду, статус оплаты и следующие шаги.'],
    tab_messages: ['Сообщения', 'Продолжайте переписку с арендодателями и арендаторами.'],
    header_notifications: ['Уведомления', 'Нажмите для просмотра напоминаний, проверок и системных оповещений.'],
    settings_profile_biometric: ['Профиль и биометрия', 'Управляйте именем, телефоном и включите вход по отпечатку.'],
    settings_privacy: ['Конфиденциальность', 'Ознакомьтесь с тем, как RentalHub собирает и защищает ваши данные.'],
    settings_terms: ['Условия использования', 'Прочтите соглашение, регулирующее использование RentalHub.'],
    settings_replay: ['Повторить тур', 'Перезапустите экскурсию для повторного знакомства с функциями.'],
    settings_reset: ['Сбросить настройки', 'Удалите сохранённые настройки и верните стандартную конфигурацию.'],
    settings_account: ['Удаление аккаунта', 'Навсегда удалите аккаунт и все связанные данные из RentalHub.'],
  },
  zh: {
    tenant_properties: ['收藏并解锁房源', '建立候选清单、解锁完整详情，并从“我的中心”返回已收藏房源。'],
    tenant_location: ['打开已验证位置', '确认所需访问权限或租金付款后，可在地图中打开符合条件的位置。'],
    tenant_wallet: ['钱包与租金储蓄', '为钱包充值、提取可用资金并创建有计划的租金储蓄。'],
    tenant_applications: ['跟踪每份申请', '打开“申请”查看决定、付款和下一项操作。'],
    tenant_services: ['管理服务预订', '在原生流程中查看交通、清洁和消杀预订。'],
    tenant_messages: ['继续安全沟通', '打开“消息”联系房东并关注重要租赁更新。'],
    tenant_payments: ['查看付款记录', '在付款历史中核对编号、金额和交易状态。'],
    tenant_support: ['在需要时获得帮助', '打开“支持”，获取账户、房源、付款或安全方面的帮助。'],
    landlord_listings: ['管理您的房源', '创建房源、更新可用状态并查看每条发布信息。'],
    landlord_applications: ['审核申请', '批准、拒绝或继续处理租客申请。'],
    landlord_messages: ['安全协调', '通过消息中心继续与申请人和租客沟通。'],
    landlord_wallet: ['付款与提现', '查看余额、付款历史、预留款和提现活动。'],
    landlord_support: ['联系平台支持', '获取房源、租约、付款或账户访问帮助。'],
    agent_assignment: ['确认您的委派', '核对当前委派给您的房东账户和房源组合。'],
    agent_properties: ['运营房源组合', '创建、更新和管理分配的房源。'],
    agent_commissions: ['跟踪佣金', '在佣金工作区查看收入和交易记录。'],
    agent_withdrawals: ['申请提现', '提交提现申请并跟踪状态。'],
    lawyer_cases: ['管理进行中的案件', '打开分配的争议并继续法律流程。'],
    lawyer_evidence: ['审查证据', '检查提交的证据、验证数据和案件详情。'],
    lawyer_clients: ['支持您的客户', '集中保存案件信息和客户沟通。'],
    lawyer_verification: ['验证案件编号', '确认 RentalHub 案件编号真实有效。'],
    admin_metrics: ['查看待处理事项', '指标会显示用户、房源、申请和待验证事项。'],
    admin_workspaces: ['使用专注工作区', '每次打开一项原生管理任务。'],
    admin_compliance: ['验证证据与合规', '查看已付款的证据验证、风险和信任记录。'],
    admin_workflows: ['完成本地流程', '处理房源请求、分配、租约控制和招聘。'],
    lga_admin_overview: ['清晰查看本地运营', '查看所负责 LGA 的关键运营总数。'],
    lga_admin_services: ['打开服务工作区', '直接进入交通或消杀运营。'],
    lga_admin_requests: ['审核房源请求', '继续处理本地租客房源请求。'],
    lga_admin_tenancy: ['管理租约控制', '处理符合条件的宽限期和退款。'],
    state_overview: ['查看州级概览', '从用户、佣金健康和可用资金开始。'],
    state_management: ['打开州级工具', '继续处理审批、迁移和其他州级工作。'],
    state_requests: ['审核房源请求', '在州级流程中管理租客房源请求。'],
    state_tenancy: ['使用租约控制', '查看符合条件的宽限期和退款操作。'],
    financial_overview: ['查看财务健康', '一览收入、待处理资金和已完成交易。'],
    financial_transactions: ['检查交易', '打开详细付款和对账记录。'],
    financial_settlements: ['管理付款', '查看提现、佣金、结算和冻结资金。'],
    financial_reports: ['跟踪收入趋势', '使用报告了解收入和结算表现。'],
    lga_financial_overview: ['查看佣金健康', '查看可提现佣金、总收入和待付款。'],
    lga_financial_withdrawal: ['申请安全付款', '符合条件时发起经验证的佣金提现。'],
    lga_financial_history: ['跟踪提现历史', '查看每笔付款的去向、日期和审批状态。'],
    super_overview: ['简化的平台控制', '先从高级控制中心开始，再打开详细模块。'],
    super_workspace: ['选择工作区', '搜索并打开所需的平台工具。'],
    super_trust: ['保护平台信任', '管理验证、欺诈、举报、标记和审批。'],
    super_analytics: ['跟踪平台表现', '打开详细分析和审计数据。'],
    service_dashboard: ['您的服务工作区', '查看所属角色和地区的队列健康与运营。'],
    service_bookings: ['管理预订', '查看分配、客户、付款和状态变化。'],
    service_payments: ['跟踪服务付款', '查看收入、佣金和付款状态。'],
    support_tickets: ['解决支持请求', '打开工单、接手并跟踪至解决。'],
    support_operations: ['协调运营', '处理迁移、房源和租约请求。'],
    support_audit: ['保留审计记录', '敏感操作前查看历史和升级背景。'],
    recruitment_overview: ['查看招聘全貌', '查看申请人数、费用、面试和评估分数。'],
    recruitment_filters: ['找到合适候选人', '按状态、付款、周期、职位、姓名或编号筛选。'],
    recruitment_candidates: ['审核候选人记录', '继续处理入围、批准、拒绝和报告。'],
    recruitment_reports: ['导出招聘报告', '通过安全流程发送筛选后的候选人报告。'],
    tour_settings: ['个性化并重播引导', '选择语言和无障碍偏好，并可随时重新开始此引导。'],
    tab_explore: ['探索房源', '浏览并搜索您首选位置附近的可用租赁房源。'],
    tab_dashboard: ['我的中心', '您的个人仪表板，包含统计、快捷操作和钱包。'],
    tab_applications: ['申请', '跟踪每个租赁申请、付款状态和下一步操作。'],
    tab_messages: ['消息', '继续与房东和租户的安全对话。'],
    header_notifications: ['通知铃', '点击查看管理员提醒、验证请求和系统警报。'],
    settings_profile_biometric: ['个人资料和生物识别登录', '管理姓名、电话，启用指纹或面部解锁。'],
    settings_privacy: ['隐私政策', '查看 RentalHub 如何收集、使用和保护您的个人信息。'],
    settings_terms: ['使用条款', '阅读管理您使用 RentalHub 平台的协议。'],
    settings_replay: ['重播导览', '重新启动引导式导览以重新发现功能。'],
    settings_reset: ['重置本地设置', '清除已存储的偏好设置，将应用恢复为默认配置。'],
    settings_account: ['删除账户', '从 RentalHub 永久删除您的账户及所有关联数据。'],
  },
};

const addedLocaleTitles={"ha":{"properties":"Gidaje","location":"Wurin gida","wallet":"Walat","applications":"Aikace-aikace","services":"Ayyuka","messages":"Saƙonni","payments":"Biyan kuɗi","support":"Tallafi","listings":"Jerin gidaje","assignment":"Aikin da aka ba ka","commissions":"Ladan aiki","withdrawals":"Cire kuɗi","cases":"Shari’o’i","evidence":"Shaida","clients":"Abokan ciniki","verification":"Tabbatarwa","metrics":"Ma’aunan aiki","workspaces":"Wuraren aiki","compliance":"Bin ƙa’ida","workflows":"Hanyoyin aiki","overview":"Taƙaitaccen bayani","requests":"Buƙatu","tenancy":"Haya","management":"Gudanarwa","transactions":"Cinikin kuɗi","settlements":"Biyan kuɗaɗe","reports":"Rahotanni","history":"Tarihi","workspace":"Wurin aiki","trust":"Amincewa","analytics":"Binciken bayanai","dashboard":"Allon ayyuka","bookings":"Ajiyar ayyuka","tickets":"Buƙatun tallafi","operations":"Gudanar da aiki","audit":"Binciken aiki","filters":"Tace bayanai","candidates":"Masu nema","settings":"Saituna","explore":"Nemo gidaje","notifications":"Sanarwa","profile_biometric":"Bayani da buɗewa da yatsa","privacy":"Sirri","terms":"Sharuɗɗa","replay":"Sake jagora","reset":"Sake saituna","account":"Asusu"},"yo":{"properties":"Àwọn ilé","location":"Ibi ilé","wallet":"Àpamọ́ owó","applications":"Àwọn ìbéèrè","services":"Àwọn iṣẹ́","messages":"Àwọn ifiranṣẹ́","payments":"Ìsanwó","support":"Ìrànlọ́wọ́","listings":"Àtòjọ ilé","assignment":"Iṣẹ́ tí a yàn","commissions":"Èrè iṣẹ́","withdrawals":"Yíyọ owó","cases":"Àwọn ọ̀ràn","evidence":"Ẹ̀rí","clients":"Àwọn oníbàárà","verification":"Ìjẹ́rìísí","metrics":"Ìwọ̀n iṣẹ́","workspaces":"Àwọn ibi iṣẹ́","compliance":"Ìtẹ̀lé òfin","workflows":"Ìlànà iṣẹ́","overview":"Àkótán","requests":"Àwọn ìbéèrè","tenancy":"Yíyálé","management":"Ìṣàkóso","transactions":"Ìṣòwò owó","settlements":"Ìpín owó","reports":"Àwọn ìròyìn","history":"Ìtàn","workspace":"Ibi iṣẹ́","trust":"Ìgbẹ́kẹ̀lé","analytics":"Ìtúpalẹ̀","dashboard":"Ojú iṣẹ́","bookings":"Àwọn ìfipamọ́ iṣẹ́","tickets":"Tíkẹ́ẹ̀tì ìrànlọ́wọ́","operations":"Àwọn iṣẹ́","audit":"Àyẹ̀wò","filters":"Àlẹ̀mọ́","candidates":"Àwọn olùbéèrè","settings":"Ètò","explore":"Wá ilé","notifications":"Ìfitónilétí","profile_biometric":"Àkọsílẹ̀ àti ìwọlé ààbò","privacy":"Ìpamọ́","terms":"Àwọn òfin","replay":"Tún ìtọ́sọ́nà ṣe","reset":"Tún ètò ṣe","account":"Àkọọ́lẹ̀"},"ig":{"properties":"Ụlọ","location":"Ebe ụlọ dị","wallet":"Akpa ego","applications":"Arịrịọ","services":"Ọrụ","messages":"Ozi","payments":"Ịkwụ ụgwọ","support":"Nkwado","listings":"Ndepụta ụlọ","assignment":"Ọrụ e kenyere","commissions":"Ụgwọ ọrụ","withdrawals":"Iwepụ ego","cases":"Okwu","evidence":"Ihe akaebe","clients":"Ndị ahịa","verification":"Nkwenye","metrics":"Ntụle ọrụ","workspaces":"Ebe ọrụ","compliance":"Ịgbaso iwu","workflows":"Usoro ọrụ","overview":"Nchịkọta","requests":"Arịrịọ","tenancy":"Mgbazinye ụlọ","management":"Njikwa","transactions":"Azụmahịa ego","settlements":"Nkesa ego","reports":"Akụkọ","history":"Akụkọ gara aga","workspace":"Ebe ọrụ","trust":"Ntụkwasị obi","analytics":"Nyocha","dashboard":"Ihu ọrụ","bookings":"Ndokwa ọrụ","tickets":"Tiketi nkwado","operations":"Ọrụ","audit":"Nyocha ọrụ","filters":"Ihe nzacha","candidates":"Ndị na-achọ","settings":"Ntọala","explore":"Chọọ ụlọ","notifications":"Ọkwa","profile_biometric":"Profaịlụ na nchekwa nbanye","privacy":"Nzuzo","terms":"Usoro ojiji","replay":"Malite nduzi ọzọ","reset":"Tọgharịa ntọala","account":"Akaụntụ"}};
const addedLocaleLead={"ha":"Yi amfani da maɓallin da aka nuna don duba da sarrafa ","yo":"Lo ohun tí a fi hàn láti wo àti ṣàkóso ","ig":"Jiri njikwa egosiri lelee ma jikwaa "};
for(const locale of Object.keys(addedLocaleTitles)){TOUR_STEP_COPY[locale]=TOUR_STEP_COPY[locale] || {};for(const id of Object.keys(TOUR_STEP_COPY.en)){if(TOUR_STEP_COPY[locale][id])continue;const key=Object.keys(addedLocaleTitles[locale]).sort((a,b)=>b.length-a.length).find(key=>id.endsWith(key));const title=addedLocaleTitles[locale][key] || addedLocaleTitles[locale].overview;TOUR_STEP_COPY[locale][id]=[title,addedLocaleLead[locale]+title+'.'];}}
const currentWorkflowCopy={"en":[["More dashboard tools","Open More to find Wallet, Disputes, Property Reports and Support."],["Your disputes","Use the separate Disputes card to open and track a dispute."],["Property reports","Use Property Reports to report a property issue and follow progress."],["Coverage assistance","Paid coverage is required for private assistance. Check coverage from Support; the assistant can help you troubleshoot first."]],"fr":[["Autres outils","Ouvrez Plus pour le portefeuille, les litiges, les signalements et le support."],["Vos litiges","Utilisez la carte Litiges pour ouvrir et suivre un litige."],["Signalements immobiliers","Signalez un problème immobilier et suivez son traitement."],["Assistance couverte","Une couverture payante est requise pour l’assistance privée. Consultez Support."]],"ar":[["المزيد من الأدوات","افتح المزيد للوصول إلى المحفظة والنزاعات وبلاغات العقارات والدعم."],["نزاعاتك","افتح بطاقة النزاعات المستقلة لتقديم النزاع ومتابعته."],["بلاغات العقارات","أبلغ عن مشكلة في العقار وتابع تقدمها."],["مساعدة التغطية","التغطية المدفوعة مطلوبة للمساعدة الخاصة. تحقق منها في الدعم."]],"ru":[["Другие инструменты","Откройте Ещё: кошелёк, споры, отчёты об объектах и поддержка."],["Ваши споры","Откройте отдельную карточку Споры для подачи и отслеживания."],["Сообщения об объектах","Сообщайте о проблемах с объектом и следите за решением."],["Помощь по покрытию","Для частной помощи нужно платное покрытие. Проверьте его в Поддержке."]],"zh":[["更多工具","打开更多以查看钱包、纠纷、房屋报告和支持。"],["我的纠纷","通过独立的纠纷卡片提交并跟进纠纷。"],["房屋报告","报告房屋问题并查看处理进度。"],["保障协助","私人协助需要付费保障。请在支持中查看保障状态。"]],"ha":[["Ƙarin kayan aiki","Buɗe Ƙari don walat, rigingimu, rahoton gida da tallafi."],["Rigingimunka","Buɗe katin Rigingimu don gabatarwa da bibiyar rigingimu."],["Rahoton gida","Bayar da rahoton matsalar gida kuma bi ci gabanta."],["Taimakon kariya","Ana buƙatar kariyar da aka biya don taimakon sirri. Duba Tallafi."]],"yo":[["Àwọn irinṣẹ́ míì","Ṣí Síi fún àpamọ́ owó, àríyànjiyàn, ìròyìn ilé àti ìrànlọ́wọ́."],["Àríyànjiyàn rẹ","Lo káàdì Àríyànjiyàn láti fi ọ̀ràn sílẹ̀ àti tọ́pa rẹ̀."],["Ìròyìn ilé","Jábọ̀ ìṣòro ilé kí o sì tọ́pa ìtẹ̀síwájú rẹ̀."],["Ìrànlọ́wọ́ ààbò","Ààbò tí a sanwó fún ṣe pàtàkì fún ìrànlọ́wọ́ àdáni. Ṣàyẹ̀wò Ìrànlọ́wọ́."]],"ig":[["Ngwa ndị ọzọ","Mepee More maka wallet, esemokwu, akụkọ ụlọ na nkwado."],["Esemokwu gị","Jiri kaadị Esemokwu tinye ma soro esemokwu gị."],["Akụkọ ụlọ","Kọọrọ nsogbu ụlọ ma soro ọganihu ya."],["Enyemaka mkpuchi","A chọrọ mkpuchi akwụ ụgwọ maka enyemaka nzuzo. Lelee Nkwado."]]};
for(const [locale,entries] of Object.entries(currentWorkflowCopy)){if(!TOUR_STEP_COPY[locale])continue;for(const role of ['tenant','landlord'])for(const [i,id]of ['more','disputes','reports','assistance'].entries())TOUR_STEP_COPY[locale][role+'_'+id]=entries[i];}
const publicCareerNames={"en":"Careers and volunteering","fr":"Carrières et bénévolat","ar":"الوظائف والتطوع","ru":"Карьера и волонтёрство","zh":"招聘与志愿服务","ha":"Aiki da sa kai","yo":"Iṣẹ́ àti iṣẹ́ àtinúwá","ig":"Ọrụ na ọrụ afọ ofufo"}, publicCareerDescriptions={"en":"Careers is public. Volunteer applications are free when enabled and do not automatically create staff accounts.","fr":"Le portail est public. Les candidatures bénévoles sont gratuites lorsqu’elles sont ouvertes et ne créent pas de compte employé.","ar":"البوابة عامة. طلبات التطوع مجانية عند فتحها ولا تُنشئ حسابات موظفين تلقائيًا.","ru":"Портал общедоступен. Заявки волонтёров бесплатны при открытом приёме и не создают учётные записи сотрудников.","zh":"招聘门户公开开放。志愿申请开放时免费，且不会自动创建员工账户。","ha":"Shafin aiki na kowa ne. Neman aikin sa kai kyauta ne idan an buɗe shi; ba ya ƙirƙirar asusun ma’aikaci kai tsaye.","yo":"Ojú iṣẹ́ wà fún gbogbo ènìyàn. Ìbéèrè iṣẹ́ àtinúwá jẹ́ ọ̀fẹ́ nígbà tí ó ṣí; kò dá àkọọ́lẹ̀ òṣìṣẹ́ sílẹ̀ fúnra rẹ̀.","ig":"Portal ọrụ bụ nke ọha. Arịrịọ ọrụ afọ ofufo bụ n’efu mgbe emepere ya; ọ naghị emepụta akaụntụ onye ọrụ ozugbo."},publicCasesCopy={"en":["Resolved dispute cases","Only anonymized case information is shown. Names, contact details and private case records are not published."],"fr":["Litiges résolus","Seules des informations anonymisées sont affichées. Les noms, coordonnées et dossiers privés ne sont pas publiés."],"ar":["قضايا النزاعات المحلولة","تُعرض معلومات مجهولة الهوية فقط، ولا تُنشر الأسماء أو بيانات الاتصال أو سجلات القضايا الخاصة."],"ru":["Разрешённые споры","Показаны только обезличенные сведения. Имена, контакты и частные материалы дел не публикуются."],"zh":["已解决的纠纷案例","仅展示匿名案例信息，不公开姓名、联系方式或私人案件记录。"],"ha":["Shari’o’in rikicin da aka warware","Bayanan da ba su bayyana mutum kawai ake nunawa. Ba a wallafa sunaye, lambobin tuntuɓa ko bayanan sirri."],"yo":["Àwọn ẹjọ́ àríyànjiyàn tí a yanjú","Àlàyé tí kò fi ẹni hàn nìkan la ń fi hàn. A kì í tẹ orúkọ, àlàyé ìbánisọ̀rọ̀ tàbí àkọsílẹ̀ ẹjọ́ àṣírí jáde."],"ig":["Ikpe esemokwu a doziri","A na-egosi naanị nkọwa na-enweghị njirimara. A naghị ebipụta aha, ozi kọntaktị ma ọ bụ ndekọ ikpe nzuzo."]};
for(const locale of Object.keys(TOUR_STEP_COPY)){TOUR_STEP_COPY[locale].public_careers=[publicCareerNames[locale],publicCareerDescriptions[locale]];TOUR_STEP_COPY[locale].public_cases=publicCasesCopy[locale];}
const walletWorkflowCopy={"en":["Wallet","Open More, then Wallet to fund it or withdraw available funds. Rent Savings and Payment History are separate tools."],"fr":["Portefeuille","Ouvrez Plus puis Portefeuille pour ajouter ou retirer des fonds disponibles. L’épargne-loyer et l’historique sont séparés."],"ar":["المحفظة","افتح المزيد ثم المحفظة للإيداع أو سحب الرصيد المتاح. ادخار الإيجار وسجل المدفوعات أداتان منفصلتان."],"ru":["Кошелёк","Откройте Ещё, затем Кошелёк для пополнения или вывода доступных средств. Накопления и история платежей находятся отдельно."],"zh":["钱包","打开更多，再选择钱包进行充值或提取可用余额。租金储蓄和付款记录为独立工具。"],"ha":["Walat","Buɗe Ƙari sannan Walat don saka kuɗi ko cire kuɗin da ake da su. Ajiyar haya da tarihin biyan kuɗi suna da nasu kayan aiki."],"yo":["Àpamọ́ owó","Ṣí Síi, lẹ́yìn náà Àpamọ́ owó láti fi owó kún un tàbí yọ owó tó wà. Àfiṣowó ilé àti ìtàn ìsanwó yàtọ̀ sí i."],"ig":["Akpa ego","Mepee More, wee Wallet ka ị tinye ego ma ọ bụ wepụ ego dị. Nchekwa ego mgbazinye na akụkọ ịkwụ ụgwọ bụ ngwa dị iche."]};
for(const [locale,copy]of Object.entries(walletWorkflowCopy)){TOUR_STEP_COPY[locale].tenant_wallet=copy;TOUR_STEP_COPY[locale].landlord_wallet=copy;}
const adminRefreshCopy = {
  "en": [
    [
      "Manage platform users",
      "Review user records and roles before changing account access."
    ],
    [
      "Review property requests",
      "Review incoming tenant requests before state assignment; check payment, follow-up and matching progress."
    ],
    [
      "Manage pricing",
      "Review location-based pricing rules before saving any change."
    ],
    [
      "Review administrator approvals",
      "Check the requested role and jurisdiction before granting administrative access."
    ],
    [
      "Control registration access",
      "Manage registration availability by State and LGA; this is separate from recruitment intake."
    ],
    [
      "Employment and volunteer opportunities",
      "Manage opportunity type and cycle. Volunteer intake is independent, free, and reviewed manually without automatic staff accounts."
    ]
  ],
  "fr": [
    [
      "Gérer les utilisateurs",
      "Vérifiez les dossiers et les rôles avant de modifier les accès."
    ],
    [
      "Examiner les demandes de logement",
      "Examinez les demandes avant leur affectation à un État ; vérifiez paiement, suivi et correspondances."
    ],
    [
      "Gérer les tarifs",
      "Vérifiez les tarifs par zone avant toute modification."
    ],
    [
      "Approuver les administrateurs",
      "Vérifiez rôle et juridiction avant d’accorder un accès administratif."
    ],
    [
      "Contrôler les inscriptions",
      "Gérez les inscriptions par État et zone locale, séparément du recrutement."
    ],
    [
      "Emploi et bénévolat",
      "Gérez type et cycle. Le bénévolat possède son propre accès gratuit et une revue manuelle sans compte de personnel automatique."
    ]
  ],
  "ar": [
    [
      "إدارة المستخدمين",
      "راجع سجلات المستخدمين وأدوارهم قبل تعديل صلاحيات الحساب."
    ],
    [
      "مراجعة طلبات العقارات",
      "راجع طلبات المستأجرين قبل إسنادها إلى فريق الولاية وتحقق من الدفع والمتابعة والمطابقة."
    ],
    [
      "إدارة الأسعار",
      "راجع قواعد الأسعار حسب الموقع قبل حفظ أي تغيير."
    ],
    [
      "مراجعة موافقات المسؤولين",
      "تحقق من الدور والنطاق قبل منح صلاحيات إدارية."
    ],
    [
      "إدارة التسجيل",
      "تحكم في التسجيل حسب الولاية والمنطقة المحلية بصورة مستقلة عن التوظيف."
    ],
    [
      "فرص العمل والتطوع",
      "حدد النوع والدورة. التطوع مجاني وله تحكم مستقل ومراجعة يدوية دون إنشاء حساب موظف تلقائياً."
    ]
  ],
  "ru": [
    [
      "Управление пользователями",
      "Проверьте записи и роли перед изменением доступа."
    ],
    [
      "Заявки на поиск жилья",
      "Проверяйте заявки арендаторов до передачи команде штата, включая оплату, сопровождение и подбор."
    ],
    [
      "Управление ценами",
      "Проверяйте тарифы по местоположению перед сохранением изменений."
    ],
    [
      "Одобрение администраторов",
      "Проверьте роль и территорию перед предоставлением доступа."
    ],
    [
      "Доступ к регистрации",
      "Управляйте регистрацией по штату и району отдельно от набора кандидатов."
    ],
    [
      "Работа и волонтёрство",
      "Укажите тип и цикл. Волонтёрство бесплатно, включается отдельно и требует ручной проверки без автоматического создания учётной записи сотрудника."
    ]
  ],
  "zh": [
    [
      "管理平台用户",
      "更改账户权限前，请核对用户记录和角色。"
    ],
    [
      "审核找房申请",
      "分配到州团队前审核租客申请，检查付款、跟进和房源匹配进度。"
    ],
    [
      "管理价格",
      "保存更改前，请审核各地区的定价规则。"
    ],
    [
      "审核管理员申请",
      "授予管理权限前，请核对所申请的角色和辖区。"
    ],
    [
      "管理注册权限",
      "按州和地方辖区管理注册开放情况，与招聘开关相互独立。"
    ],
    [
      "就业与志愿者机会",
      "管理机会类型和招聘周期。志愿者申请独立开放、免费、人工审核，不会自动建立员工账户。"
    ]
  ],
  "ha": [
    [
      "Gudanar da masu amfani",
      "Duba bayanai da matsayin mai amfani kafin canza damar asusu."
    ],
    [
      "Duba buƙatun gidaje",
      "Duba buƙatun masu haya kafin tura wa jihar; tabbatar da biyan kuɗi, bibiyar aiki da daidaita gida."
    ],
    [
      "Gudanar da farashi",
      "Duba farashin kowane yanki kafin adana canji."
    ],
    [
      "Amincewa da masu gudanarwa",
      "Tabbatar da matsayi da yankin aiki kafin ba da damar gudanarwa."
    ],
    [
      "Sarrafa rajista",
      "Sarrafa rajista ta jiha da ƙaramar hukuma dabam da ɗaukar ma’aikata."
    ],
    [
      "Aiki da sa kai",
      "Saita nau’i da zagaye. Aikin sa kai kyauta ne, yana da nasa kunnawa kuma ana duba shi da hannu ba tare da ƙirƙirar asusun ma’aikaci kai tsaye ba."
    ]
  ],
  "yo": [
    [
      "Ṣàkóso àwọn olùlò",
      "Ṣàyẹ̀wò àkọsílẹ̀ àti ipò olùlò kí o tó yí àṣẹ àkọọ́lẹ̀ padà."
    ],
    [
      "Ṣàyẹ̀wò ìbéèrè ilé",
      "Ṣàyẹ̀wò ìbéèrè ayálégbé kí o tó fi rán ẹgbẹ́ ìpínlẹ̀; ṣàyẹ̀wò ìsanwó, ìtẹ̀lé àti ilé tó bá mu."
    ],
    [
      "Ṣàkóso iye owó",
      "Ṣàyẹ̀wò iye owó agbègbè kí o tó fi àyípadà pamọ́."
    ],
    [
      "Fọwọ́sí alábòójútó",
      "Ṣàyẹ̀wò ipò àti agbègbè iṣẹ́ kí o tó fúnni ní àṣẹ."
    ],
    [
      "Ṣàkóso ìforúkọsílẹ̀",
      "Ṣàkóso ìforúkọsílẹ̀ ní ìpínlẹ̀ àti ìjọba ìbílẹ̀ lọ́tọ̀ sí gbígba òṣìṣẹ́."
    ],
    [
      "Iṣẹ́ àti ìyọ̀ǹda",
      "Yan irú àti àsìkò. Ìyọ̀ǹda jẹ́ ọ̀fẹ́, ó ní ètò tirẹ̀ àti àyẹ̀wò ènìyàn láì dá àkọọ́lẹ̀ òṣìṣẹ́ sílẹ̀ fúnra rẹ̀."
    ]
  ],
  "ig": [
    [
      "Jikwaa ndị ọrụ",
      "Lelee ndekọ na ọrụ onye ọrụ tupu ịgbanwe ikike akaụntụ."
    ],
    [
      "Nyochaa arịrịọ ụlọ",
      "Nyochaa arịrịọ ndị bi n’ụlọ tupu ikenye ha otu steeti; lelee ịkwụ ụgwọ, nsonye na ịchọta ụlọ dabara."
    ],
    [
      "Jikwaa ọnụahịa",
      "Lelee ọnụahịa mpaghara tupu ịchekwa mgbanwe."
    ],
    [
      "Kwado ndị nchịkwa",
      "Lelee ọrụ na mpaghara tupu inye ikike nchịkwa."
    ],
    [
      "Jikwaa ndebanye aha",
      "Jikwaa ndebanye aha site na steeti na mpaghara gọọmenti, iche na nnabata ọrụ."
    ],
    [
      "Ọrụ na afọ ofufo",
      "Họrọ ụdị na oge. Afọ ofufo bụ n’efu, nwere njikwa nke ya na nyocha mmadụ, ọ naghị emepụta akaụntụ onye ọrụ ozugbo."
    ]
  ]
};
const adminRefreshIds = ["super_users","super_requests","super_pricing","super_approvals","super_access","recruitment_opportunities"];
for (const [locale, rows] of Object.entries(adminRefreshCopy)) {
  adminRefreshIds.forEach((id, index) => { TOUR_STEP_COPY[locale][id] = rows[index]; });
}
const zonalRefreshCopy = {
  "en": [
    [
      "Zone overview",
      "Review users, properties, applications and escalations in your assigned zone."
    ],
    [
      "Zonal workspaces",
      "Open zone records, administrators and service operations within your authorized scope."
    ],
    [
      "States in your zone",
      "Compare state activity and confirm your assigned territory before taking action."
    ]
  ],
  "fr": [
    [
      "Aperçu de la zone",
      "Examinez utilisateurs, biens, candidatures et escalades de votre zone."
    ],
    [
      "Espaces de la zone",
      "Ouvrez les dossiers, administrateurs et services dans votre périmètre autorisé."
    ],
    [
      "États de votre zone",
      "Comparez les États et vérifiez votre territoire avant toute action."
    ]
  ],
  "ar": [
    [
      "نظرة عامة على المنطقة",
      "راجع المستخدمين والعقارات والطلبات والتصعيدات ضمن منطقتك."
    ],
    [
      "مساحات عمل المنطقة",
      "افتح سجلات المنطقة والمسؤولين والخدمات ضمن صلاحياتك."
    ],
    [
      "ولايات منطقتك",
      "قارن نشاط الولايات وتأكد من نطاقك قبل اتخاذ إجراء."
    ]
  ],
  "ru": [
    [
      "Обзор зоны",
      "Просматривайте пользователей, объекты, заявки и эскалации своей зоны."
    ],
    [
      "Рабочие разделы зоны",
      "Открывайте записи, администраторов и услуги в пределах своих полномочий."
    ],
    [
      "Штаты вашей зоны",
      "Сравните активность штатов и проверьте территорию перед действием."
    ]
  ],
  "zh": [
    [
      "区域概览",
      "查看负责区域内的用户、房源、申请和升级处理。"
    ],
    [
      "区域工作区",
      "在授权范围内打开区域记录、管理员和服务运营。"
    ],
    [
      "区域内的州",
      "比较各州活动，并在操作前确认负责范围。"
    ]
  ],
  "ha": [
    [
      "Taƙaitaccen yankin",
      "Duba masu amfani, gidaje, aikace-aikace da buƙatun da aka ɗaga a yankinka."
    ],
    [
      "Wuraren aikin yanki",
      "Buɗe bayanai, masu gudanarwa da ayyukan yankinka cikin ikon da aka ba ka."
    ],
    [
      "Jihohin yankinka",
      "Kwatanta ayyukan jihohi kuma tabbatar da yankinka kafin ɗaukar mataki."
    ]
  ],
  "yo": [
    [
      "Àkótán agbègbè",
      "Ṣàyẹ̀wò àwọn olùlò, ilé, ìbéèrè àti ọ̀ràn tí a gbé sókè ní agbègbè rẹ."
    ],
    [
      "Àwọn ibi iṣẹ́ agbègbè",
      "Ṣí àkọsílẹ̀, alábòójútó àti iṣẹ́ ní agbègbè tí o ní àṣẹ sí."
    ],
    [
      "Àwọn ìpínlẹ̀ agbègbè rẹ",
      "Fi iṣẹ́ àwọn ìpínlẹ̀ wé ara wọn, kí o sì jẹ́rìí sí agbègbè rẹ kí o tó ṣe ìgbésẹ̀."
    ]
  ],
  "ig": [
    [
      "Nchịkọta mpaghara",
      "Lelee ndị ọrụ, ụlọ, arịrịọ na okwu e buliri elu n’ime mpaghara gị."
    ],
    [
      "Ebe ọrụ mpaghara",
      "Mepee ndekọ, ndị nchịkwa na ọrụ n’ime ikike e nyere gị."
    ],
    [
      "Steeti mpaghara gị",
      "Tụlee ọrụ steeti ma gosi mpaghara gị tupu ime ihe."
    ]
  ]
};
for(const [locale, rows] of Object.entries(zonalRefreshCopy)){["zonal_overview","zonal_workspaces","zonal_scope"].forEach((id,index)=>{TOUR_STEP_COPY[locale][id]=rows[index];});}
const marketingTourCopy = {
  "en": [
    [
      "Capture a survey",
      "Open Conduct Survey to record a respondent using the existing survey flow."
    ],
    [
      "Review captured responses",
      "Check captured and in-progress survey counts before following up."
    ]
  ],
  "fr": [
    [
      "Saisir une enquête",
      "Ouvrez le formulaire pour enregistrer un répondant dans le parcours existant."
    ],
    [
      "Examiner les réponses",
      "Vérifiez les enquêtes saisies et en cours avant le suivi."
    ]
  ],
  "ar": [
    [
      "تسجيل استبيان",
      "افتح إجراء استبيان لتسجيل إجابات المشارك عبر النموذج الحالي."
    ],
    [
      "مراجعة الإجابات",
      "تحقق من الاستبيانات المسجلة وقيد التنفيذ قبل المتابعة."
    ]
  ],
  "ru": [
    [
      "Записать опрос",
      "Откройте форму опроса для записи ответов участника."
    ],
    [
      "Проверить ответы",
      "Проверьте завершённые и текущие опросы перед дальнейшей работой."
    ]
  ],
  "zh": [
    [
      "录入问卷",
      "打开问卷表单，通过现有流程记录受访者回答。"
    ],
    [
      "查看问卷记录",
      "跟进前请核对已录入和进行中的问卷数量。"
    ]
  ],
  "ha": [
    [
      "Cika bincike",
      "Buɗe Conduct Survey don rubuta amsoshin mutum a tsarin binciken da ake da shi."
    ],
    [
      "Duba amsoshin bincike",
      "Duba adadin binciken da aka cika da waɗanda ke gudana kafin bibiyar aiki."
    ]
  ],
  "yo": [
    [
      "Ṣe ìwádìí",
      "Ṣí Conduct Survey láti gba ìdáhùn ẹni nínú ìlànà ìwádìí tó wà."
    ],
    [
      "Ṣàyẹ̀wò àwọn ìdáhùn",
      "Ṣàyẹ̀wò iye ìwádìí tí a gba àti èyí tí ń lọ kí o tó tẹ̀lé e."
    ]
  ],
  "ig": [
    [
      "Dee nyocha",
      "Mepee Conduct Survey ka ị dekọọ azịza mmadụ site n’usoro nyocha dị."
    ],
    [
      "Lelee azịza",
      "Lelee ọnụọgụ nyocha e dekọrọ na ndị ka na-aga tupu nsonye."
    ]
  ]
};
for(const [locale, rows] of Object.entries(marketingTourCopy)){["marketing_capture","marketing_metrics"].forEach((id,index)=>{TOUR_STEP_COPY[locale][id]=rows[index];});}
const clientAssignmentCopy = {"en":"Review the properties and clients you are authorized to represent, then open a property to inspect its disputes.","fr":"Examinez les biens et clients autorisés, puis ouvrez un bien pour consulter ses litiges.","ar":"راجع العقارات والعملاء المصرح لك بتمثيلهم ثم افتح العقار للاطلاع على نزاعاته.","ru":"Просмотрите разрешённые вам объекты и клиентов, затем откройте объект для проверки споров.","zh":"查看有权代理的房源与客户，然后打开房源查看相关争议。","ha":"Duba gidaje da abokan ciniki da aka ba ka izinin wakilta, sannan buɗe gida don duba rikicinsa.","yo":"Ṣàyẹ̀wò àwọn ilé àti oníbàárà tí o ní àṣẹ láti ṣojú, lẹ́yìn náà ṣí ilé láti wo ọ̀ràn rẹ̀.","ig":"Lelee ụlọ na ndị ahịa e nyere gị ikike ịnọchite, wee mepee ụlọ ka ị lelee esemokwu ya."};
for(const [locale, description] of Object.entries(clientAssignmentCopy)){TOUR_STEP_COPY[locale].lawyer_clients[1]=description;}
const TOUR_STEP_IDS = Object.freeze(Object.keys(TOUR_STEP_COPY.en));

module.exports = { TOUR_STEP_COPY, TOUR_STEP_IDS };
