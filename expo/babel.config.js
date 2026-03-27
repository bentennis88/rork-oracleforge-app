module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Remove any plugins array that references react-native-dotenv
    // If you have other plugins (e.g., reanimated), keep only those
  };
};