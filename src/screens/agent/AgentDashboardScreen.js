import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { agentService } from '../../services/agentService';
import { getErrorMessage, pickObject } from '../../utils/http';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const AgentDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [profile, setProfile] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await agentService.getProfile();
        setProfile(pickObject(response, ['data']) || null);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: ui("Failed"),
          text2: getErrorMessage(error, 'Could not load agent profile'),
        });
      }
    };

    loadProfile();
  }, []);

  const assignment = profile?.agent_assignment;

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow={ui("AGENT WORKSPACE")}
        title={ui("Your operations hub")}
        subtitle={ui("Manage delegated properties, commissions and payouts.")}
        icon="briefcase-outline"
      />

      {!assignment ? (
        <DashboardNotice
          variant="warning"
          title={ui("No active assignment yet")}
          message={ui("Your account is active but not yet linked to a landlord profile.")}
          tourTarget="agent_assignment"
        />
      ) : (
        <DashboardNotice
          title={ui("Assigned to {value0}", {value0: (assignment.landlord_name || ui("your landlord"))})}
          tourTarget="agent_assignment"
          message={[assignment.landlord_email, assignment.landlord_phone].filter(Boolean).join(' • ') || 'Contact details are not available.'}
        />
      )}

      <DashboardSection
        title={ui("Daily operations")}
        subtitle={ui("The tools you are most likely to need while managing listings.")}
        tourTarget="agent_properties"
      >
        <ActionRow
          title={ui("Manage Properties")}
          subtitle={ui("Create and update landlord listings")}
          icon="business-outline"
          onPress={() => navigation.navigate('MyProperties')}
        />
        <ActionRow
          title={ui("Add Property")}
          subtitle={ui("Publish a new listing")}
          icon="add-circle-outline"
          onPress={() => navigation.navigate('AddProperty')}
        />
        <ActionRow
          title={ui("Messages & Disputes")}
          subtitle={ui("Handle routine coordination tasks")}
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
      </DashboardSection>

      <DashboardSection
        title={ui("Earnings")}
        subtitle={ui("Review commission activity and request payouts.")}
      >
        <ActionRow
          title={ui("Commission Ledger")}
          subtitle={ui("View earnings and transaction history")}
          icon="trending-up-outline"
          tourTarget="agent_commissions"
          onPress={() => navigation.navigate('AgentEarnings')}
        />
        <ActionRow
          title={ui("Withdrawal Requests")}
          subtitle={ui("Request payout from earned commissions")}
          icon="wallet-outline"
          tourTarget="agent_withdrawals"
          onPress={() => navigation.navigate('AgentWithdrawals')}
        />
      </DashboardSection>

      <DashboardSection
        title={ui("Account")}
        subtitle={ui("Manage your agent profile and assigned location.")}
      >
        <ActionRow
          title={ui("State Migration")}
          subtitle={ui("Request a move to a new assigned state")}
          icon="swap-horizontal-outline"
          onPress={() => navigation.navigate('StateMigration')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AgentDashboardScreen;
