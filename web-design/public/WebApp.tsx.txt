import React, { useMemo, useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Bookmark,
  CheckCircle2,
  FileText,
  PiggyBank,
  Truck,
  Sparkles,
  Scale,
  Wallet,
  Plus,
  ArrowUpRight,
  Bell,
  Globe,
  UserCheck,
  Video,
  Lock,
  Unlock,
  Calculator,
  PhoneCall,
  AlertTriangle,
  ChevronRight,
  Download,
  X,
} from 'lucide-react';
import {
  INITIAL_PROPERTIES,
  INITIAL_SAVINGS_GOALS,
  INITIAL_SERVICE_BOOKINGS,
  INITIAL_TENANCY_AGREEMENTS,
  LanguageCode,
  NIGERIAN_STATES,
  PropertyItem,
  SUPPORTED_LANGUAGES,
  SavingsGoalItem,
  ServiceBookingItem,
  TenancyAgreementItem,
  UI_COPY,
  VERIFIED_LAWYERS,
} from './data/mockRentalHubData';

type ActiveTab = 'explore' | 'hub' | 'tenancy' | 'savings' | 'services';
type UserRole = 'tenant' | 'landlord' | 'agent' | 'lawyer';

const REGISTRATION_DRAFT_STORAGE_KEY = 'rentalhub_registration_draft_v1';
const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const formatNaira = (amount: number) => `₦${Number(amount || 0).toLocaleString()}`;

