const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {
    createRequire
  } = require('module');
const {
  canManageStaff,
  identityDestination,
  actionsForStatus,
  freshForm,
  identityPayload
} = require('../src/utils/staffIdentityManagement.cjs');
const catalog = {
  engagement_types: {
    field_agent: 'Field agent',
    volunteer: 'Volunteer'
  },
  approved_activity_catalog: [{
    code: 'provide_platform_support'
  }]
};
const valid = () => ({
  ...freshForm(),
  user_id: '9',
  full_name: 'Test Worker',
  official_role: 'Support',
  department: 'Customer support',
  approved_activities: ['provide_platform_support']
});
test('Super Admin uses management while staff retain their personal identity entry', () => {
  assert.equal(canManageStaff({
    user_type: 'super_admin'
  }), true);
  for (const user_type of ['admin', 'agent', 'marketing_agent', 'tenant', 'landlord', undefined]) assert.equal(canManageStaff({
    user_type
  }), false);
  assert.equal(identityDestination({
    user_type: 'super_admin'
  }), 'StaffIdentityManagement');
  assert.equal(identityDestination({
    user_type: 'agent'
  }), 'MyStaffIdentity');
});
test('identity payload requires an existing account and does not submit approval or account privileges', () => {
  const payload = identityPayload({
    ...valid(),
    status: 'active',
    user_type: 'super_admin',
    financial_collection_authorized: 'true'
  }, catalog);
  assert.equal(payload.user_id, 9);
  assert.equal(payload.financial_collection_authorized, false);
  assert.equal(payload.status, undefined);
  assert.equal(payload.user_type, undefined);
  assert.equal(identityPayload(valid(), catalog, false).user_id, undefined);
  assert.throws(() => identityPayload({
    ...valid(),
    user_id: ''
  }, catalog), /Select/);
});
test('unknown activities, invalid dates and reversed validity cannot be submitted', () => {
  for (const patch of [{
    approved_activities: ['collect_personal_payments']
  }, {
    valid_from: '2026-02-30'
  }, {
    expires_at: 'not-a-date'
  }, {
    valid_from: '2026-11-26',
    expires_at: '2026-11-25'
  }, {
    engagement_type: 'made_up'
  }]) assert.throws(() => identityPayload({
    ...valid(),
    ...patch
  }, catalog));
  assert.equal(identityPayload({
    ...valid(),
    expires_at: ''
  }, catalog).expires_at, null);
});
test('management offers review and status actions without changing personal enrolment', () => {
  assert.deepEqual(actionsForStatus('pending_approval'), ['approve', 'reject']);
  assert.deepEqual(actionsForStatus('active'), ['suspend', 'revoke']);
  assert.deepEqual(actionsForStatus('suspended'), ['reinstate', 'revoke']);
  assert.deepEqual(actionsForStatus('unknown'), []);
});
function serviceFixture() {
  const requests = [],
    module = {
      exports: {}
    },
    api = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, async (...args) => {
      requests.push({
        method,
        args
      });
      return {
        data: {
          success: true,
          data: []
        }
      };
    }]));
  const source = require('@babel/core').transformSync(fs.readFileSync(path.resolve(__dirname, '../src/services/staffVerificationService.js'), 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  class FormData {
    constructor() {
      this.parts = [];
    }
    append(...args) {
      this.parts.push(args);
    }
  }
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    FormData,
    require: name => name === './api' ? {
      __esModule: true,
      default: api,
      API_BASE_URL: 'https://rentalhub.com.ng/api'
    } : null
  });
  return {
    service: module.exports.staffVerificationService,
    requests
  };
}
test('mobile management uses the existing server routes and sends audit reasons', async () => {
  const {
    service,
    requests
  } = serviceFixture();
  await service.getAdminCatalog();
  await service.listIdentities({
    status: 'active',
    search: 'Test',
    limit: 50,
    offset: 50
  });
  await service.createIdentity(valid());
  await service.updateIdentity(7, {
    department: 'Support'
  });
  await service.updateIdentityStatus(7, 'approve', 'Photo and documents checked');
  await service.regenerateIdentityId(7);
  await service.getAdminHistory();
  await service.listImpersonationReports();
  await service.updateImpersonationReport(8, {
    status: 'resolved',
    investigation_notes: 'Outcome recorded'
  });
  assert.equal(requests[0].args[0], '/staff-verification/admin/catalog');
  assert.equal(requests[1].args[1].params.offset, 50);
  assert.equal(requests[2].args[0], '/staff-verification/admin/identities');
  assert.equal(requests[3].method, 'patch');
  assert.equal(requests[4].args[1].reason, 'Photo and documents checked');
  assert.equal(requests[5].args[0], '/staff-verification/admin/identities/7/regenerate-id');
  assert.equal(requests[8].args[0], '/staff-verification/admin/impersonation-reports/8');
});
test('official photo upload uses the existing multipart photo field', async () => {
  const {
    service,
    requests
  } = serviceFixture();
  await service.uploadIdentityPhoto(7, {
    uri: 'file:///cache/photo.png',
    name: 'photo.png',
    mimeType: 'image/png'
  });
  assert.equal(requests[0].args[0], '/staff-verification/admin/identities/7/photo');
  assert.equal(requests[0].args[1].parts[0][0], 'photo');
  assert.equal(requests[0].args[1].parts[0][1].type, 'image/png');
});
const clientRequire = createRequire(path.resolve(__dirname, '../../client/package.json'));
const {
    JSDOM
  } = clientRequire('jsdom'),
  dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/'
  });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = clientRequire('react'),
  {
    createRoot
  } = clientRequire('react-dom/client'),
  {
    fireEvent,
    within
  } = clientRequire('@testing-library/dom');
