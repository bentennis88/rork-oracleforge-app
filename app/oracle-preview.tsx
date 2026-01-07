import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';
import { OracleRenderer, type OracleJson } from '@/components/OracleRenderer';
import { categoryIcons } from '@/types/oracle';

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
  Alert.alert('Error', message);
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
  const { addOracle } = useOracles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const userPrompt = (params.userPrompt as string) || '';

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

  const [title, setTitle] = useState(oracle?.title ?? 'New Oracle');
  const description = oracle?.description ?? userPrompt;

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!oracle) {
      showToast('Missing oracle data. Please regenerate.');
      return;
    }

    const category = mapOracleCategory(oracle.category);
    const icon = categoryIcons[category] ?? 'Sparkles';

    const newOracle = await addOracle({
      name: title || oracle.title,
      description: oracle.description,
      category,
      prompt: userPrompt || oracle.description,
      icon,
      oracleJson: oracle,
    } as any);

    if (!newOracle) {
      console.error('Failed to save oracle');
      showToast('Something went wrong — please try again');
      return;
    }

    router.replace('/(tabs)/(home)');
    
    setTimeout(() => {
      router.push(`/oracle/${newOracle.id}` as const);
    }, 100);
  };

  const handleRegenerate = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
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
          <View style={[styles.section, { padding: 16, borderRadius: 12, backgroundColor: colors.surface }]}>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              We couldn&apos;t load this oracle preview. Please go back and try generating again.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Oracle Title</Text>
          <TextInput
            style={[styles.titleInput, { 
              color: colors.text, 
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter oracle name..."
            placeholderTextColor={colors.textMuted}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <View style={[styles.descriptionBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              {description}
            </Text>
          </View>
        </View>

        {oracle && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Interactive Tool</Text>
            <OracleRenderer oracle={oracle} />
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 12,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.regenerateButton, { backgroundColor: colors.surface }]}
          onPress={handleRegenerate}
          activeOpacity={0.7}
        >
          <RotateCcw size={20} color={colors.text} />
          <Text style={[styles.regenerateButtonText, { color: colors.text }]}>
            Regenerate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!oracle}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentLight]}
            style={styles.saveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            Save to My Oracles
          </Text>
        </TouchableOpacity>
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  descriptionBox: {
    padding: 16,
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  saveGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
