import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/hooks/useTheme";
import { OracleProvider } from "@/hooks/useOracles";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboarding";
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

// Ensure notifications display while app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { hasSeenOnboarding, isLoading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (authLoading || onboardingLoading || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inWelcome = segments[0] === 'welcome';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup && !inWelcome) {
      router.replace('/welcome');
    } else if (user && !inOnboarding && !hasSeenOnboarding) {
      router.replace('/onboarding');
    } else if (user && hasSeenOnboarding && (inAuthGroup || inWelcome || inOnboarding)) {
      router.replace('/(tabs)/(home)');
    }
  }, [user, segments, authLoading, onboardingLoading, hasSeenOnboarding, router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="oracle/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="welcome" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <ThemeProvider>
            <OracleProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </OracleProvider>
          </ThemeProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
