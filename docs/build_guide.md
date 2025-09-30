 For Future Builds (Once this completes):

  Since you have the container running, you can use these simple commands:

  # Development APK
  docker exec practical_khayyam bash -c "cd /app && EXPO_TOKEN=eG6DMxteGWmnAeeKHObL8ScXJJ3-Wfple6zKWV3y eas build --platform android --profile
  development --local --non-interactive"

  # Preview APK
  docker exec practical_khayyam bash -c "cd /app && EXPO_TOKEN=eG6DMxteGWmnAeeKHObL8ScXJJ3-Wfple6zKWV3y eas build --platform android --profile preview     
  --local --non-interactive"

  # Production APK
  docker exec practical_khayyam bash -c "cd /app && EXPO_TOKEN=eG6DMxteGWmnAeeKHObL8ScXJJ3-Wfple6zKWV3y eas build --platform android --profile
  production --local --non-interactive"

  Or Use the CMD Files (Even Easier):

  - Double-click build-dev-token.cmd
  - Double-click build-preview-token.cmd
  - Double-click build-production-token.cmd