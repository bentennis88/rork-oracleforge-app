import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ToastAndroid } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { OracleRenderer, type OracleJson } from '@/components/OracleRenderer';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function OracleRunScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const userPrompt = (params.userPrompt as string) || '';
  const oracleId = (params.oracleId as string) || '';
  const { user } = useAuth();

  const oracle: OracleJson | null = useMemo(() => {
    try {
      const raw = params.oracle as string | undefined;
      if (!raw) return null;
      return JSON.parse(raw) as OracleJson;
    } catch (e) {
      console.error('Failed to parse oracle JSON for run screen:', e);
      return null;
    }
  }, [params.oracle]);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      alert(message);
      return;
    }
    Alert.alert('Notice', message);
  };

  const logEntryFallback = async () => {
    if (!user?.uid || !oracleId) {
      showToast('Logged successfully');
      return;
    }
    try {
      const logsRef = collection(db, 'users', user.uid, 'oracles', oracleId, 'logs');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;
      await addDoc(logsRef, { date, createdAt: serverTimestamp(), note: 'Log Entry' });
      showToast('Logged successfully');
    } catch (e) {
      console.error('Log entry failed:', e);
      showToast('Log failed');
    }
  };

  const confirmDelete = async () => {
    if (!user?.uid || !oracleId || !oracle) return;
    const name = oracle.title || 'this oracle';

    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'oracles', oracleId));
        router.replace('/(tabs)/(home)');
      } catch (e) {
        console.error('Delete failed:', e);
        showToast('Delete failed');
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (confirm(`Permanently delete '${name}'? This cannot be undone.`)) void doDelete();
      return;
    }

    Alert.alert(`Permanently delete '${name}'?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Run Oracle',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!oracle ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Oracle not found</Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              We couldn&apos;t load this oracle. Try opening it again from your dashboard.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{oracle.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {oracle.description}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/create',
                    params: {
                      prompt: userPrompt,
                      refineId: oracleId,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.refineButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.refineText, { color: '#FFFFFF' }]}>Refine</Text>
              </Pressable>

              <Pressable
                onPress={() => void confirmDelete()}
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    borderColor: 'rgba(255,255,255,0.10)',
                    backgroundColor: colors.surface,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.refineText, { color: '#FFFFFF' }]}>Delete</Text>
              </Pressable>
            </View>

            {Array.isArray(oracle.components) && oracle.components.length > 0 ? (
              <OracleRenderer oracle={oracle} oracleId={oracleId} />
            ) : (
              <View style={[styles.fallbackBox, { backgroundColor: colors.surface, borderColor: 'rgba(255,255,255,0.10)' }]}>
                <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
                  {oracle.description}
                </Text>
                <Pressable
                  onPress={() => void logEntryFallback()}
                  style={({ pressed }) => [
                    styles.logEntryButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.logEntryText, { color: '#FFFFFF' }]}>Log Entry</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: Typography.title,
  },
  description: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  dividerLine: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  refineButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refineText: {
    fontFamily: Typography.bodyStrong,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  errorBox: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fallbackBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  fallbackText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  logEntryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  logEntryText: {
    fontFamily: Typography.bodyStrong,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});


