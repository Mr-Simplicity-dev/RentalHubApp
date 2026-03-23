import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { superAdminService } from '../../services/superAdminService';
import { authService } from '../../services/authService';
import { buildUploadUrl, getErrorMessage, pickList, pickObject } from '../../utils/http';

const sections = [
  'overview',
  'users',
  'verifications',
  'lawyer_invites',
  'pricing',
  'properties',
  'reports',
  'broadcasts',
  'flags',
  'fraud',
  'logs',
];

const defaultPricingForm = {
  applies_to: 'tenant_registration',
  state_id: '',
  lga_name: '',
  amount: '',
  is_active: true,
};

const SectionButton = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>
      {String(label).replace(/_/g, ' ')}
    </Text>
  </TouchableOpacity>
);

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SuperAdminDashboardScreen = () => {
  const [section, setSection] = useState('overview');
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reports, setReports] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [lawyerInvites, setLawyerInvites] = useState([]);
  const [flags, setFlags] = useState([]);
  const [fraud, setFraud] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adminPerformance, setAdminPerformance] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingTargets, setPricingTargets] = useState([]);
  const [pricingLocations, setPricingLocations] = useState([]);
  const [editingPricingRuleId, setEditingPricingRuleId] = useState(null);
  const [showPricingStatePicker, setShowPricingStatePicker] = useState(false);
  const [showPricingLgaPicker, setShowPricingLgaPicker] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    target_role: '',
  });
  const [verificationFilters, setVerificationFilters] = useState({
    search: '',
    status: 'pending',
    user_type: 'all',
  });
  const [pricingForm, setPricingForm] = useState(defaultPricingForm);
  const [lawyerInviteSearch, setLawyerInviteSearch] = useState('');
  const [editingInviteId, setEditingInviteId] = useState(null);
  const [editingInviteEmail, setEditingInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedPricingState = useMemo(
    () => pricingLocations.find((item) => String(item.id) === String(pricingForm.state_id)),
    [pricingForm.state_id, pricingLocations]
  );

  const availablePricingLgas = selectedPricingState?.lgas || [];

  const loadLawyerInvites = async (search = lawyerInviteSearch) => {
    const response = await authService.getLawyerInvites({
      search: search || undefined,
    });
    setLawyerInvites(pickList(response, ['data']));
  };

  const loadVerificationData = async (filters = verificationFilters) => {
    const [verificationsResponse, performanceResponse] = await Promise.all([
      superAdminService.getVerifications(filters),
      superAdminService.getAdminsPerformance(),
    ]);

    setVerifications(pickList(verificationsResponse, ['data', 'verifications']));
    setAdminPerformance(pickList(performanceResponse, ['data']));
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        usersResponse,
        propertiesResponse,
        analyticsResponse,
        reportsResponse,
        broadcastsResponse,
        lawyerInvitesResponse,
        flagsResponse,
        fraudResponse,
        logsResponse,
        pricingResponse,
      ] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties(),
        superAdminService.getAnalytics(),
        superAdminService.getReports(),
        superAdminService.getBroadcasts(),
        authService.getLawyerInvites(),
        superAdminService.getFlags(),
        superAdminService.getFraudFlags(),
        superAdminService.getLogs(),
        superAdminService.getPricingRules(),
      ]);

      setUsers(pickList(usersResponse, ['users', 'data']));
      setProperties(pickList(propertiesResponse, ['properties', 'data']));
      setAnalytics(pickObject(analyticsResponse, ['data']) || {});
      setReports(pickList(reportsResponse, ['reports', 'data']));
      setBroadcasts(pickList(broadcastsResponse, ['broadcasts', 'data']));
      setLawyerInvites(pickList(lawyerInvitesResponse, ['data']));
      setFlags(pickList(flagsResponse, ['flags', 'data']));
      setFraud(pickList(fraudResponse, ['flags', 'data']));
      setLogs(pickList(logsResponse, ['logs', 'data']));

      const pricingPayload = pickObject(pricingResponse, ['data']) || {};
      setPricingRules(pricingPayload.rules || []);
      setPricingTargets(pricingPayload.targets || []);
      setPricingLocations(pricingPayload.locations || []);

      await loadVerificationData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load super admin data'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runAction = async (action, successMessage, reload = loadAll) => {
    try {
      setSubmitting(true);
      await action();
      if (reload) {
        await reload();
      }
      Toast.show({ type: 'success', text1: successMessage });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Action failed'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetPricingForm = () => {
    setEditingPricingRuleId(null);
    setPricingForm(defaultPricingForm);
  };

  const handleSavePricingRule = async () => {
    if (!pricingForm.state_id) {
      Toast.show({ type: 'error', text1: 'Select a state' });
      return;
    }

    if (!pricingForm.amount) {
      Toast.show({ type: 'error', text1: 'Enter the amount to charge' });
      return;
    }

    const payload = {
      applies_to: pricingForm.applies_to,
      state_id: Number(pricingForm.state_id),
      lga_name: pricingForm.lga_name || undefined,
      amount: Number(pricingForm.amount),
      is_active: pricingForm.is_active,
    };

    await runAction(
      async () => {
        if (editingPricingRuleId) {
          await superAdminService.updatePricingRule(editingPricingRuleId, payload);
        } else {
          await superAdminService.createPricingRule(payload);
        }
        resetPricingForm();
      },
      editingPricingRuleId ? 'Pricing rule updated' : 'Pricing rule created'
    );
  };

  const renderOverview = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Analytics Overview</Text>
      {Object.keys(analytics).length === 0 ? (
        <Text style={styles.meta}>No analytics data.</Text>
      ) : (
        Object.entries(analytics).map(([key, value]) => (
          <Text key={key} style={styles.meta}>
            {key}: {String(value)}
          </Text>
        ))
      )}
    </View>
  );

  const renderUsers = () =>
    users.map((item) => (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.full_name}</Text>
        <Text style={styles.meta}>{item.email}</Text>
        <Text style={styles.meta}>Role: {item.user_type}</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => runAction(() => superAdminService.banUser(item.id), 'User banned')}>
            <Text style={styles.warnText}>Ban</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => runAction(() => superAdminService.unbanUser(item.id), 'User unbanned')}>
            <Text style={styles.linkText}>Unban</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => runAction(() => superAdminService.promoteUser(item.id), 'User promoted')}>
            <Text style={styles.linkText}>Promote</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => runAction(() => superAdminService.deleteUser(item.id), 'User deleted')}>
            <Text style={styles.warnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ));

  const renderVerifications = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification Filters</Text>
        <Input
          label="Search"
          value={verificationFilters.search}
          onChangeText={(value) =>
            setVerificationFilters((prev) => ({ ...prev, search: value }))
          }
          placeholder="Name, email, NIN, passport"
        />
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filtersRow}>
          {['pending', 'verified', 'rejected', 'all'].map((value) => (
            <FilterChip
              key={value}
              label={value}
              active={verificationFilters.status === value}
              onPress={() =>
                setVerificationFilters((prev) => ({ ...prev, status: value }))
              }
            />
          ))}
        </View>

        <Text style={styles.filterLabel}>Role</Text>
        <View style={styles.filtersRow}>
          {['all', 'admin', 'landlord', 'tenant'].map((value) => (
            <FilterChip
              key={value}
              label={value}
              active={verificationFilters.user_type === value}
              onPress={() =>
                setVerificationFilters((prev) => ({ ...prev, user_type: value }))
              }
            />
          ))}
        </View>

        <Button
          title="Apply Filters"
          onPress={() => runAction(() => loadVerificationData(), 'Verification filters applied', null)}
        />
      </View>

      {verifications.map((item) => {
        const reviewStatus = item.identity_verification_status || (item.identity_verified ? 'verified' : 'pending');
        const documentNumber =
          item.identity_document_type === 'passport'
            ? item.international_passport_number
            : item.nin;

        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>Role: {item.user_type}</Text>
            <Text style={styles.meta}>Document: {item.identity_document_type || 'nin'}</Text>
            <Text style={styles.meta}>Number: {documentNumber || '-'}</Text>
            <Text style={styles.meta}>Status: {reviewStatus}</Text>
            <Text style={styles.meta}>Verified By: {item.identity_verified_by_name || '-'}</Text>
            {item.passport_photo_url ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(buildUploadUrl(item.passport_photo_url))}
              >
                <Text style={styles.linkText}>Open passport photo</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.row}>
              {(reviewStatus === 'pending' || reviewStatus === 'rejected') ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.approveVerification(item.id),
                      'Verification approved'
                    )
                  }
                >
                  <Text style={styles.linkText}>Approve</Text>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === 'pending' ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.rejectVerification(item.id),
                      'Verification rejected'
                    )
                  }
                >
                  <Text style={styles.warnText}>Reject</Text>
                </TouchableOpacity>
              ) : null}
              {reviewStatus === 'rejected' ? (
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      () => superAdminService.deleteRejectedVerification(item.id),
                      'Rejected verification deleted'
                    )
                  }
                >
                  <Text style={styles.warnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Verification Performance</Text>
        {adminPerformance.length === 0 ? (
          <Text style={styles.meta}>No admin verification activity yet.</Text>
        ) : (
          adminPerformance.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.full_name}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              <Text style={styles.meta}>Verified: {item.credentials_verified_count ?? 0}</Text>
              <Text style={styles.meta}>
                Last activity:{' '}
                {item.last_verification_at
                  ? new Date(item.last_verification_at).toLocaleString()
                  : 'No activity'}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  const getInviteStatusLabel = (invite) => {
    const isExpired =
      invite.status !== 'accepted' &&
      invite.expires_at &&
      new Date(invite.expires_at).getTime() < Date.now();

    if (invite.status === 'accepted') return 'Accepted';
    if (isExpired) return 'Expired';
    return 'Pending';
  };

  const renderLawyerInvites = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lawyer Invite Search</Text>
        <Input
          label="Search"
          value={lawyerInviteSearch}
          onChangeText={setLawyerInviteSearch}
          placeholder="Client or lawyer email"
        />
        <Button
          title="Apply Search"
          onPress={() => runAction(() => loadLawyerInvites(), 'Lawyer invites refreshed', null)}
        />
      </View>

      {lawyerInvites.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>No lawyer invites found.</Text>
        </View>
      ) : null}

      {lawyerInvites.map((invite) => (
        <View key={invite.id} style={styles.card}>
          <Text style={styles.cardTitle}>{invite.client_name}</Text>
          <Text style={styles.meta}>Assigned By: {invite.assigned_by_name || invite.client_name || '-'}</Text>
          <Text style={styles.meta}>Role: {invite.client_role}</Text>
          <Text style={styles.meta}>Lawyer Email: {invite.lawyer_email}</Text>
          <Text style={styles.meta}>Status: {getInviteStatusLabel(invite)}</Text>
          <Text style={styles.meta}>
            Expires:{' '}
            {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : '-'}
          </Text>
          <Text style={styles.meta}>
            Last Sent:{' '}
            {invite.last_sent_at ? new Date(invite.last_sent_at).toLocaleString() : '-'}
          </Text>
          <Text style={styles.meta}>Resends: {invite.resent_count ?? 0}</Text>

          {editingInviteId === invite.id ? (
            <>
              <Input
                label="New Lawyer Email"
                value={editingInviteEmail}
                onChangeText={setEditingInviteEmail}
                placeholder="lawyer@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() =>
                    runAction(
                      async () => {
                        await authService.updateLawyerInviteEmail(invite.id, editingInviteEmail.trim());
                        setEditingInviteId(null);
                        setEditingInviteEmail('');
                        await loadLawyerInvites();
                      },
                      'Lawyer email updated',
                      null
                    )
                  }
                >
                  <Text style={styles.linkText}>Save Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingInviteId(null);
                    setEditingInviteEmail('');
                  }}
                >
                  <Text style={styles.warnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {invite.status !== 'accepted' ? (
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    async () => {
                      await authService.resendLawyerInvite(invite.id);
                      await loadLawyerInvites();
                    },
                    'Lawyer invite resent',
                    null
                  )
                }
              >
                <Text style={styles.linkText}>Resend Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingInviteId(invite.id);
                  setEditingInviteEmail(invite.lawyer_email || '');
                }}
              >
                <Text style={styles.linkText}>Change Email</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </>
  );

  const renderPricing = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Pricing Rules</Text>
        <Text style={styles.meta}>
          Configure final amounts by state or local government area. LGA rules override state rules.
        </Text>
        <View style={styles.targetGrid}>
          {pricingTargets.map((target) => (
            <View key={target.key} style={styles.targetCard}>
              <Text style={styles.listTitle}>{target.label}</Text>
              <Text style={styles.meta}>
                Base fee: N{Number(target.base_amount || 0).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editingPricingRuleId ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
        </Text>
        <View style={styles.filtersRow}>
          {pricingTargets.map((target) => (
            <FilterChip
              key={target.key}
              label={target.label}
              active={pricingForm.applies_to === target.key}
              onPress={() =>
                setPricingForm((prev) => ({ ...prev, applies_to: target.key }))
              }
            />
          ))}
        </View>

        <Input
          label="Amount (NGN)"
          value={pricingForm.amount}
          onChangeText={(value) => setPricingForm((prev) => ({ ...prev, amount: value }))}
          keyboardType="numeric"
          placeholder="Enter final amount"
        />

        <SelectField
          label="State"
          value={selectedPricingState?.state_name}
          placeholder="Select state"
          onPress={() => setShowPricingStatePicker(true)}
        />

        <SelectField
          label="Local Government Area"
          value={pricingForm.lga_name}
          placeholder={selectedPricingState ? 'Whole state or choose LGA' : 'Choose state first'}
          onPress={() => setShowPricingLgaPicker(true)}
          disabled={!selectedPricingState}
          helperText="Leave empty to apply the amount to the whole state."
        />

        <View style={styles.switchRow}>
          <Text style={styles.meta}>Rule is active</Text>
          <Switch
            value={pricingForm.is_active}
            onValueChange={(value) =>
              setPricingForm((prev) => ({ ...prev, is_active: value }))
            }
          />
        </View>

        <Button
          title={editingPricingRuleId ? 'Update Pricing Rule' : 'Create Pricing Rule'}
          onPress={handleSavePricingRule}
          loading={submitting}
        />
        {editingPricingRuleId ? (
          <Button
            title="Cancel Edit"
            variant="outline"
            onPress={resetPricingForm}
            style={styles.marginTop}
          />
        ) : null}
      </View>

      {pricingRules.map((rule) => {
        const target = pricingTargets.find((item) => item.key === rule.applies_to);

        return (
          <View key={rule.id} style={styles.card}>
            <Text style={styles.cardTitle}>{target?.label || rule.applies_to}</Text>
            <Text style={styles.meta}>State: {rule.state_name}</Text>
            <Text style={styles.meta}>LGA: {rule.lga_name || 'Whole state'}</Text>
            <Text style={styles.meta}>
              Amount: N{Number(rule.amount || 0).toLocaleString()}
            </Text>
            <Text style={styles.meta}>Status: {rule.is_active ? 'Active' : 'Inactive'}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => {
                  setEditingPricingRuleId(rule.id);
                  setPricingForm({
                    applies_to: rule.applies_to,
                    state_id: String(rule.state_id),
                    lga_name: rule.lga_name || '',
                    amount: String(rule.amount),
                    is_active: rule.is_active === true,
                  });
                  setSection('pricing');
                }}
              >
                <Text style={styles.linkText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () =>
                      superAdminService.updatePricingRule(rule.id, {
                        applies_to: rule.applies_to,
                        state_id: rule.state_id,
                        lga_name: rule.lga_name || undefined,
                        amount: rule.amount,
                        is_active: !rule.is_active,
                      }),
                    `Pricing rule ${rule.is_active ? 'disabled' : 'enabled'}`
                  )
                }
              >
                <Text style={styles.linkText}>{rule.is_active ? 'Disable' : 'Enable'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  runAction(
                    () => superAdminService.deletePricingRule(rule.id),
                    'Pricing rule deleted'
                  )
                }
              >
                <Text style={styles.warnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </>
  );

  const renderProperties = () =>
    properties.map((item) => (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.meta}>{item.landlord_name || 'No landlord'}</Text>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.unlistProperty(item.id), 'Property unlisted')}>
          <Text style={styles.warnText}>Unlist Property</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderReports = () =>
    reports.map((item) => (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.reason || item.report_reason || `Report #${item.id}`}</Text>
        <Text style={styles.meta}>Status: {item.status || 'open'}</Text>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveReport(item.id), 'Report resolved')}>
          <Text style={styles.linkText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderBroadcasts = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Broadcast</Text>
        <Input
          label="Title"
          value={broadcastForm.title}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, title: value }))}
        />
        <Input
          label="Message"
          value={broadcastForm.message}
          onChangeText={(value) => setBroadcastForm((prev) => ({ ...prev, message: value }))}
          multiline
          numberOfLines={4}
        />
        <Input
          label="Target Role"
          value={broadcastForm.target_role}
          onChangeText={(value) =>
            setBroadcastForm((prev) => ({ ...prev, target_role: value }))
          }
          placeholder="tenant, landlord, admin, lawyer"
        />
        <Button
          title="Send Broadcast"
          onPress={() =>
            runAction(() => superAdminService.createBroadcast(broadcastForm), 'Broadcast sent')
          }
        />
      </View>

      {broadcasts.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>{item.message}</Text>
          <Text style={styles.meta}>Target: {item.target_role || 'all'}</Text>
        </View>
      ))}
    </>
  );

  const renderFlags = () =>
    flags.map((item) => (
      <View key={item.key || item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.key || item.name}</Text>
        <Text style={styles.meta}>Enabled: {String(item.enabled)}</Text>
        <TouchableOpacity
          onPress={() =>
            runAction(
              () => superAdminService.updateFlag(item.key, !item.enabled),
              'Flag updated'
            )
          }
        >
          <Text style={styles.linkText}>Toggle Flag</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderFraud = () =>
    fraud.map((item) => (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.rule || 'Fraud rule'}</Text>
        <Text style={styles.meta}>Score: {item.score}</Text>
        <TouchableOpacity onPress={() => runAction(() => superAdminService.resolveFraudFlag(item.id), 'Fraud flag resolved')}>
          <Text style={styles.linkText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    ));

  const renderLogs = () =>
    logs.map((item, index) => (
      <View key={`${item.id || 'log'}-${index}`} style={styles.card}>
        <Text style={styles.cardTitle}>{item.action || item.event_type || 'Audit log'}</Text>
        <Text style={styles.meta}>{item.user_name || item.actor_name || 'System'}</Text>
        <Text style={styles.meta}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
        </Text>
      </View>
    ));

  const renderedSection = {
    overview: renderOverview(),
    users: renderUsers(),
    verifications: renderVerifications(),
    lawyer_invites: renderLawyerInvites(),
    pricing: renderPricing(),
    properties: renderProperties(),
    reports: renderReports(),
    broadcasts: renderBroadcasts(),
    flags: renderFlags(),
    fraud: renderFraud(),
    logs: renderLogs(),
  }[section];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Super Admin Control Center</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {sections.map((item) => (
          <SectionButton
            key={item}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </ScrollView>

      {loading ? <Text style={styles.meta}>Loading...</Text> : renderedSection}

      <OptionPickerModal
        visible={showPricingStatePicker}
        title="Select State"
        options={pricingLocations}
        selectedValue={pricingForm.state_id}
        searchable
        searchPlaceholder="Search states"
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowPricingStatePicker(false)}
        onSelect={(item) =>
          setPricingForm((prev) => ({
            ...prev,
            state_id: String(item.id),
            lga_name: '',
          }))
        }
      />

      <OptionPickerModal
        visible={showPricingLgaPicker}
        title="Select Local Government Area"
        options={availablePricingLgas}
        selectedValue={pricingForm.lga_name}
        searchable
        searchPlaceholder="Search LGAs"
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
        onClose={() => setShowPricingLgaPicker(false)}
        onSelect={(item) =>
          setPricingForm((prev) => ({
            ...prev,
            lga_name: String(item),
          }))
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  tabRow: { marginBottom: 12 },
  tabBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tabBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  tabText: { color: '#1d4ed8', fontWeight: '700', textTransform: 'capitalize' },
  tabTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  meta: { marginTop: 4, color: '#475569' },
  row: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  linkText: { color: '#0284c7', fontWeight: '700', marginTop: 8 },
  warnText: { color: '#dc2626', fontWeight: '700', marginTop: 8 },
  filterLabel: {
    marginBottom: 8,
    color: '#334155',
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    color: '#475569',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#0369a1',
  },
  listRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 10,
  },
  listTitle: {
    fontWeight: '700',
    color: '#0f172a',
  },
  targetGrid: {
    gap: 10,
    marginTop: 10,
  },
  targetCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  marginTop: {
    marginTop: 10,
  },
});

export default SuperAdminDashboardScreen;