const h = React.createElement,
  AuthContext = React.createContext(null),
  babel = require('@babel/core');
function uiFixture() {
  let record = {
    id: 7,
    user_id: 9,
    staff_verification_id: 'TEST-STAFF',
    full_name: 'Test Worker',
    official_role: 'Support agent',
    department: 'Support',
    engagement_type: 'field_agent',
    status: 'pending_approval',
    approved_activities: [],
    approved_activities_detailed: []
  };
  const calls = [],
    state = {
      delay: null,
      picked: {
        canceled: true
      }
    },
    ok = data => ({
      data: {
        success: true,
        data
      }
    }),
    service = {
      getAdminCatalog: async () => ok(catalog),
      listIdentities: async params => {
        calls.push(['list', params]);
        return state.delay ? state.delay : ok([record]);
      },
      getAdminHistory: async () => ok({
        events: [],
        challenges: [],
        suspicious_activity: []
      }),
      listImpersonationReports: async () => ok([]),
      getEligibleUsers: async search => {
        calls.push(['users', search]);
        return ok([{
          id: 9,
          full_name: 'Test Worker',
          email: 'staff@example.test',
          user_type: 'admin'
        }]);
      },
      createIdentity: async payload => {
        calls.push(['create', payload]);
        return ok({
          ...record,
          ...payload,
          status: 'pending_approval'
        });
      },
      updateIdentityStatus: async (id, action, reason) => {
        calls.push(['status', id, action, reason]);
        record = {
          ...record,
          status: 'active'
        };
        return ok(record);
      },
      updateIdentity: async (id, payload) => {
        calls.push(['edit', id, payload]);
        return ok({
          ...record,
          ...payload
        });
      },
      uploadIdentityPhoto: async () => ok(record)
    };
  const text = ({
    children,
    accessibilityRole
  }) => h('span', {
    role: accessibilityRole
  }, children);
  const button = ({
    title,
    onPress,
    disabled
  }) => h('button', {
    onClick: onPress,
    disabled
  }, title);
  const input = ({
    label,
    value,
    onChangeText
  }) => h('label', null, label, h('input', {
    value,
    onChange: e => onChangeText(e.target.value)
  }));
  const native = {
    View: ({
      children
    }) => h('div', null, children),
    ScrollView: ({
      children
    }) => h('div', null, children),
    KeyboardAvoidingView: ({
      children
    }) => h('div', null, children),
    Image: () => null,
    ActivityIndicator: () => h('span', null, 'Loading'),
    Platform: {
      OS: 'android'
    },
    StyleSheet: {
      create: value => value
    },
    Switch: ({
      value,
      onValueChange,
      accessibilityLabel
    }) => h('input', {
      type: 'checkbox',
      checked: value,
      'aria-label': accessibilityLabel,
      onChange: e => onValueChange(e.target.checked)
    }),
    Modal: ({
      visible,
      children
    }) => visible ? h('div', {
      role: 'dialog'
    }, children) : null,
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent
    }) => h('div', null, ListHeaderComponent, data.length ? data.map((item, index) => h('div', {
      key: index
    }, renderItem({
      item
    }))) : ListEmptyComponent, ListFooterComponent)
  };
  const theme = {
    colors: {
      surface: '#fff',
      navy: '#000',
      text: '#000',
      blue: '#00f',
      muted: '#555',
      white: '#fff',
      border: '#aaa',
      danger: '#a00'
    },
    radius: {
      md: 10
    },
    typography: {
      bold: 'bold',
      semibold: 'semi'
    },
    typeScale: {
      xs: 13,
      sm: 14,
      base: 16,
      xl: 24
    }
  };
  const mocks = {
    react: React,
    'react-native': native,
    'react-native-safe-area-context': {
      SafeAreaView: 'div'
    },
    'expo-document-picker': {
      getDocumentAsync: async () => state.picked
    },
    'expo-file-system': {
      File: class {
        delete() {}
      },
      Paths: {
        cache: {
          uri: 'file:///cache/'
        }
      }
    },
    'react-native-toast-message': {
      default: {
        show() {}
      },
      __esModule: true
    },
    '../../context/AuthContext': {
      AuthContext
    },
    '../../components/common/AppText': {
      default: text,
      __esModule: true
    },
    '../../components/common/Button': {
      default: button,
      __esModule: true
    },
    '../../components/common/Input': {
      default: input,
      __esModule: true
    },
    '../../components/common/SelectField': {
      default: ({
        label,
        value,
        onPress
      }) => h('button', {
        onClick: onPress
      }, label + ': ' + (value || 'Choose')),
      __esModule: true
    },
    '../../components/common/OptionPickerModal': {
      default: ({
        visible,
        options,
        onSelect,
        onClose
      }) => visible ? h('div', {
        role: 'dialog'
      }, options.map(option => h('button', {
        key: option.value,
        onClick: () => {
          onSelect(option);
          onClose();
        }
      }, option.label))) : null,
      __esModule: true
    },
    '../../components/common/EmptyState': {
      default: ({
        title,
        message
      }) => h('div', null, title, message),
      __esModule: true
    },
    '../../components/common/StatusBadge': {
      default: ({
        status
      }) => h('span', null, status),
      __esModule: true
    },
    '../../components/admin/OperationNoteModal': {
      default: props => props.visible ? h('button', {
        onClick: () => props.onConfirm('Photo and documents checked')
      }, 'Confirm decision') : null,
      __esModule: true
    },
    '../shared/MyStaffIdentityScreen': {
      default: () => h('p', null, 'Personal staff identity'),
      __esModule: true
    },
    '../../services/staffVerificationService': {
      __esModule: true,
      default: service,
      resolveStaffPhotoUrl: () => null
    },
    '../../utils/http': {
      getErrorMessage: (error, fallback) => error.message || fallback
    },
    '../../utils/staffIdentityManagement.cjs': require('../src/utils/staffIdentityManagement.cjs'),
    '../../theme': theme
  };
  const module = {
    exports: {}
  };
  vm.runInNewContext(babel.transformSync(fs.readFileSync(path.resolve(__dirname, '../src/screens/admin/StaffIdentityManagementScreen.js'), 'utf8'), {
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-react', {
      runtime: 'classic'
    }]],
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in mocks)) throw Error('Unmocked dependency ' + name);
      return mocks[name];
    },
    Date,
    Map,
    Set
  });
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node),
    navigation = {
      setOptions() {},
      navigate() {}
    };
  return {
    calls,
    state,
    node,
    render: async (role = 'super_admin', entry = false) => React.act(async () => root.render(h(AuthContext.Provider, {
      value: {
        user: {
          id: 1,
          user_type: role
        },
        isImpersonating: false
      }
    }, h(entry ? module.exports.StaffIdentityEntryScreen : module.exports.default, {
      navigation
    })))),
    click: async name => React.act(async () => fireEvent.click(within(node).getByRole('button', {
      name
    }))),
    change: async (name, value) => React.act(async () => fireEvent.change(within(node).getByLabelText(name), {
      target: {
        value
      }
    })),
    close: async () => {
      await React.act(async () => root.unmount());
      node.remove();
    }
  };
}
test('non-Super Admin cannot fetch management records; staff keep personal identity', async () => {
  const f = uiFixture();
  try {
    await f.render('tenant');
    assert.ok(f.node.textContent.includes('Super Admin access required'));
    assert.equal(f.calls.length, 0);
    await f.render('admin', true);
    assert.ok(f.node.textContent.includes('Personal staff identity'));
    assert.equal(f.calls.length, 0);
  } finally {
    await f.close();
  }
});
test('Super Admin old personal link opens management and approval forwards the entered reason', async () => {
  const f = uiFixture();
  try {
    await f.render('super_admin', true);
    assert.ok(f.node.textContent.includes('Staff Identity Management'));
    assert.ok(!f.node.textContent.includes('Personal staff identity'));
    await f.click('Approve');
    await f.click('Confirm decision');
    const action = f.calls.find(call => call[0] === 'status');
    assert.deepEqual(action, ['status', 7, 'approve', 'Photo and documents checked']);
    assert.ok(f.node.textContent.includes('active'));
  } finally {
    await f.close();
  }
});
test('new staff ID creation selects an existing account and keeps approval server-controlled', async () => {
  const f = uiFixture();
  try {
    await f.render();
    await f.click('Register staff identity');
    await f.change('Find an existing staff account', 'Test');
    await f.click('Search staff accounts');
    await f.click('Staff account: Choose');
    await f.click('Test Worker · staff@example.test · Admin');
    await f.change('Official role', 'Support officer');
    await f.change('Department', 'Customer support');
    await f.click('Create pending staff identity');
    const call = f.calls.find(row => row[0] === 'create');
    assert.equal(call[1].user_id, 9);
    assert.equal(call[1].official_role, 'Support officer');
    assert.equal(call[1].status, undefined);
  } finally {
    await f.close();
  }
});
test('a pending admin response cannot reveal records after the account role changes', async () => {
  const f = uiFixture();
  let finish;
  f.state.delay = new Promise(resolve => {
    finish = resolve;
  });
  try {
    await f.render();
    await f.render('tenant');
    await React.act(async () => finish({
      data: {
        success: true,
        data: [{
          id: 99,
          full_name: 'Private Staff'
        }]
      }
    }));
    assert.ok(!f.node.textContent.includes('Private Staff'));
    assert.ok(f.node.textContent.includes('Super Admin access required'));
  } finally {
    await f.close();
  }
});
test('dashboard management entry and legacy link are connected without a duplicate personal Super Admin card', () => {
  const read = file => fs.readFileSync(path.resolve(__dirname, '../' + file), 'utf8');
  const dashboard = read('src/screens/admin/SuperAdminDashboardScreen.js'),
    navigator = read('src/navigation/AppNavigator.js');
  assert.match(dashboard, /label:\s*'Staff Identity Management',\s*route:\s*'StaffIdentityManagement'/);
  assert.doesNotMatch(dashboard, /label:\s*'My Staff Identity'/);
  assert.match(navigator, /name="MyStaffIdentity" component=\{StaffIdentityEntryScreen\}/);
  assert.match(navigator, /const SuperAdminRoot[\s\S]*?name="StaffIdentityManagement" component=\{StaffIdentityManagementScreen\}/);
});
test('account shortcuts hide personal Staff ID for Super Admin and preserve it for staff', () => {
  let user;
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/admin/AdminAccountActions.js'), 'utf8'),
    module = {
      exports: {}
    };
  const fakeReact = {
    createElement: (type, props, ...children) => ({
      type,
      props: props || {},
      children
    }),
    useContext: () => ({
      user
    })
  };
  vm.runInNewContext(babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-react', {
      runtime: 'classic'
    }]],
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code, {
    module,
    exports: module.exports,
    require: name => {
      if (name === 'react') return fakeReact;
      if (name === 'react-native') return {
        StyleSheet: {
          create: value => value
        },
        View: 'View',
        TouchableOpacity: 'Button',
        Alert: {
          alert() {}
        }
      };
      if (name.endsWith('/AuthContext')) return {
        AuthContext: {}
      };
      if (name.endsWith('/theme')) return {
        colors: {
          blue: '#00f'
        },
        radius: {
          md: 10
        },
        shadows: {
          soft: {}
        },
        typography: {},
        typeScale: {}
      };
      if (name.endsWith('/useAccessibilityPreferences')) return {
        useAccessibilityPreferences: () => ({})
      };
      return {
        __esModule: true,
        default: () => null
      };
    }
  });
  const nav = [],
    navigation = {
      navigate: route => nav.push(route)
    },
    labels = tree => tree.children.filter(Boolean).map(item => item.props?.label);
  user = {
    user_type: 'super_admin'
  };
  assert.deepEqual(labels(module.exports.default({
    navigation
  })), ['Profile', 'Settings', 'Logout']);
  user = {
    user_type: 'admin'
  };
  const staffTree = module.exports.default({
    navigation
  });
  assert.deepEqual(labels(staffTree), ['Profile', 'Staff ID', 'Settings', 'Logout']);
  staffTree.children.find(item => item?.props?.label === 'Staff ID').props.onPress();
  assert.deepEqual(nav, ['MyStaffIdentity']);
});
