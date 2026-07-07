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
  const [profile, setProfile] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await agentService.getProfile();
        setProfile(pickObject(response, ['data']) || null);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed',
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
        eyebrow="AGENT WORKSPACE"
        title="Your operations hub"
        subtitle="Manage delegated properties, commissions and payouts."
        icon="briefcase-outline"
      />

      {!assignment ? (
        <DashboardNotice
          variant="warning"
          title="No active assignment yet"
          message="Your account is active but not yet linked to a landlord profile."
        />
      ) : (
        <DashboardNotice
          title={`Assigned to ${assignment.landlord_name || 'your landlord'}`}
          message={[assignment.landlord_email, assignment.landlord_phone].filter(Boolean).join(' • ') || 'Contact details are not available.'}
        />
      )}

      <DashboardSection
        title="Daily operations"
        subtitle="The tools you are most likely to need while managing listings."
      >
        <ActionRow
          title="Manage Properties"
          subtitle="Create and update landlord listings"
          icon="business-outline"
          onPress={() => navigation.navigate('MyProperties')}
        />
        <ActionRow
          title="Add Property"
          subtitle="Publish a new listing"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('AddProperty')}
        />
        <ActionRow
          title="Messages & Disputes"
          subtitle="Handle routine coordination tasks"
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
      </DashboardSection>

      <DashboardSection
        title="Earnings"
        subtitle="Review commission activity and request payouts."
      >
        <ActionRow
          title="Commission Ledger"
          subtitle="View earnings and transaction history"
          icon="trending-up-outline"
          onPress={() => navigation.navigate('AgentEarnings')}
        />
        <ActionRow
          title="Withdrawal Requests"
          subtitle="Request payout from earned commissions"
          icon="wallet-outline"
          onPress={() => navigation.navigate('AgentWithdrawals')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AgentDashboardScreen;
