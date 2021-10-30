require('dotenv').config();
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'qrclap.reader',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: 'amnedge@gmail.com',
    appleIdPassword: 'gorw-zxpt-ljup-donf',
  });
};