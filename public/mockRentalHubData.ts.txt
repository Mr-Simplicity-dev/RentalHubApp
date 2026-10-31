export type LanguageCode = 'en' | 'fr' | 'ar' | 'ha' | 'yo' | 'ig';

export interface PropertyItem {
  id: string;
  title: string;
  property_type: 'apartment' | 'house' | 'duplex' | 'short_let';
  state_name: string;
  city: string;
  area: string;
  full_address: string;
  price_yearly: number;
  service_charge: number;
  caution_fee: number;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  parking_spaces: number;
  verified: boolean;
  details_unlocked: boolean;
  saved: boolean;
  photo_url: string;
  gallery: string[];
  landlord_name: string;
  landlord_verified: boolean;
  lawyer_name: string;
  lawyer_scn: string;
  amenities: string[];
  structured_features: {
    power: string;
    water: string;
    security: string;
    road_access: string;
  };
  damage_report: {
    inspected_at: string;
    inspector: string;
    overall_status: 'Clean & Move-In Ready' | 'Minor Cosmetic Note';
    items: { type: string; status: string; note: string }[];
  };
}

export interface TenancyAgreementItem {
  id: string;
  property_id: string;
  property_title: string;
  location: string;
  tenant_name: string;
  landlord_name: string;
  lawyer_name: string;
  annual_rent: number;
  start_date: string;
  end_date: string;
  status:
    | 'PENDING_LANDLORD_REVIEW'
    | 'PENDING_LANDLORD_SIGNATURE'
    | 'PENDING_TENANT_REVIEW'
    | 'PENDING_TENANT_SIGNATURE'
    | 'FULLY_EXECUTED';
  clauses: string[];
  updated_at: string;
}

export interface SavingsGoalItem {
  id: string;
  title: string;
  target_savings_amount: number;
  total_saved: number;
  frequency: 'Weekly' | 'Monthly';
  rent_due_date: string;
  automated: boolean;
  status: 'active' | 'completed';
}

export interface ServiceBookingItem {
  id: string;
  category: 'transportation' | 'fumigation';
  service_name: string;
  pickup_or_address: string;
  destination?: string;
  scheduled_date: string;
  amount: number;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  provider_name: string;
}

export interface LawyerProfile {
  id: string;
  name: string;
  scn: string;
  state: string;
  chamber: string;
  specialization: string;
  verified_cases: number;
  rating: number;
}

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ha', label: 'Hausa', nativeLabel: 'Hausa' },
  { code: 'yo', label: 'Yoruba', nativeLabel: 'Yorùbá' },
  { code: 'ig', label: 'Igbo', nativeLabel: 'Igbo' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
];

