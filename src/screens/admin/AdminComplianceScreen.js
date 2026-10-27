import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { complianceService } from '../../services/complianceService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors } from '../../theme';

const AdminComplianceScreen = () => {
  useInterfaceLanguage();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);

  const loadCompliance = async () => {
    try {
      const [overviewResponse, trendResponse] = await Promise.all([
        complianceService.getOverview(),
        complianceService.getRiskTrend(),
      ]);
      setOverview(pickObject(overviewResponse, ['data']));
      setTrend(pickList(trendResponse, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load compliance data'),
      });
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Risk operations")}
        title={ui("Compliance & risk")}
        subtitle={ui("Monitor disputes, escalations, evidence coverage and risk signals from a native admin cockpit.")}
        icon="shield-checkmark-outline"
        right={<StatusPill label={ui("Risk {value0}", {value0: (overview?.riskScore ?? '-')})} color={colors.warning} />}
      />

      <PremiumSectionTitle
        title={ui("Overview")}
        subtitle={ui("Key signals that need admin attention.")}
      />
      <PremiumCard>
        <InfoRow icon="warning-outline" label={ui("Open disputes")} value={overview?.totalOpen ?? '-'} />
        <InfoRow icon="arrow-up-circle-outline" label={ui("Escalated")} value={overview?.escalated ?? '-'} />
        <InfoRow icon="hourglass-outline" label={ui("Aging cases")} value={overview?.aging ?? '-'} />
        <InfoRow icon="document-lock-outline" label={ui("No evidence")} value={overview?.withoutEvidence ?? '-'} />
        <InfoRow icon="briefcase-outline" label={ui("Lawyer activity")} value={overview?.lawyerActivity ?? '-'} />
      </PremiumCard>

      <PremiumSectionTitle
        title={ui("Risk trend")}
        subtitle={ui("Recent day-by-day risk scoring.")}
      />
      <PremiumCard>
        {trend.length === 0 ? (
          <InfoRow icon="analytics-outline" label={ui("Trend")} value="No trend data available" />
        ) : (
          trend.map((item, index) => (
            <InfoRow
              key={`${item.day}-${index}`}
              icon="pulse-outline"
              label={item.day || ui("Day {value0}", {value0: (index + 1)})}
              value={item.risk_score ?? item.riskScore ?? '-'}
            />
          ))
        )}
      </PremiumCard>
    </PremiumScreen>
  );
};

export default AdminComplianceScreen;
