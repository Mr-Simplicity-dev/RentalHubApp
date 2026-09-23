import { Linking } from 'react-native';
import { PremiumCenter } from '../../components/common/PremiumLayout';
import { API_ORIGIN } from '../../services/api';

const DesktopOnlyScreen = ({ roleLabel, route }) => {
  const effectiveLabel = roleLabel || route?.params?.roleLabel;
  const openConsole = () => {
    Linking.openURL(API_ORIGIN).catch(() => {});
  };

  return (
    <PremiumCenter
      icon="laptop-outline"
      title="Web console account"
      message={`Your ${effectiveLabel || 'account'} is managed from the RentalHub NG web console. Open the site in a desktop browser to continue — sign out there when you are done.`}
      actionLabel="Open web console"
      onAction={openConsole}
    />
  );
};

export default DesktopOnlyScreen;