export const UI_COPY: Record<LanguageCode, Record<string, string>> = {
  en: {
    eyebrow: 'VERIFIED NIGERIAN RENTAL PLATFORM',
    heroTitle: 'Find a place that feels like yours.',
    heroSubtitle: 'Search lawyer-verified homes, sign digital tenancy agreements, save steadily for rent, and book trusted move-in services across Nigeria.',
    searchPlaceholder: 'Search Lekki, Maitama, Port Harcourt GRA, Bodija…',
    explore: 'Explore',
    myHub: 'My Hub',
    tenancy: 'Tenancy & Legal',
    rentSavings: 'Rent Savings',
    services: 'Move & Care',
    featuredHomes: 'Featured verified homes',
    curatedForYou: 'CURATED FOR YOU',
    totalSaved: 'TOTAL SAVED FOR RENT',
    walletBalance: 'WALLET BALANCE',
    fundWallet: 'Fund wallet',
    withdraw: 'Withdraw',
    listProperty: 'List property',
    createSavingsPlan: 'Create a plan',
    rentCalculator: 'Rent calculator',
  },
  ha: {
    eyebrow: 'DANDALIN HAYA INGANTACCE A NAJERIYA',
    heroTitle: 'Nemo gidan da zai kwanta maka a rai.',
    heroSubtitle: 'Bincika gidaje masu tabbaci, sanya hannu kan yarjejeniyar haya ta zamani, tara kudin haya cikin sauki.',
    searchPlaceholder: 'Nemo Lekki, Maitama, Kano, Kaduna, Abuja…',
    explore: 'Bincika Gidaje',
    myHub: 'Shafina',
    tenancy: 'Yarjejeniya & Shari’a',
    rentSavings: 'Ajiyar Haya',
    services: 'Kaya & Tsafta',
    featuredHomes: 'Zaɓaɓɓun gidaje masu inganci',
    curatedForYou: 'ZAƁAƁƁU DOMINKU',
    totalSaved: 'JIMLAR AJIYAR KUDIN HAYA',
    walletBalance: 'RAGOWAR KUDIN WALLET',
    fundWallet: 'Saka kudi',
    withdraw: 'Cire kudi',
    listProperty: 'Saka gida',
    createSavingsPlan: 'ude sabon tsari',
    rentCalculator: 'Lissafin haya',
  },
  yo: {
    eyebrow: 'PÈPÈ ILÉ GBÍGBÉ TÍ A FỌWỌ́ SÍ NÍ NÀÌJÍRÍÀ',
    heroTitle: 'Wa ilé tí ó bá ọkàn rẹ mu.',
    heroSubtitle: 'Ṣàwárí àwọn ilé tí agbẹjọ́rò fọwọ́ sí, fọwọ́ sí ìwé àdéhùn ilé lórí ẹ̀rọ, kí o sì fi owó ilé pamọ́ ní ìrọ̀rùn.',
    searchPlaceholder: 'Wa Lekki, Ikeja, Bodija, Maitama…',
    explore: 'Ṣàwárí Ilé',
    myHub: 'Ibùdó Mi',
    tenancy: 'Àdéhùn & òfin',
    rentSavings: 'Ìfowópamọ́ Ilé',
    services: 'Ìkọ́kọ́rọ́ & Ìmọ́tótó',
    featuredHomes: 'Àwọn ilé tí a yàn fún ọ',
    curatedForYou: 'A YÀN FÚN Ọ',
    totalSaved: 'ÀPAPỌ̀ OWÓ TÍ A FI PAMỌ́ FÚN ILÉ',
    walletBalance: 'OWÓ TÍ Ó WÀ NÍNÚ ÀPÒ',
    fundWallet: 'Fi owó sí àpò',
    withdraw: 'Gba owó jáde',
    listProperty: 'Fi ilé sílẹ̀',
    createSavingsPlan: 'Bẹ̀rẹ̀ ètò tuntun',
    rentCalculator: 'Ẹ̀rọ ìṣirò owó ilé',
  },
  ig: {
    eyebrow: 'IKPO OKWU ỤLỌ E KWADORO NA NAỊJỊRỊA',
    heroTitle: 'Chọta ezigbo ụlọ dị gị mma.',
    heroSubtitle: 'Chọọ ụlọ ndị ọkaiwu nyochara, bịanye aka n’akwụkwọ nkwekọrịta ụlọ, ma chekwaa ego ụlọ gị n’udo.',
    searchPlaceholder: 'Chọọ Enugu, Lekki, Abuja, Port Harcourt…',
    explore: 'Chọọ Ụlọ',
    myHub: 'ọdụ M',
    tenancy: 'Nkwekọrịta & Iwu',
    rentSavings: 'Nchekwa Ego Ụlọ',
    services: 'Nkwakọ & Idebe Ọcha',
    featuredHomes: 'Ụlọ a họpụtara nke ọma',
    curatedForYou: 'A HỌPỤTARA MAKA GỊ',
    totalSaved: 'NGỤKỌTA EGO E CHEKWARA MAKA ỤLỌ',
    walletBalance: 'EGO DỊ N’AKPA',
    fundWallet: 'Tinye ego',
    withdraw: 'Were ego',
    listProperty: 'Tinye ụlọ ọhụrụ',
    createSavingsPlan: 'Mepụta atụmatụ',
    rentCalculator: 'Ngụkọ ego ụlọ',
  },
  fr: {
    eyebrow: 'PLATEFORME LOCATIVE VÉRIFIÉE AU NIGÉRIA',
    heroTitle: 'Trouvez un logement qui vous ressemble.',
    heroSubtitle: 'Recherchez des logements vérifiés par des avocats, signez vos baux numériques et épargnez votre loyer en toute confiance.',
    searchPlaceholder: 'Rechercher Lekki, Maitama, Victoria Island…',
    explore: 'Explorer',
    myHub: 'Mon Espace',
    tenancy: 'Baux & Juridique',
    rentSavings: 'Épargne Loyer',
    services: 'Déménagement & Entretien',
    featuredHomes: 'Logements vérifiés à la une',
    curatedForYou: 'SÉLECTIONNÉ POUR VOUS',
    totalSaved: 'TOTAL ÉPARGNÉ POUR LE LOYER',
    walletBalance: 'SOLDE DU PORTEFEUILLE',
    fundWallet: 'Recharger',
    withdraw: 'Retirer',
    listProperty: 'Publier un bien',
    createSavingsPlan: 'Créer un plan',
    rentCalculator: 'Calculateur de loyer',
  },
  ar: {
    eyebrow: 'منصة الإيجار الموثقة في نيجيريا',
    heroTitle: 'اعثر على منزل تشعر بأنه ملكك.',
    heroSubtitle: 'ابحث عن منازل موثقة قانونياً، وقع عقود الإيجار رقمياً، وادخر دفعات الإيجار بأمان.',
    searchPlaceholder: 'ابحث في ليكي، مايتاما، أبوجا، كانو…',
    explore: 'استكشاف',
    myHub: 'مركزي',
    tenancy: 'العقود والقانون',
    rentSavings: 'ادخار الإيجار',
    services: 'النقل والتعقيم',
    featuredHomes: 'منازل موثقة مميزة',
    curatedForYou: 'مختارة لك',
    totalSaved: 'إجمالي المدخرات للإيجار',
    walletBalance: 'رصيد المحفظة',
    fundWallet: 'شحن المحفظة',
    withdraw: 'سحب الرصيد',
    listProperty: 'إضافة عقار',
    createSavingsPlan: 'إنشاء خطة ادخار',
    rentCalculator: 'حاسبة الإيجار',
  },
};

