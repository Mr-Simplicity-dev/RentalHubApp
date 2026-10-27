import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import { Linking } from 'react-native';
import { PremiumCenter } from '../../components/common/PremiumLayout';
import { API_ORIGIN } from '../../services/api';

const DesktopOnlyScreen = ({ roleLabel, route }) => {
  useInterfaceLanguage();
  const effectiveLabel = roleLabel || route?.params?.roleLabel;
  const openConsole = () => {
    Linking.openURL(API_ORIGIN).catch(() => {});
  };

  return (
    <PremiumCenter
      icon="laptop-outline"
      title={ui("Web console account")}
      message={ui("Your {value0} is managed from the Amana RentalHub NG web console. Open the site in a desktop browser to continue — sign out there when you are done.", {value0: (effectiveLabel || ui("account"))})}
      actionLabel={ui("Open web console")}
      onAction={openConsole}
    />
  );
};

export default DesktopOnlyScreen;