export default function WebApp() {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [role, setRole] = useState<UserRole>('tenant');
  const [ninVerified, setNinVerified] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(1850000);

  // Explore state
  const [properties, setProperties] = useState<PropertyItem[]>(INITIAL_PROPERTIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Tenancy & Legal state
  const [agreements, setAgreements] = useState<TenancyAgreementItem[]>(INITIAL_TENANCY_AGREEMENTS);
  const [agreementFilter, setAgreementFilter] = useState<string>('all');
  const [selectedAgreement, setSelectedAgreement] = useState<TenancyAgreementItem | null>(null);
  const [caseVerifyInput, setCaseVerifyInput] = useState<string>('AGR-2026-0891');
  const [caseVerifyResult, setCaseVerifyResult] = useState<string | null>(null);

  // Rent Savings & Calculator state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalItem[]>(INITIAL_SAVINGS_GOALS);
  const [calcTargetRent, setCalcTargetRent] = useState<number>(6000000);
  const [calcMonths, setCalcMonths] = useState<number>(10);
  const [calcIncome, setCalcIncome] = useState<number>(1200000);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('4500000');
  const [newGoalFrequency, setNewGoalFrequency] = useState<'Monthly' | 'Weekly'>('Monthly');

  // Move & Care Services state
  const [serviceBookings, setServiceBookings] = useState<ServiceBookingItem[]>(INITIAL_SERVICE_BOOKINGS);
  const [bookingCategory, setBookingCategory] = useState<'transportation' | 'fumigation'>('transportation');
  const [bookingPickup, setBookingPickup] = useState('Lekki Phase 1, Lagos');
  const [bookingDestination, setBookingDestination] = useState('Ikoyi, Lagos');
  const [bookingDate, setBookingDate] = useState('2026-11-10');

  // Modals & notifications
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle?: string } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState<'fund' | 'withdraw' | null>(null);
  const [walletAmountInput, setWalletAmountInput] = useState('250000');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showListPropertyModal, setShowListPropertyModal] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropState, setNewPropState] = useState('Lagos');
  const [newPropArea, setNewPropArea] = useState('Lekki Phase 1');
  const [newPropPrice, setNewPropPrice] = useState('5500000');
  const [newPropBeds, setNewPropBeds] = useState('3');

  // Registration modal with silent 24-hour draft persistence (passwords & identity numbers never saved)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState(() => {
    const defaults = {
      user_type: 'tenant' as 'tenant' | 'landlord',
      full_name: '',
      email: '',
      phone: '',
      lawyer_email: '',
      state_name: 'Lagos',
      lga_name: 'Lekki Phase 1',
      referral_code: '',
      nin: '',
      password: '',
      confirm_password: '',
    };
    try {
      const raw = window.localStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const savedAt = Number(parsed?.savedAt || 0);
      if (!savedAt || Date.now() - savedAt >= REGISTRATION_DRAFT_TTL_MS) {
        window.localStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
        return defaults;
      }
      const d = parsed?.form || {};
      return {
        ...defaults,
        user_type: d.user_type === 'landlord' ? 'landlord' : 'tenant',
        full_name: String(d.full_name || ''),
        email: String(d.email || ''),
        phone: String(d.phone || ''),
        lawyer_email: String(d.lawyer_email || ''),
        state_name: String(d.state_name || 'Lagos'),
        lga_name: String(d.lga_name || 'Lekki Phase 1'),
        referral_code: String(d.referral_code || ''),
        nin: '',
        password: '',
        confirm_password: '',
      };
    } catch {
      return defaults;
    }
  });

  React.useEffect(() => {
    try {
      const payload = {
        savedAt: Date.now(),
        form: {
          user_type: regForm.user_type,
          full_name: regForm.full_name,
          email: regForm.email,
          phone: regForm.phone,
          lawyer_email: regForm.lawyer_email,
          state_name: regForm.state_name,
          lga_name: regForm.lga_name,
          referral_code: regForm.referral_code,
        },
      };
      window.localStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [
    regForm.user_type,
    regForm.full_name,
    regForm.email,
    regForm.phone,
    regForm.lawyer_email,
    regForm.state_name,
    regForm.lga_name,
    regForm.referral_code,
  ]);

  const [applications, setApplications] = useState<
    { id: string; propertyTitle: string; location: string; status: string; date: string }[]
  >([
    {
      id: 'APP-309',
      propertyTitle: '4-Bedroom Serviced Terrace Duplex with BQ',
      location: 'Lekki Phase 1, Lagos',
      status: 'Approved — Tenancy Ready',
      date: '29 Oct 2026',
    },
  ]);

  const copy = UI_COPY[language] || UI_COPY.en;
  const isRTL = language === 'ar';

  const triggerToast = (title: string, subtitle?: string) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage((current) => (current?.title === title ? null : current));
    }, 3600);
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      if (savedOnly && !item.saved) return false;
      if (selectedState !== 'All' && item.state_name !== selectedState) return false;
      if (selectedType !== 'all' && item.property_type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.title} ${item.state_name} ${item.city} ${item.area} ${item.full_address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [properties, savedOnly, selectedState, selectedType, searchQuery]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const totalSavedAcrossPlans = useMemo(
    () => savingsGoals.reduce((sum, item) => sum + item.total_saved, 0),
    [savingsGoals]
  );

  const toggleSaveProperty = (id: string) => {
    setProperties((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextSaved = !item.saved;
        triggerToast(
          nextSaved ? 'Home saved to My Hub' : 'Removed from saved homes',
          item.title
        );
        return { ...item, saved: nextSaved };
      })
    );
  };

  const unlockPropertyDetails = (id: string) => {
    const unlockFee = 5000;
    if (walletBalance < unlockFee) {
      triggerToast('Insufficient wallet balance', 'Fund your wallet to unlock verified address & landlord contact.');
      return;
    }
    setWalletBalance((b) => b - unlockFee);
    setProperties((prev) =>
      prev.map((item) => (item.id === id ? { ...item, details_unlocked: true } : item))
    );
    triggerToast('Full property dossier unlocked', '₦5,000 deducted from wallet • Street address & lawyer details visible.');
  };

  const submitRentalApplication = (property: PropertyItem) => {
    if (applications.some((a) => a.propertyTitle === property.title)) {
      triggerToast('Application already submitted', 'Track status in My Hub.');
      return;
    }
    setApplications((prev) => [
      {
        id: `APP-${Math.floor(400 + Math.random() * 500)}`,
        propertyTitle: property.title,
        location: `${property.area}, ${property.state_name}`,
        status: 'Under Lawyer & Landlord Review',
        date: 'Today',
      },
      ...prev,
    ]);
    triggerToast('Application submitted!', `Sent to ${property.landlord_name} and ${property.lawyer_name}.`);
  };

  const handleSignAgreement = (agreementId: string) => {
    setAgreements((prev) =>
      prev.map((agr) => {
        if (agr.id !== agreementId) return agr;
        return {
          ...agr,
          status: 'FULLY_EXECUTED',
          updated_at: 'Executed just now',
        };
      })
    );
    setSelectedAgreement((prev) =>
      prev && prev.id === agreementId
        ? { ...prev, status: 'FULLY_EXECUTED', updated_at: 'Executed just now' }
        : prev
    );
    triggerToast('Tenancy Agreement Digitally Signed', 'NBA Lawyer seal applied & escrow protection activated.');
  };

  const handleTopUpSavings = (goalId: string, amount: number) => {
    if (walletBalance < amount) {
      triggerToast('Insufficient wallet balance', 'Please fund your wallet first.');
      return;
    }
    setWalletBalance((b) => b - amount);
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, total_saved: Math.min(g.target_savings_amount, g.total_saved + amount) }
          : g
      )
    );
    triggerToast('Rent Savings Topped Up', `${formatNaira(amount)} transferred from your Amana Wallet.`);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(newGoalTarget) || 3000000;
    const created: SavingsGoalItem = {
      id: `PLAN-${Math.floor(500 + Math.random() * 400)}`,
      title: newGoalTitle.trim() || 'Next Annual Rent Target',
      target_savings_amount: target,
      total_saved: 250000,
      frequency: newGoalFrequency,
      rent_due_date: '2027-10-30',
      automated: true,
      status: 'active',
    };
    setSavingsGoals((prev) => [created, ...prev]);
    setShowNewGoalModal(false);
    setNewGoalTitle('');
    triggerToast('Rent savings plan created', `${created.title} (${formatNaira(target)})`);
  };

  const handleBookService = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = bookingCategory === 'transportation' ? 135000 : 75000;
    const nextBooking: ServiceBookingItem = {
      id: `SRV-${Math.floor(900 + Math.random() * 99)}`,
      category: bookingCategory,
      service_name:
        bookingCategory === 'transportation'
          ? 'Covered Relocation Truck + Insured Handling Team'
          : 'EHORECON-Certified Fumigation & Post-Tenancy Deep Clean',
      pickup_or_address: bookingPickup,
      destination: bookingCategory === 'transportation' ? bookingDestination : undefined,
      scheduled_date: `${bookingDate} • 09:00 AM`,
      amount,
      status: 'Scheduled',
      provider_name:
        bookingCategory === 'transportation'
          ? 'Amana Transit Fleet Ops'
          : 'Amana Hygiene & Pest Control Ops',
    };
    setServiceBookings((prev) => [nextBooking, ...prev]);
    triggerToast('Service booking confirmed', `${nextBooking.service_name} scheduled for ${bookingDate}`);
  };

  const handleWalletTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(walletAmountInput) || 0;
    if (amount <= 0) return;
    if (showWalletModal === 'fund') {
      setWalletBalance((b) => b + amount);
      triggerToast('Wallet funded via Paystack / Transfer', `${formatNaira(amount)} credited immediately.`);
    } else if (showWalletModal === 'withdraw') {
      if (amount > walletBalance) {
        triggerToast('Amount exceeds wallet balance', 'Enter a lower withdrawal amount.');
        return;
      }
      setWalletBalance((b) => b - amount);
      triggerToast('Withdrawal initiated', `${formatNaira(amount)} sent to your verified Nigerian bank account.`);
    }
    setShowWalletModal(null);
  };

  const handleListNewProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle.trim()) return;
    const created: PropertyItem = {
      id: `prop-${Date.now()}`,
      title: newPropTitle.trim(),
      property_type: 'duplex',
      state_name: newPropState,
      city: newPropState,
      area: newPropArea,
      full_address: `Verified Plot, ${newPropArea}, ${newPropState}`,
      price_yearly: Number(newPropPrice) || 5000000,
      service_charge: 500000,
      caution_fee: 300000,
      bedrooms: Number(newPropBeds) || 3,
      bathrooms: Number(newPropBeds) || 3,
      toilets: (Number(newPropBeds) || 3) + 1,
      parking_spaces: 2,
      verified: true,
      details_unlocked: true,
      saved: false,
      photo_url:
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
      ],
      landlord_name: 'Verified Amana Landlord',
      landlord_verified: true,
      lawyer_name: 'Barr. Chidinma Okafor & Co.',
      lawyer_scn: 'SCN/084921',
      amenities: ['24/7 Security', 'Borehole Water', 'Prepaid Meter', 'Gated Estate'],
      structured_features: {
        power: 'Prepaid Meter + Backup Inverter',
        water: 'Treated Borehole Supply',
        security: 'Estate Gate + Uniformed Security',
        road_access: 'Paved Access Road',
      },
      damage_report: {
        inspected_at: '2026-10-31',
        inspector: 'Amana Field Verification Team',
        overall_status: 'Clean & Move-In Ready',
        items: [
          {
            type: 'Baseline Inspection',
            status: 'Passed',
            note: 'Uploaded with live camera capture & GPS coordinates.',
          },
        ],
      },
    };
    setProperties((prev) => [created, ...prev]);
    setShowListPropertyModal(false);
    setNewPropTitle('');
    setActiveTab('explore');
    triggerToast('Property listed & queued for Lawyer seal', created.title);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#F6F8FC] text-[#0E1C36] flex flex-col">
      {/* Top Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#071A3D] text-white px-5 py-4 rounded-2xl shadow-xl border border-[#1769E0]/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#FFC928] shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-white">{toastMessage.title}</p>
            {toastMessage.subtitle && (
              <p className="text-[#B9C9E5] text-xs mt-0.5">{toastMessage.subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#B9C9E5] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Brand & Role / Language Navigation Bar */}
      <header className="bg-[#071A3D] text-white sticky top-0 z-40 border-b border-[#102B5C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* BrandMark replica matching src/components/brand/BrandMark.js */}
          <button
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-3 text-left group cursor-pointer">
            <div className="w-11 h-11 rounded-2xl bg-[#102B5C] border border-[#2F80ED]/30 flex items-center justify-center shadow-inner">
              <Building2 className="w-6 h-6 text-[#FFC928]" />
            </div>
            <div>
              <div className="font-amana text-[#e0536c] text-xl leading-none tracking-wide">
                Amana
              </div>
              <div className="font-extrabold text-xl tracking-tight text-white leading-tight flex items-center gap-1.5">
                RentalHub
                <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#1769E0] text-white">
                  NIGERIA
                </span>
              </div>
            </div>
          </button>

          {/* Primary Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#102B5C] p-1.5 rounded-2xl">
            {[
              { id: 'explore', label: copy.explore, icon: Search },
              { id: 'hub', label: copy.myHub, icon: Wallet },
              { id: 'tenancy', label: copy.tenancy, icon: FileText },
              { id: 'savings', label: copy.rentSavings, icon: PiggyBank },
              { id: 'services', label: copy.services, icon: Truck },
            ].map((tab) => {
              const IconComp = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#1769E0] text-white shadow-sm'
                      : 'text-[#B9C9E5] hover:text-white hover:bg-white/5'
                  }`}>
                  <IconComp className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Language & Role Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#102B5C] border border-white/10 rounded-xl px-2.5 py-1.5">
              <Globe className="w-4 h-4 text-[#FFC928]" />
              <select
                aria-label="Interface language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-[#0E1C36]">
                    {lang.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-[#102B5C] border border-white/10 rounded-xl px-2.5 py-1.5">
              <UserCheck className="w-4 h-4 text-[#9BCBFF]" />
              <select
                aria-label="Active account role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as UserRole);
                  triggerToast(`Switched view to ${e.target.value.toUpperCase()} role`);
                }}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer">
                <option value="tenant" className="text-[#0E1C36]">Role: Tenant</option>
                <option value="landlord" className="text-[#0E1C36]">Role: Landlord</option>
                <option value="agent" className="text-[#0E1C36]">Role: Accredited Agent</option>
                <option value="lawyer" className="text-[#0E1C36]">Role: NBA Property Lawyer</option>
              </select>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
              title="Download web application code package">
              <Download className="w-3.5 h-3.5 text-[#FFC928]" />
              <span className="hidden md:inline">Download Web Design</span>
              <span className="md:hidden">Export</span>
            </button>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFC928] text-[#071A3D] text-xs font-bold hover:bg-[#ffd65c] transition cursor-pointer">
              <span>Create Account</span>
            </button>

            <button
              onClick={() => setActiveTab('hub')}
              className="relative p-2.5 rounded-xl bg-[#102B5C] hover:bg-[#1769E0]/30 text-white cursor-pointer"
              title="Notifications & Hub">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FFC928] text-[#071A3D] text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Bottom-Style Scrollable Tab Bar */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 bg-[#102B5C]/70 border-t border-white/10">
          {[
            { id: 'explore', label: copy.explore },
            { id: 'hub', label: copy.myHub },
            { id: 'tenancy', label: copy.tenancy },
            { id: 'savings', label: copy.rentSavings },
            { id: 'services', label: copy.services },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1769E0] text-white'
                  : 'text-[#B9C9E5]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ==================== TAB 1: EXPLORE HOMES ==================== */}
        {activeTab === 'explore' && (
          <div className="space-y-8">
            {/* Welcome Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-[#071A3D] text-white p-6 sm:p-10 shadow-lg border border-[#102B5C]">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102B5C] border border-[#2F80ED]/30">
                  <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
                  <span className="text-xs font-semibold tracking-wider text-[#9BCBFF]">
                    {copy.eyebrow}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                  {copy.heroTitle}
                </h1>
                <p className="text-sm sm:text-base text-[#B9C9E5] leading-relaxed">
                  {copy.heroSubtitle}
                </p>

                {/* Search Input Card */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-2.5 shadow-sm">
                    <Search className="w-5 h-5 text-[#586A86] shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={copy.searchPlaceholder}
                      className="w-full px-3 py-1 text-sm text-[#0E1C36] placeholder-[#909CB2] focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[#586A86] hover:text-[#0E1C36]">
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSavedOnly((s) => !s)}
                    className={`px-5 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      savedOnly
                        ? 'bg-[#FFC928] text-[#071A3D]'
                        : 'bg-[#102B5C] text-white hover:bg-[#1769E0]'
                    }`}>
                    <Bookmark className="w-4 h-4" />
                    <span>Saved Homes ({properties.filter((p) => p.saved).length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Chips: Property Type & Nigerian States */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#DDE4EF]">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'apartment', label: 'Apartment' },
                  { value: 'house', label: 'House' },
                  { value: 'duplex', label: 'Duplex' },
                  { value: 'short_let', label: 'Short let' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                      selectedType === type.value
                        ? 'bg-[#1769E0] text-white'
                        : 'bg-[#EEF5FF] text-[#1769E0] hover:bg-[#DCEEFF]'
                    }`}>
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-semibold text-[#586A86] whitespace-nowrap">
                  State:
                </span>
                {['All', ...NIGERIAN_STATES.map((s) => s.name)].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedState(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                      selectedState === st
                        ? 'bg-[#071A3D] text-white'
                        : 'bg-[#F6F8FC] text-[#33415C] hover:bg-[#DDE4EF]'
                    }`}>
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#1769E0]">
                  {copy.curatedForYou}
                </p>
                <h2 className="text-xl font-bold text-[#0E1C36]">
                  {copy.featuredHomes} ({filteredProperties.length})
                </h2>
              </div>
              {(role === 'landlord' || role === 'agent') && (
                <button
                  onClick={() => setShowListPropertyModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1769E0] text-white text-sm font-semibold hover:bg-[#102B5C] transition cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>{copy.listProperty}</span>
                </button>
              )}
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-2xl border border-[#DDE4EF] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                  <div className="relative h-52 bg-[#102B5C]">
                    <img
                      src={property.photo_url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071A3D]/90 text-white text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC928]" />
                      <span>Lawyer & Field Verified</span>
                    </div>
                    <button
                      onClick={() => toggleSaveProperty(property.id)}
                      aria-label="Save property"
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                        property.saved
                          ? 'bg-[#FFC928] text-[#071A3D]'
                          : 'bg-white/90 text-[#0E1C36] hover:bg-white'
                      }`}>
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 text-[#071A3D] text-xs font-bold uppercase">
                      {property.property_type.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#586A86]">
                        <MapPin className="w-3.5 h-3.5 text-[#1769E0] shrink-0" />
                        <span>
                          {property.area}, {property.state_name}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[#0E1C36] line-clamp-2">
                        {property.title}
                      </h3>
                      <div className="pt-1 flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-[#1769E0]">
                          {formatNaira(property.price_yearly)}
                        </span>
                        <span className="text-xs text-[#586A86]">/ year</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#DDE4EF] text-xs text-[#33415C]">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="w-4 h-4 text-[#1769E0]" />
                          <span>{property.bedrooms} Beds</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bath className="w-4 h-4 text-[#1769E0]" />
                          <span>{property.bathrooms} Baths</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-[#1769E0]" />
                          <span>{property.parking_spaces} Park</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#169B62] bg-[#f0fdf4] px-2.5 py-1 rounded-lg">
                          {property.damage_report.overall_status}
                        </span>
                        <button
                          onClick={() => setSelectedPropertyId(property.id)}
                          className="px-4 py-2 rounded-xl bg-[#071A3D] hover:bg-[#1769E0] text-white text-xs font-semibold transition cursor-pointer">
                          Inspect & Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nigerian States Coverage Directory */}
            <div className="bg-white rounded-2xl border border-[#DDE4EF] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1769E0]">
                    NATIONWIDE COVERAGE
                  </p>
                  <h3 className="text-lg font-bold text-[#0E1C36]">
                    Explore by State & Zonal Hub
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {NIGERIAN_STATES.map((st) => (
                  <button
                    key={st.name}
                    onClick={() => setSelectedState(st.name)}
                    className="text-left p-4 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] bg-[#F6F8FC] transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0E1C36]">{st.name}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DCEEFF] text-[#1769E0]">
                        {st.count} verified homes
                      </span>
                    </div>
                    <p className="text-xs text-[#586A86] mt-1.5 truncate">
                      {st.areas.join(' • ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: MY HUB DASHBOARD ==================== */}
        {activeTab === 'hub' && (
          <div className="space-y-6">
            {/* Wallet & Identity Hero Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#071A3D] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-[#FFC928]">
                      {copy.walletBalance} ({role.toUpperCase()} ACCOUNT)
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold mt-1">
                      {formatNaira(walletBalance)}
                    </h2>
                    <p className="text-xs text-[#B9C9E5] mt-1">
                      Escrow-protected Naira wallet • Instant Paystack & Bank Transfer settlement
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#102B5C] border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-[#169B62]" />
                    <span className="text-xs font-semibold">
                      {ninVerified ? 'NIN & BVN Verified' : 'Verification Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowWalletModal('fund')}
                    className="px-5 py-2.5 rounded-xl bg-[#1769E0] hover:bg-[#2F80ED] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>{copy.fundWallet}</span>
                  </button>
                  <button
                    onClick={() => setShowWalletModal('withdraw')}
                    className="px-5 py-2.5 rounded-xl bg-[#102B5C] hover:bg-white/15 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>{copy.withdraw}</span>
                  </button>
                  <button
                    onClick={() => setShowListPropertyModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#FFC928] text-[#071A3D] text-sm font-bold flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    <span>{copy.listProperty}</span>
                  </button>
                </div>
              </div>

              {/* Lawyer Invitation Status Banner (from DashboardScreen.js) */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-3xl p-6 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#16a34a]/15 text-[#16a34a] flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[#166534] text-base">
                    Lawyer invitation accepted
                  </h3>
                  <p className="text-xs text-[#15803d] leading-relaxed">
                    Barr. Chidinma Okafor (SCN/084921) accepted your legal representation mandate. All tenancy agreements and caution deposits on your account carry mandatory NBA verification.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('tenancy')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#166534] hover:underline cursor-pointer">
                  <span>Open Tenancy & Legal Hub</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'Saved Homes',
                  value: properties.filter((p) => p.saved).length,
                  sub: 'Ready for inspection',
                  onClick: () => {
                    setSavedOnly(true);
                    setActiveTab('explore');
                  },
                },
                {
                  title: 'Rental Applications',
                  value: applications.length,
                  sub: 'Active submissions',
                  onClick: () => {},
                },
                {
                  title: 'Tenancy Agreements',
                  value: agreements.length,
                  sub: '1 awaiting signature',
                  onClick: () => setActiveTab('tenancy'),
                },
                {
                  title: 'Rent Savings Balance',
                  value: formatNaira(totalSavedAcrossPlans),
                  sub: `${savingsGoals.length} active plans`,
                  onClick: () => setActiveTab('savings'),
                },
              ].map((stat) => (
                <button
                  key={stat.title}
                  onClick={stat.onClick}
                  className="bg-white p-5 rounded-2xl border border-[#DDE4EF] text-left hover:border-[#1769E0] transition cursor-pointer">
                  <p className="text-xs font-medium text-[#586A86]">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#0E1C36] mt-1">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[#1769E0] font-semibold mt-1">{stat.sub}</p>
                </button>
              ))}
            </div>

            {/* Applications & Saved Properties */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#0E1C36]">
                    My Rental Applications
                  </h3>
                  <span className="text-xs font-semibold text-[#1769E0]">
                    {applications.length} total
                  </span>
                </div>
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF] flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-[#1769E0]">{app.id}</span>
                        <h4 className="text-sm font-bold text-[#0E1C36]">{app.propertyTitle}</h4>
                        <p className="text-xs text-[#586A86]">{app.location}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-[#EEF5FF] text-[#1769E0] text-xs font-semibold">
                          {app.status}
                        </span>
                        <p className="text-[11px] text-[#586A86] mt-1">{app.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tenancy Grace & Rent Help Panel */}
              <div className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#0E1C36]">
                    Tenancy Protection & Rent Help
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF5FF] text-[#1769E0]">
                    Amana Shield
                  </span>
                </div>
                <p className="text-xs text-[#33415C] leading-relaxed">
                  Need a structured renewal grace window or someone to pay rent on your behalf (Diaspora / Sponsor Desk)? Initiate a verified request with your landlord and assigned lawyer.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() =>
                      triggerToast(
                        'Renewal Grace Period Requested',
                        'Your landlord and lawyer have been notified for a 30-day structured extension.'
                      )
                    }
                    className="p-3.5 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] text-left bg-[#F6F8FC] cursor-pointer">
                    <p className="text-xs font-bold text-[#0E1C36]">Request Tenancy Grace</p>
                    <p className="text-[11px] text-[#586A86] mt-0.5">
                      Statutory notice & payment schedule
                    </p>
                  </button>
                  <button
                    onClick={() =>
                      triggerToast(
                        'Pay-Rent-On-Behalf Link Generated',
                        'Share your sponsor payment code: AMANA-SPONSOR-8841'
                      )
                    }
                    className="p-3.5 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] text-left bg-[#F6F8FC] cursor-pointer">
                    <p className="text-xs font-bold text-[#0E1C36]">Pay Rent on My Behalf</p>
                    <p className="text-[11px] text-[#586A86] mt-0.5">
                      Generate verified sponsor invoice
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: TENANCY AGREEMENTS & LEGAL ==================== */}
        {activeTab === 'tenancy' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#1769E0]">TENANCY & LEGAL</p>
                <h2 className="text-2xl font-bold text-[#0E1C36]">
                  My Tenancy Agreements
                </h2>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'PENDING_TENANT_SIGNATURE', label: 'Tenant signature' },
                  { value: 'PENDING_LANDLORD_SIGNATURE', label: 'Landlord signature' },
                  { value: 'FULLY_EXECUTED', label: 'Executed' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setAgreementFilter(f.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      agreementFilter === f.value
                        ? 'bg-[#1769E0] text-white'
                        : 'bg-white border border-[#DDE4EF] text-[#33415C]'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {agreements
                  .filter((a) => agreementFilter === 'all' || a.status === agreementFilter)
                  .map((agr) => (
                    <div
                      key={agr.id}
                      className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#1769E0] bg-[#EEF5FF] px-3 py-1 rounded-full">
                          {agr.id}
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            agr.status === 'FULLY_EXECUTED'
                              ? 'bg-[#f0fdf4] text-[#169B62]'
                              : 'bg-[#fffbeb] text-[#d97706]'
                          }`}>
                          {agr.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-[#0E1C36]">
                          {agr.property_title}
                        </h3>
                        <p className="text-xs text-[#586A86]">{agr.location}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                        <div>
                          <p className="text-[#586A86]">Annual Rent</p>
                          <p className="font-bold text-[#0E1C36]">
                            {formatNaira(agr.annual_rent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#586A86]">Tenancy Period</p>
                          <p className="font-bold text-[#0E1C36]">
                            {agr.start_date} → {agr.end_date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#586A86]">Assigned Lawyer</p>
                          <p className="font-bold text-[#0E1C36]">{agr.lawyer_name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DDE4EF]">
                        <span className="text-xs text-[#586A86]">{agr.updated_at}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAgreement(agr)}
                            className="px-4 py-2 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] text-xs font-semibold text-[#0E1C36] cursor-pointer">
                            Review Clauses
                          </button>
                          {agr.status !== 'FULLY_EXECUTED' && (
                            <button
                              onClick={() => handleSignAgreement(agr.id)}
                              className="px-4 py-2 rounded-xl bg-[#1769E0] hover:bg-[#102B5C] text-white text-xs font-semibold cursor-pointer">
                              Sign Digitally
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Public Case & Agreement Verification + Lawyer Directory */}
              <div className="space-y-6">
                <div className="bg-[#071A3D] text-white rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#FFC928]" />
                    <h3 className="font-bold text-base">Verify Tenancy / Legal Case</h3>
                  </div>
                  <p className="text-xs text-[#B9C9E5]">
                    Enter an Amana Agreement ID or SCN Reference to verify authenticity on the public registry.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={caseVerifyInput}
                      onChange={(e) => setCaseVerifyInput(e.target.value)}
                      placeholder="e.g. AGR-2026-0891"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#102B5C] text-white text-xs border border-white/15 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const match = agreements.find(
                          (a) => a.id.toLowerCase() === caseVerifyInput.trim().toLowerCase()
                        );
                        setCaseVerifyResult(
                          match
                            ? `VERIFIED: ${match.property_title} (${match.status.replace(/_/g, ' ')}) — Sealed by ${match.lawyer_name}`
                            : 'RECORD FOUND: Valid NBA-Verified Amana Registry Entry (No active disputes).'
                        );
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FFC928] text-[#071A3D] text-xs font-bold cursor-pointer">
                      Verify
                    </button>
                  </div>
                  {caseVerifyResult && (
                    <div className="p-3 rounded-xl bg-[#102B5C] border border-[#169B62] text-xs text-[#9BCBFF]">
                      {caseVerifyResult}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4">
                  <h3 className="font-bold text-base text-[#0E1C36]">
                    NBA-Verified Property Lawyers
                  </h3>
                  <div className="space-y-3">
                    {VERIFIED_LAWYERS.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF] space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#0E1C36]">{lawyer.name}</p>
                          <span className="text-[11px] font-bold text-[#1769E0]">
                            {lawyer.scn}
                          </span>
                        </div>
                        <p className="text-xs text-[#33415C]">{lawyer.chamber}</p>
                        <p className="text-[11px] text-[#586A86]">
                          {lawyer.state} • {lawyer.verified_cases} tenancies sealed • ★ {lawyer.rating}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: RENT SAVINGS & CALCULATOR ==================== */}
        {activeTab === 'savings' && (
          <div className="space-y-8">
            {/* Hero Summary Card matching RentSavingsDashboardScreen.js */}
            <div className="bg-[#071A3D] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-bold tracking-wider text-[#FFC928]">
                  {copy.totalSaved}
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold">
                  {formatNaira(totalSavedAcrossPlans)}
                </h2>
                <p className="text-sm text-[#B9C9E5]">
                  Build your next rent payment steadily and confidently with automated weekly or monthly vaults.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-[#102B5C] px-5 py-3 rounded-2xl">
                  <p className="text-xl font-bold">{savingsGoals.length}</p>
                  <p className="text-xs text-[#AFC3E6]">Active plans</p>
                </div>
                <button
                  onClick={() => setShowNewGoalModal(true)}
                  className="px-5 py-3 rounded-2xl bg-[#1769E0] hover:bg-[#2F80ED] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>{copy.createSavingsPlan}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Savings Plans */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-[#0E1C36]">My Rent Savings Plans</h3>
                {savingsGoals.map((goal) => {
                  const pct = Math.min(
                    100,
                    Math.round((goal.total_saved / goal.target_savings_amount) * 100)
                  );
                  return (
                    <div
                      key={goal.id}
                      className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[#1769E0]">{goal.id}</span>
                          <h4 className="text-base font-bold text-[#0E1C36]">{goal.title}</h4>
                        </div>
                        <span className="text-xs font-semibold text-[#586A86]">
                          Due: {goal.rent_due_date}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-[#0E1C36]">
                          {formatNaira(goal.total_saved)}
                        </span>
                        <span className="text-xs text-[#586A86]">
                          of {formatNaira(goal.target_savings_amount)} ({pct}%)
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-[#DDE4EF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#169B62] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <span className="text-xs text-[#586A86]">
                          {goal.frequency} auto-save • Locked until rent due date
                        </span>
                        <button
                          onClick={() => handleTopUpSavings(goal.id, 250000)}
                          className="px-4 py-2 rounded-xl bg-[#EEF5FF] hover:bg-[#1769E0] text-[#1769E0] hover:text-white text-xs font-bold transition cursor-pointer">
                          + Quick Top-Up ₦250,000
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Rent Calculator (from RentCalculatorScreen.js) */}
              <div className="bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#1769E0]" />
                  <h3 className="font-bold text-base text-[#0E1C36]">{copy.rentCalculator}</h3>
                </div>
                <p className="text-xs text-[#586A86]">
                  Calculate your recommended monthly & weekly rent savings schedule.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-[#33415C]">
                      Target Annual Rent (₦)
                    </label>
                    <input
                      type="number"
                      value={calcTargetRent}
                      onChange={(e) => setCalcTargetRent(Number(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#33415C]">
                      Months Until Rent Is Due ({calcMonths} months)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={calcMonths}
                      onChange={(e) => setCalcMonths(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#33415C]">
                      Monthly Household Income (₦)
                    </label>
                    <input
                      type="number"
                      value={calcIncome}
                      onChange={(e) => setCalcIncome(Number(e.target.value) || 1)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#EEF5FF] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#586A86]">Required Monthly Saving:</span>
                    <span className="font-extrabold text-[#1769E0]">
                      {formatNaira(Math.ceil(calcTargetRent / Math.max(1, calcMonths)))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#586A86]">Required Weekly Saving:</span>
                    <span className="font-bold text-[#0E1C36]">
                      {formatNaira(Math.ceil(calcTargetRent / (Math.max(1, calcMonths) * 4.3)))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-[#DDE4EF]">
                    <span className="text-[#586A86]">Rent-to-Income Ratio:</span>
                    <span className="font-bold text-[#169B62]">
                      {Math.round((calcTargetRent / 12 / Math.max(1, calcIncome)) * 100)}% of monthly income
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: MOVE & CARE SERVICES ==================== */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white rounded-2xl border border-[#DDE4EF] p-6 space-y-5">
              <div className="flex gap-2 p-1 bg-[#F6F8FC] rounded-xl">
                <button
                  onClick={() => setBookingCategory('transportation')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingCategory === 'transportation'
                      ? 'bg-[#071A3D] text-white'
                      : 'text-[#586A86]'
                  }`}>
                  <Truck className="w-4 h-4" />
                  <span>Relocation Truck</span>
                </button>
                <button
                  onClick={() => setBookingCategory('fumigation')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingCategory === 'fumigation'
                      ? 'bg-[#071A3D] text-white'
                      : 'text-[#586A86]'
                  }`}>
                  <Sparkles className="w-4 h-4" />
                  <span>Fumigation & Clean</span>
                </button>
              </div>

              <form onSubmit={handleBookService} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-[#33415C]">
                    {bookingCategory === 'transportation' ? 'Pickup Address' : 'Property Address'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingPickup}
                    onChange={(e) => setBookingPickup(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                  />
                </div>

                {bookingCategory === 'transportation' && (
                  <div>
                    <label className="font-semibold text-[#33415C]">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingDestination}
                      onChange={(e) => setBookingDestination(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-[#33415C]">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#EEF5FF] flex items-center justify-between">
                  <span className="font-semibold text-[#33415C]">Estimated Vetted Rate</span>
                  <span className="text-base font-extrabold text-[#1769E0]">
                    {formatNaira(bookingCategory === 'transportation' ? 135000 : 75000)}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#1769E0] hover:bg-[#071A3D] text-white font-semibold text-sm transition cursor-pointer">
                  Book Verified Service
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div>
                <p className="text-xs font-bold text-[#1769E0] uppercase">
                  VERIFIED LOGISTICS & HYGIENE
                </p>
                <h2 className="text-xl font-bold text-[#0E1C36]">
                  My Move-In & Fumigation Bookings
                </h2>
              </div>

              {serviceBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#DDE4EF] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1769E0]">{b.id}</span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === 'Completed'
                            ? 'bg-[#f0fdf4] text-[#169B62]'
                            : 'bg-[#EEF5FF] text-[#1769E0]'
                        }`}>
                        {b.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#0E1C36]">{b.service_name}</h4>
                    <p className="text-xs text-[#586A86]">
                      {b.pickup_or_address}
                      {b.destination ? ` → ${b.destination}` : ''}
                    </p>
                    <p className="text-xs text-[#33415C]">
                      {b.scheduled_date} • {b.provider_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-[#0E1C36]">
                      {formatNaira(b.amount)}
                    </p>
                    <span className="text-[11px] text-[#169B62] font-semibold">
                      Escrow Protected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ==================== MODAL: PROPERTY DETAIL & INSPECTION DOSSIER ==================== */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DDE4EF]">
            <div className="relative h-64 bg-[#071A3D]">
              <img
                src={selectedProperty.photo_url}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedPropertyId(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#071A3D]/80 text-white flex items-center justify-center hover:bg-[#071A3D] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#071A3D] text-[#FFC928] text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Verified by {selectedProperty.lawyer_name} ({selectedProperty.lawyer_scn})
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#1769E0] uppercase">
                    {selectedProperty.area}, {selectedProperty.state_name}
                  </p>
                  <h2 className="text-2xl font-bold text-[#0E1C36] mt-0.5">
                    {selectedProperty.title}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#1769E0]">
                    {formatNaira(selectedProperty.price_yearly)}
                  </p>
                  <p className="text-xs text-[#586A86]">
                    Service Charge: {formatNaira(selectedProperty.service_charge)} • Caution:{' '}
                    {formatNaira(selectedProperty.caution_fee)}
                  </p>
                </div>
              </div>

              {/* Address Unlock Box */}
              <div className="p-4 rounded-2xl bg-[#EEF5FF] border border-[#DCEEFF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {selectedProperty.details_unlocked ? (
                    <Unlock className="w-5 h-5 text-[#169B62] shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-5 h-5 text-[#1769E0] shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-[#0E1C36]">
                      {selectedProperty.details_unlocked
                        ? selectedProperty.full_address
                        : 'Exact Street Address & Direct Landlord Line Locked'}
                    </p>
                    <p className="text-[#586A86] mt-0.5">
                      {selectedProperty.details_unlocked
                        ? `Landlord: ${selectedProperty.landlord_name} • Legal Counsel: ${selectedProperty.lawyer_name}`
                        : 'Unlock verified street coordinates, landlord identity, and inspection scheduling.'}
                    </p>
                  </div>
                </div>
                {!selectedProperty.details_unlocked && (
                  <button
                    onClick={() => unlockPropertyDetails(selectedProperty.id)}
                    className="px-4 py-2 rounded-xl bg-[#1769E0] text-white text-xs font-bold shrink-0 cursor-pointer">
                    Unlock Dossier (₦5,000)
                  </button>
                )}
              </div>

              {/* Structured Engineering & Infrastructure Features */}
              <div>
                <h3 className="text-sm font-bold text-[#0E1C36] mb-3">
                  Verified Infrastructure & Utilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF]">
                    <p className="text-[#586A86] font-medium">Power Supply</p>
                    <p className="font-bold text-[#0E1C36] mt-0.5">
                      {selectedProperty.structured_features.power}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF]">
                    <p className="text-[#586A86] font-medium">Water Treatment</p>
                    <p className="font-bold text-[#0E1C36] mt-0.5">
                      {selectedProperty.structured_features.water}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF]">
                    <p className="text-[#586A86] font-medium">Estate Security</p>
                    <p className="font-bold text-[#0E1C36] mt-0.5">
                      {selectedProperty.structured_features.security}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#DDE4EF]">
                    <p className="text-[#586A86] font-medium">Road & Drainage</p>
                    <p className="font-bold text-[#0E1C36] mt-0.5">
                      {selectedProperty.structured_features.road_access}
                    </p>
                  </div>
                </div>
              </div>

              {/* Baseline Condition & Damage Inspection Report */}
              <div className="p-5 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#166534] uppercase">
                      PUBLISHED CONDITION & DAMAGE REPORT
                    </p>
                    <p className="text-xs text-[#15803d]">
                      Inspected by {selectedProperty.damage_report.inspector} on{' '}
                      {selectedProperty.damage_report.inspected_at}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#16a34a] text-white text-xs font-bold">
                    {selectedProperty.damage_report.overall_status}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {selectedProperty.damage_report.items.map((item) => (
                    <div
                      key={item.type}
                      className="text-xs bg-white/80 p-3 rounded-xl flex items-start justify-between gap-4">
                      <div>
                        <span className="font-bold text-[#0E1C36]">{item.type}: </span>
                        <span className="text-[#33415C]">{item.note}</span>
                      </div>
                      <span className="font-bold text-[#169B62] shrink-0">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#DDE4EF]">
                <button
                  onClick={() =>
                    triggerToast(
                      'Live Video Tour Requested',
                      `WebRTC live walkthrough link sent to ${selectedProperty.landlord_name}.`
                    )
                  }
                  className="px-4 py-2.5 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] text-xs font-semibold text-[#0E1C36] flex items-center gap-2 cursor-pointer">
                  <Video className="w-4 h-4 text-[#1769E0]" />
                  <span>Request Live Video Tour</span>
                </button>
                <button
                  onClick={() => {
                    submitRentalApplication(selectedProperty);
                    setSelectedPropertyId(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#1769E0] hover:bg-[#071A3D] text-white text-xs font-bold transition cursor-pointer">
                  Submit Verified Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TENANCY AGREEMENT CLAUSES ==================== */}
      {selectedAgreement && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#1769E0]">{selectedAgreement.id}</span>
                <h3 className="text-xl font-bold text-[#0E1C36]">
                  {selectedAgreement.property_title}
                </h3>
                <p className="text-xs text-[#586A86]">
                  Prepared & Sealed by {selectedAgreement.lawyer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedAgreement(null)}
                className="p-2 rounded-full hover:bg-[#F6F8FC]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#F6F8FC] p-4 rounded-2xl border border-[#DDE4EF] text-xs text-[#33415C] leading-relaxed">
              {selectedAgreement.clauses.map((clause, idx) => (
                <p key={idx}>{clause}</p>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedAgreement(null)}
                className="px-4 py-2 rounded-xl border border-[#DDE4EF] text-xs font-semibold">
                Close
              </button>
              {selectedAgreement.status !== 'FULLY_EXECUTED' && (
                <button
                  onClick={() => handleSignAgreement(selectedAgreement.id)}
                  className="px-5 py-2.5 rounded-xl bg-[#1769E0] text-white text-xs font-bold cursor-pointer">
                  Execute & Sign Agreement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: WALLET FUND / WITHDRAW ==================== */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleWalletTransaction}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0E1C36]">
                {showWalletModal === 'fund' ? 'Fund Amana Naira Wallet' : 'Withdraw to Bank'}
              </h3>
              <button
                type="button"
                onClick={() => setShowWalletModal(null)}
                className="p-1.5 rounded-full hover:bg-[#F6F8FC]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#586A86]">
              {showWalletModal === 'fund'
                ? 'Instant funding via Paystack Card or dedicated Providus / Titan virtual bank transfer.'
                : 'Instant NIP payout to your verified Nigerian bank account.'}
            </p>
            <div>
              <label className="text-xs font-semibold text-[#33415C]">Amount (₦)</label>
              <input
                type="number"
                required
                value={walletAmountInput}
                onChange={(e) => setWalletAmountInput(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#DDE4EF] text-base font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#1769E0] text-white text-sm font-bold cursor-pointer">
              {showWalletModal === 'fund' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
            </button>
          </form>
        </div>
      )}

      {/* ==================== MODAL: CREATE SAVINGS GOAL ==================== */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGoal}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0E1C36]">Create Rent Savings Plan</h3>
              <button
                type="button"
                onClick={() => setShowNewGoalModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F6F8FC]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#33415C]">Plan Title</label>
              <input
                type="text"
                required
                placeholder="e.g. 2027 Maitama Duplex Renewal"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#33415C]">Target Rent Amount (₦)</label>
              <input
                type="number"
                required
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#33415C]">Contribution Frequency</label>
              <select
                value={newGoalFrequency}
                onChange={(e) => setNewGoalFrequency(e.target.value as 'Monthly' | 'Weekly')}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm">
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#1769E0] text-white text-sm font-bold cursor-pointer">
              Launch Rent Plan
            </button>
          </form>
        </div>
      )}

      {/* ==================== MODAL: LIST NEW PROPERTY ==================== */}
      {showListPropertyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleListNewProperty}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0E1C36]">List Verified Property</h3>
              <button
                type="button"
                onClick={() => setShowListPropertyModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F6F8FC]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#33415C]">Property Title</label>
              <input
                type="text"
                required
                placeholder="e.g. 4-Bedroom Detached Duplex with BQ"
                value={newPropTitle}
                onChange={(e) => setNewPropTitle(e.target.value)}
                className="w-full mt-1 px-3.5 py-2 rounded-xl border border-[#DDE4EF] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#33415C]">State</label>
                <select
                  value={newPropState}
                  onChange={(e) => setNewPropState(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm">
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#33415C]">Neighbourhood / Area</label>
                <input
                  type="text"
                  required
                  value={newPropArea}
                  onChange={(e) => setNewPropArea(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#33415C]">Annual Rent (₦)</label>
                <input
                  type="number"
                  required
                  value={newPropPrice}
                  onChange={(e) => setNewPropPrice(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#33415C]">Bedrooms</label>
                <input
                  type="number"
                  required
                  value={newPropBeds}
                  onChange={(e) => setNewPropBeds(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#DDE4EF] text-sm font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#071A3D] hover:bg-[#1769E0] text-white text-sm font-bold cursor-pointer">
              Publish & Request Field Verification
            </button>
          </form>
        </div>
      )}

      {/* ==================== MODAL: CREATE ACCOUNT / REGISTER ==================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                window.localStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
              } catch {}
              setRole(regForm.user_type);
              setShowRegisterModal(false);
              triggerToast('Registration complete', 'Your account has been created.');
            }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1769E0] uppercase">ACCOUNT</p>
                <h3 className="text-xl font-bold text-[#0E1C36]">About you</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F6F8FC]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(['tenant', 'landlord'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegForm((prev) => ({ ...prev, user_type: r }))}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    regForm.user_type === r
                      ? 'border-[#1769E0] bg-[#EEF5FF] text-[#1769E0]'
                      : 'border-[#DDE4EF] text-[#33415C]'
                  }`}>
                  {r === 'tenant' ? 'Tenant' : 'Landlord'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-[#33415C]">Full Name</label>
                <input
                  type="text"
                  required
                  value={regForm.full_name}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-[#33415C]">Email</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@email.com"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-[#33415C]">Phone</label>
                <input
                  type="tel"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+2348012345678"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-[#33415C]">Lawyer Email</label>
                <input
                  type="email"
                  required
                  value={regForm.lawyer_email}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, lawyer_email: e.target.value }))}
                  placeholder="lawyer@email.com"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-[#33415C]">11-Digit NIN</label>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={regForm.nin}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, nin: e.target.value }))}
                  placeholder="11-digit NIN"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-[#33415C]">Password</label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 10 characters"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[#DDE4EF] text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#1769E0] hover:bg-[#071A3D] text-white text-sm font-bold transition cursor-pointer">
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* Download / Export Web Design Package Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-[#071A3D]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#DDE4EF] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-5 right-5 text-[#586A86] hover:text-[#0E1C36] p-1.5 rounded-xl hover:bg-[#F0F4FA] transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#071A3D] text-[#FFC928] flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#071A3D]">Download Web App Design</h3>
                <p className="text-xs text-[#586A86]">
                  Amana RentalHub Nigeria complete web frontend files
                </p>
              </div>
            </div>

            <p className="text-sm text-[#33415C] mb-6 leading-relaxed">
              This package contains the exact desktop & mobile-responsive web app design you see in this preview, complete with Explore, My Hub, Escrow Wallet, Tenancy & Legal NBA flow, Rent Savings, Move & Care Services, and 6-language translations (EN, HA, YO, IG, FR, AR).
            </p>

            <div className="space-y-3 mb-6">
              <a
                href="/amana-rentalhub-web-design.tar.gz"
                download="amana-rentalhub-web-design.tar.gz"
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#1769E0] hover:bg-[#071A3D] text-white font-bold text-sm shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Download Complete Archive (.tar.gz)</div>
                    <div className="text-xs text-white/80">Contains WebApp.tsx, mockRentalHubData.ts, Tailwind styles & configs</div>
                  </div>
                </div>
                <span className="text-xs bg-white text-[#1769E0] px-2.5 py-1 rounded-lg font-bold group-hover:bg-[#FFC928] group-hover:text-[#071A3D]">
                  Download
                </span>
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href="/WebApp.tsx.txt"
                  download="WebApp.tsx"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] hover:bg-[#F0F4FA] transition text-xs font-semibold text-[#071A3D]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1769E0]" />
                    <span>WebApp.tsx (React UI)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#586A86]" />
                </a>

                <a
                  href="/mockRentalHubData.ts.txt"
                  download="mockRentalHubData.ts"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#DDE4EF] hover:border-[#1769E0] hover:bg-[#F0F4FA] transition text-xs font-semibold text-[#071A3D]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1769E0]" />
                    <span>mockRentalHubData.ts (Data)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#586A86]" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F0F4FA] border border-[#DDE4EF] text-xs text-[#33415C] space-y-2">
              <div className="font-bold text-[#071A3D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>How to use when switching to your Web Repository:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#586A86] pl-1">
                <li>Download the archive or files above.</li>
                <li>When you change your Git repo in AI Studio or local machine to your web app, upload these files.</li>
                <li>Tell me: <em>&quot;Apply the saved Amana RentalHub web design&quot;</em> and I will mount and run it instantly!</li>
              </ol>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#071A3D] text-white text-xs font-bold hover:bg-[#102B5C] transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#DDE4EF] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#586A86]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#071A3D]">Amana RentalHub Nigeria</span>
            <span>•</span>
            <span>Verified Homes, Escrow Tenancy & Legal Protection</span>
          </div>
          <div>
            <span>Supported Languages: English • Hausa • Yorùbá • Igbo • Français • العربية</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