export const NIGERIAN_STATES = [
  { name: 'Lagos', count: 142, areas: ['Lekki Phase 1', 'Victoria Island', 'Ikoyi', 'Ikeja GRA', 'Yaba'] },
  { name: 'FCT Abuja', count: 98, areas: ['Maitama', 'Wuse II', 'Gwarinpa', 'Jabi', 'Asokoro'] },
  { name: 'Rivers', count: 64, areas: ['Old GRA', 'New GRA Phase 2', 'Peter Odili Road', 'Trans Amadi'] },
  { name: 'Oyo', count: 51, areas: ['Bodija', 'Jericho GRA', 'Oluyole Estate', 'Samonda'] },
  { name: 'Kano', count: 43, areas: ['Nassarawa GRA', 'Tarauni', 'Hotoro GRA'] },
  { name: 'Enugu', count: 39, areas: ['Independence Layout', 'GRA Enugu', 'New Haven'] },
];

export const INITIAL_PROPERTIES: PropertyItem[] = [
  {
    id: 'prop-101',
    title: '4-Bedroom Serviced Terrace Duplex with BQ',
    property_type: 'duplex',
    state_name: 'Lagos',
    city: 'Lekki',
    area: 'Lekki Phase 1',
    full_address: 'Plot 14B Admiralty Way Extension, Lekki Phase 1, Lagos',
    price_yearly: 8500000,
    service_charge: 1200000,
    caution_fee: 500000,
    bedrooms: 4,
    bathrooms: 4,
    toilets: 5,
    parking_spaces: 3,
    verified: true,
    details_unlocked: true,
    saved: true,
    photo_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Alhaji Suleiman Danjuma',
    landlord_verified: true,
    lawyer_name: 'Barr. Chidinma Okafor & Co.',
    lawyer_scn: 'SCN/084921',
    amenities: ['24/7 Estate Security', 'Solar Inverter Backup', 'Treated Borehole Water', 'Fitted Kitchen', 'En-suite Boys Quarters', 'CCTV Surveillance'],
    structured_features: {
      power: 'Band A Grid + 10kVA Hybrid Solar Inverter',
      water: 'Industrial Reverse-Osmosis Treatment Plant',
      security: 'Biometric Access Gate + 24hr Armed Patrol',
      road_access: 'Fully Interlocked & Flood-Free Drainage',
    },
    damage_report: {
      inspected_at: '2026-10-18',
      inspector: 'Engr. Tunde Bakare (Amana Field Inspector)',
      overall_status: 'Clean & Move-In Ready',
      items: [
        { type: 'Water & Plumbing', status: 'Passed', note: 'All pressure valves and water heaters tested with zero leakage.' },
        { type: 'Electrical & Inverter', status: 'Passed', note: 'Distribution board labeled; earth resistance verified.' },
        { type: 'Walls & Dampness', status: 'Passed', note: 'Fresh Dulux satin coat; zero dampness on ground floor walls.' },
      ],
    },
  },
  {
    id: 'prop-102',
    title: 'Luxury 3-Bedroom Waterfront Apartment',
    property_type: 'apartment',
    state_name: 'Lagos',
    city: 'Victoria Island',
    area: 'Oniru / Victoria Island',
    full_address: '19 Water Corporation Drive, Oniru Estate, Victoria Island, Lagos',
    price_yearly: 6500000,
    service_charge: 950000,
    caution_fee: 400000,
    bedrooms: 3,
    bathrooms: 3,
    toilets: 4,
    parking_spaces: 2,
    verified: true,
    details_unlocked: false,
    saved: false,
    photo_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Chief Mrs. Folake Adeyemi',
    landlord_verified: true,
    lawyer_name: 'Barr. Olumide Banjo Chambers',
    lawyer_scn: 'SCN/063110',
    amenities: ['Swimming Pool', 'Elevator Access', 'Gymnasium', '24hr Power Supply', 'Fiber Internet Ready'],
    structured_features: {
      power: '24hr Central Estate Generators + EKEDC Priority Line',
      water: 'Central Treated Water Supply',
      security: 'Uniformed Corporate Guards + Intercom',
      road_access: 'Paved Dual Carriageway',
    },
    damage_report: {
      inspected_at: '2026-10-22',
      inspector: 'Arc. Kemi Adesina (Amana Field Inspector)',
      overall_status: 'Clean & Move-In Ready',
      items: [
        { type: 'Balcony Glazing', status: 'Passed', note: 'Tempered glass railings secure and sealed.' },
        { type: 'AC & Ventilation', status: 'Passed', note: '4 split Panasonic inverter units serviced.' },
      ],
    },
  },
  {
    id: 'prop-103',
    title: 'Executive 4-Bedroom Detached Bungalow',
    property_type: 'house',
    state_name: 'FCT Abuja',
    city: 'Abuja',
    area: 'Maitama / Wuse II Border',
    full_address: '8 Yedseram Close, Maitama District, FCT Abuja',
    price_yearly: 7200000,
    service_charge: 600000,
    caution_fee: 450000,
    bedrooms: 4,
    bathrooms: 4,
    toilets: 5,
    parking_spaces: 4,
    verified: true,
    details_unlocked: true,
    saved: false,
    photo_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Amb. Ibrahim Musa Abdullahi',
    landlord_verified: true,
    lawyer_name: 'Barr. Amina Bello Legal Consult',
    lawyer_scn: 'SCN/091445',
    amenities: ['Private Compound', 'Gatehouse', 'Solar Streetlights', 'Lush Garden', 'Prepaid Meter'],
    structured_features: {
      power: 'AEDC Band A + 7.5kVA Solar Backup',
      water: 'FCT Water Board + Motorized Borehole',
      security: 'Electric Perimeter Fence + Diplomatic Patrol Zone',
      road_access: 'Tarred Boulevard to Express',
    },
    damage_report: {
      inspected_at: '2026-10-20',
      inspector: 'Engr. Kabir Usman (Amana Field Inspector)',
      overall_status: 'Clean & Move-In Ready',
      items: [
        { type: 'Roofing & Ceiling', status: 'Passed', note: 'Stone-coated Gerard tiles inspected; zero roof leak.' },
        { type: 'Water Pressure', status: 'Passed', note: 'Overhead tank + booster pump active.' },
      ],
    },
  },
  {
    id: 'prop-104',
    title: 'Furnished 2-Bedroom Executive Short-Let Suite',
    property_type: 'short_let',
    state_name: 'Rivers',
    city: 'Port Harcourt',
    area: 'New GRA Phase 2',
    full_address: '24 Tombia Extension, New GRA Phase 2, Port Harcourt',
    price_yearly: 4200000,
    service_charge: 480000,
    caution_fee: 250000,
    bedrooms: 2,
    bathrooms: 2,
    toilets: 3,
    parking_spaces: 2,
    verified: true,
    details_unlocked: false,
    saved: true,
    photo_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Dr. Tamuno Briggs',
    landlord_verified: true,
    lawyer_name: 'Barr. Nyesom Wobo & Associates',
    lawyer_scn: 'SCN/077203',
    amenities: ['Starlink Wi-Fi', 'Smart TV & Netflix', 'Housekeeping Twice Weekly', '24hr Power'],
    structured_features: {
      power: 'Dual Soundproof Generators + Inverter',
      water: 'Triple Filtration Borehole System',
      security: 'Gated Close + Access Code',
      road_access: 'Tarred Road off Tombia',
    },
    damage_report: {
      inspected_at: '2026-10-25',
      inspector: 'Engr. Victor Pepple (Amana Field Inspector)',
      overall_status: 'Clean & Move-In Ready',
      items: [
        { type: 'Appliances & Furnishing', status: 'Passed', note: 'Washer-dryer, microwave, and orthopedic mattresses verified.' },
      ],
    },
  },
  {
    id: 'prop-105',
    title: 'Modern 3-Bedroom Flat in Gated Court',
    property_type: 'apartment',
    state_name: 'Oyo',
    city: 'Ibadan',
    area: 'Bodija / Jericho GRA',
    full_address: '11 Awolowo Avenue, Old Bodija Estate, Ibadan',
    price_yearly: 2400000,
    service_charge: 250000,
    caution_fee: 200000,
    bedrooms: 3,
    bathrooms: 3,
    toilets: 4,
    parking_spaces: 2,
    verified: true,
    details_unlocked: true,
    saved: false,
    photo_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Prof. Akinwumi Olatunji',
    landlord_verified: true,
    lawyer_name: 'Barr. Femi Adesanya LP',
    lawyer_scn: 'SCN/052891',
    amenities: ['Prepaid Meter', 'Borehole Water', 'POP Ceiling', 'Security House', 'Wardrobes'],
    structured_features: {
      power: 'Separate Prepaid Meter + Inverter Wiring',
      water: 'Dedicated Borehole & 4,000L Storage',
      security: 'Estate Gate Pass + Night Watch',
      road_access: 'Smooth Asphalt Road',
    },
    damage_report: {
      inspected_at: '2026-10-19',
      inspector: 'Surv. Dayo Alabi (Amana Field Inspector)',
      overall_status: 'Minor Cosmetic Note',
      items: [
        { type: 'Plumbing & Tiling', status: 'Passed', note: 'All vitrified floor tiles intact; kitchen sink mixer newly replaced.' },
      ],
    },
  },
  {
    id: 'prop-106',
    title: '5-Bedroom Contemporary Duplex with Garden',
    property_type: 'duplex',
    state_name: 'Enugu',
    city: 'Enugu',
    area: 'Independence Layout',
    full_address: '6 Nza Street, Independence Layout, Enugu',
    price_yearly: 4800000,
    service_charge: 350000,
    caution_fee: 300000,
    bedrooms: 5,
    bathrooms: 5,
    toilets: 6,
    parking_spaces: 4,
    verified: true,
    details_unlocked: true,
    saved: false,
    photo_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80',
    ],
    landlord_name: 'Chief Chukwuma Nwosu',
    landlord_verified: true,
    lawyer_name: 'Barr. Ifeanyi Eze & Partners',
    lawyer_scn: 'SCN/069312',
    amenities: ['Spacious Family Lounge', 'Walk-in Closet', 'CCTV Cameras', 'Automated Gate', 'Generator House'],
    structured_features: {
      power: '3-Phase Prepaid Meter + Solar Floodlights',
      water: 'Constant Borehole & Overhead Tank',
      security: 'High Fence + Razor Wire + Estate Security',
      road_access: 'Paved Street off Bisalla Road',
    },
    damage_report: {
      inspected_at: '2026-10-24',
      inspector: 'Engr. Obinna Nnaji (Amana Field Inspector)',
      overall_status: 'Clean & Move-In Ready',
      items: [
        { type: 'Structural & Roof', status: 'Passed', note: 'Zero cracks; freshly painted interior and exterior.' },
      ],
    },
  },
];

