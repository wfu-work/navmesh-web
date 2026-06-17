/**
 * For more configuration, please refer to https://angular.io/guide/build#proxying-to-a-backend-server
 *
 * 更多配置描述请参考 https://angular.cn/guide/build#proxying-to-a-backend-server
 *
 * Note: The proxy is only valid for real requests, Mock does not actually generate requests, so the priority of Mock will be higher than the proxy
 */
module.exports = {
  '/dev/': {
    target: 'http://127.0.0.1:3007/api/',
    secure: false,
    ws: true,
    pathRewrite: {
      '^/dev/': '',
    },
    changeOrigin: true,
  },
  '/api/': {
    target: 'https://navmesh.navfirst.com/api/',
    secure: false,
    ws: true,
    pathRewrite: {
      '^/api/': '',
    },
    changeOrigin: true,
  },
  '/tmap': {
    target: 'https://tmap.navfirst.com',
    secure: false,
    pathRewrite: {
      '^/tmap': '',
    },
    changeOrigin: true,
  },
};
