import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ToastAndroid,
  Alert,
  Pressable,
} from 'react-native';
// (No gradient use in this screen after redesign)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Edit3, Save } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { OracleRenderer, type OracleJson } from '@/components/OracleRenderer';
import { categoryIcons } from '@/types/oracle';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Typography } from '@/constants/typography';

function showToast(message: string) {
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
}

function mapOracleCategory(category?: string) {
  const c = String(category ?? '').toLowerCase();
  if (c.includes('finance')) return 'prediction' as const;
  if (c.includes('habits')) return 'habit' as const;
  if (c.includes('creativity')) return 'creativity' as const;
  if (c.includes('health')) return 'wellness' as const;
  if (c.includes('productivity')) return 'productivity' as const;
  return 'decision' as const;
}

export default function OraclePreviewScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const userPrompt = (params.userPrompt as string) || '';
  const refineId = (params.refineId as string) || '';

  const oracle: OracleJson | null = useMemo(() => {
    try {
      const raw = params.oracle as string | undefined;
      if (!raw) return null;
      return JSON.parse(raw) as OracleJson;
    } catch (e) {
      console.error('Failed to parse oracle JSON:', e);
      return null;
    }
  }, [params.oracle]);

  const title = oracle?.title ?? 'New Oracle';
  const description = oracle?.description ?? userPrompt;

  const saveOracle = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!oracle) {
      showToast('Missing oracle data. Please regenerate.');
      return;
    }
    if (!user) return;

    const category = oracle.category || 'Other';
    const categoryKey = mapOracleCategory(category);
    const icon = categoryIcons[categoryKey] ?? 'Sparkles';

    const baseOracleData = {
      // Full Grok JSON object (what we render from)
      title: oracle.title || 'Untitled Oracle',
      description: oracle.description || '',
      category,
      components: oracle.components || [],
      result: oracle.result || { type: 'text', message: 'No result' },
      prompt: userPrompt, // original user input
      // Back-compat fields used elsewhere in the app
      name: title || oracle.title || 'Untitled Oracle',
      icon,
      oracleJson: oracle,
    };

    const saveAsNew = async () => {
      const oracleData = {
        ...baseOracleData,
        createdAt: new Date().toISOString(),
        usageCount: 0,
        isFavorite: false,
      };
      const docRef = await addDoc(collection(db, 'users', user.uid, 'oracles'), oracleData);
      console.log('Oracle saved with full data:', docRef.id);
      return docRef.id;
    };

    const overwriteExisting = async () => {
      const oracleRef = doc(db, 'users', user.uid, 'oracles', refineId);
      await updateDoc(oracleRef, {
        ...baseOracleData,
        updatedAt: new Date().toISOString(),
      });
      console.log('Oracle overwritten with refined data:', refineId);
      return refineId;
    };

    let savedId: string | null = null;

    try {
      if (refineId) {
        if (Platform.OS === 'web') {
          // eslint-disable-next-line no-alert
          const overwrite = confirm('Overwrite the existing oracle? (Cancel = Save as new)');
          savedId = overwrite ? await overwriteExisting() : await saveAsNew();
        } else {
          await new Promise<void>((resolve) => {
            Alert.alert('Save refined oracle', 'Choose how you want to save this refinement.', [
              {
                text: 'Save as New',
                onPress: async () => {
                  savedId = await saveAsNew();
                  resolve();
                },
              },
              {
                text: 'Overwrite',
                style: 'destructive',
                onPress: async () => {
                  savedId = await overwriteExisting();
                  resolve();
                },
              },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            ]);
          });
        }
      } else {
        savedId = await saveAsNew();
      }
    } catch (e) {
      console.error('Save failed:', e);
      showToast('Something went wrong — please try again');
      return;
    }

    if (!savedId) return;

    router.replace('/(tabs)/(home)');

    setTimeout(() => {
      router.push({
        pathname: '/oracle-run',
        params: {
          oracle: JSON.stringify(oracle),
          userPrompt,
          oracleId: savedId,
        },
      });
    }, 100);
  };

  const handleRefine = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/(tabs)/create',
      params: {
        prompt: userPrompt,
        ...(refineId ? { refineId } : {}),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Preview Oracle',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {!oracle && (
          <View style={[styles.section, { padding: 16, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              We couldn&apos;t load this oracle preview. Please go back and try generating again.
            </Text>
          </View>
        )}

        {oracle && (
          <View style={styles.section}>
            <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {description}
            </Text>
          </View>
        )}

        {oracle && (
          <View style={styles.section}>
            {Array.isArray(oracle.components) && oracle.components.length > 0 ? (
              <OracleRenderer oracle={oracle} />
            ) : (
              <View
                style={[
                  styles.fallbackBox,
                  { backgroundColor: colors.surface, borderColor: 'rgba(255,255,255,0.10)' },
                ]}
              >
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {oracle.description}
                </Text>
                <Pressable
                  onPress={() => showToast('Logged successfully')}
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
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 12,
              borderTopColor: 'rgba(255,255,255,0.10)',
          },
        ]}
      >
        <Pressable
          onPress={handleRefine}
          style={({ pressed }) => [
            styles.regenerateButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Edit3 size={18} color={colors.textSecondary} />
          <Text style={[styles.regenerateButtonText, { color: '#FFFFFF' }]}>
            Refine
          </Text>
        </Pressable>

        <Pressable
          onPress={saveOracle}
          disabled={!oracle}
          style={({ pressed }) => [
            styles.saveButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: oracle ? 1 : 0.5,
              transform: [{ scale: pressed && oracle ? 0.98 : 1 }],
            },
          ]}
        >
          <Save size={18} color={colors.textSecondary} />
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
            Save to My Oracles
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Typography.title,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 4,
    borderWidth: 1,
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.bodyStrong,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 56,
    borderRadius: 4,
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Typography.bodyStrong,
  },
  fallbackBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
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