export const INITIAL_TENANCY_AGREEMENTS: TenancyAgreementItem[] = [
  {
    id: 'AGR-2026-0891',
    property_id: 'prop-101',
    property_title: '4-Bedroom Serviced Terrace Duplex with BQ',
    location: 'Lekki Phase 1, Lagos',
    tenant_name: 'Chinedu Okafor',
    landlord_name: 'Alhaji Suleiman Danjuma',
    lawyer_name: 'Barr. Chidinma Okafor (SCN/084921)',
    annual_rent: 8500000,
    start_date: '2026-11-01',
    end_date: '2027-10-31',
    status: 'PENDING_TENANT_SIGNATURE',
    updated_at: '2 hours ago',
    clauses: [
      '1. RENT & TENURE: Annual rent of ₦8,500,000 payable in advance for 12 calendar months commencing 1st November 2026.',
      '2. SERVICE CHARGE ESCROW: Service charge of ₦1,200,000 held in Amana Audited Facility Account for estate power, water treatment, and security.',
      '3. REFUNDABLE CAUTION DEPOSIT: ₦500,000 held in neutral escrow and refundable within 14 days of vacate inspection subject to the baseline Damage Report.',
      '4. STATUTORY NOTICE & GRACE PERIOD: Protected under Lagos State Tenancy Law with mandatory statutory notice and Amana Mediation before any dispute filing.',
    ],
  },
  {
    id: 'AGR-2026-0744',
    property_id: 'prop-103',
    property_title: 'Executive 4-Bedroom Detached Bungalow',
    location: 'Maitama District, FCT Abuja',
    tenant_name: 'Aisha Abdullahi',
    landlord_name: 'Amb. Ibrahim Musa Abdullahi',
    lawyer_name: 'Barr. Amina Bello (SCN/091445)',
    annual_rent: 7200000,
    start_date: '2026-09-01',
    end_date: '2027-08-31',
    status: 'FULLY_EXECUTED',
    updated_at: 'Executed on 28 Aug 2026',
    clauses: [
      '1. RENT & TENURE: Annual rent of ₦7,200,000 paid and receipted via Amana Escrow Ref #PAY-99412.',
      '2. QUIET ENJOYMENT: Landlord covenants uninterrupted possession and 48-hour prior notice before scheduled maintenance inspections.',
      '3.NBA STAMP & SEAL: Digitally sealed and registered by Barr. Amina Bello (SCN/091445).',
    ],
  },
  {
    id: 'AGR-2026-0912',
    property_id: 'prop-105',
    property_title: 'Modern 3-Bedroom Flat in Gated Court',
    location: 'Old Bodija Estate, Ibadan',
    tenant_name: 'Toluwani Adeyinka',
    landlord_name: 'Prof. Akinwumi Olatunji',
    lawyer_name: 'Barr. Femi Adesanya (SCN/052891)',
    annual_rent: 2400000,
    start_date: '2026-11-15',
    end_date: '2027-11-14',
    status: 'PENDING_LANDLORD_SIGNATURE',
    updated_at: 'Yesterday',
    clauses: [
      '1. RENT & TENURE: Annual rent of ₦2,400,000 for 12 months.',
      '2. STRUCTURAL REPAIRS: Landlord remains responsible for roof, external walls, and borehole pump maintenance.',
    ],
  },
];

