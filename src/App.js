import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import Toast from 'react-native-toast-message';

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
      <Toast />
    </AuthProvider>
  );
};

export default App;
