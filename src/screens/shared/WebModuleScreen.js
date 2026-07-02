import React from 'react';
import WebRouteScreen from './WebRouteScreen';

const createWebModuleScreen = (path, title) => {
  const WebModuleScreen = (props) => {
    const mergedRoute = {
      ...props.route,
      params: {
        ...(props.route?.params || {}),
        path,
        title,
      },
    };

    return <WebRouteScreen {...props} route={mergedRoute} />;
  };

  WebModuleScreen.displayName = `${title.replace(/\s+/g, '')}Screen`;
  return WebModuleScreen;
};

export const CareersWebScreen = createWebModuleScreen('/careers', 'Careers');
export const RecruitmentAdminWebScreen = createWebModuleScreen('/admin/recruitment', 'Recruitment Admin');

export default CareersWebScreen;