export const INITIAL_SAVINGS_GOALS: SavingsGoalItem[] = [
  {
    id: 'PLAN-401',
    title: '2027 Lekki Phase 1 Renewal Target',
    target_savings_amount: 8500000,
    total_saved: 5450000,
    frequency: 'Monthly',
    rent_due_date: '2027-09-30',
    automated: true,
    status: 'active',
  },
  {
    id: 'PLAN-402',
    title: 'Service Charge & Utility Buffer',
    target_savings_amount: 1200000,
    total_saved: 960000,
    frequency: 'Weekly',
    rent_due_date: '2027-03-15',
    automated: true,
    status: 'active',
  },
];

export const INITIAL_SERVICE_BOOKINGS: ServiceBookingItem[] = [
  {
    id: 'SRV-881',
    category: 'transportation',
    service_name: '5-Ton Covered Box Truck + 4 Verified Loaders',
    pickup_or_address: 'Yaba, Lagos',
    destination: 'Lekki Phase 1, Lagos',
    scheduled_date: '2026-11-02 • 08:30 AM',
    amount: 145000,
    status: 'Scheduled',
    provider_name: 'Amana Transit Fleet (LAG-04)',
  },
  {
    id: 'SRV-882',
    category: 'fumigation',
    service_name: 'EHORECON-Certified Pre-Move-In Fumigation & Deep Clean',
    pickup_or_address: 'Plot 14B Admiralty Way Extension, Lekki Phase 1',
    scheduled_date: '2026-10-31 • 11:00 AM',
    amount: 85000,
    status: 'Completed',
    provider_name: 'Amana Hygiene & Pest Control Ops',
  },
];

export const VERIFIED_LAWYERS: LawyerProfile[] = [
  {
    id: 'law-1',
    name: 'Barr. Chidinma Okafor',
    scn: 'SCN/084921',
    state: 'Lagos',
    chamber: 'Okafor, Danjuma & Legal Partners',
    specialization: 'Tenancy Law, Escrow Conveyancing & Rent Tribunal Mediation',
    verified_cases: 184,
    rating: 4.9,
  },
  {
    id: 'law-2',
    name: 'Barr. Amina Bello',
    scn: 'SCN/091445',
    state: 'FCT Abuja',
    chamber: 'Bello & Associates Chambers',
    specialization: 'FCT Property Documentation & Lease Execution',
    verified_cases: 142,
    rating: 4.9,
  },
  {
    id: 'law-3',
    name: 'Barr. Olumide Banjo',
    scn: 'SCN/063110',
    state: 'Lagos',
    chamber: 'Banjo Commercial & Property Law',
    specialization: 'Commercial Leases, Short-Let Compliance & Dispute Resolution',
    verified_cases: 219,
    rating: 4.8,
  },
  {
    id: 'law-4',
    name: 'Barr. Nyesom Wobo',
    scn: 'SCN/077203',
    state: 'Rivers',
    chamber: 'Wobo & Niger Delta Property Counsel',
    specialization: 'Residential Tenancy & Damage Deposit Arbitration',
    verified_cases: 97,
    rating: 4.9,
  },
];
