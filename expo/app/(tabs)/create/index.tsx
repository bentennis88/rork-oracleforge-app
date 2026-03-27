import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Wand2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import generateOracle from '@/src/services/grokApi';
import { Typography } from '@/constants/typography';

const { width } = Dimensions.get('window');

const examplePrompts = [
  "Create a job interview confidence booster",
  "Build a daily habit streak predictor",
  "Make a creative writing prompt generator",
  "Help me weigh pros and cons of buying vs renting",
  "Simulate my savings growth over 5 years",
];

export default function CreateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const params = useLocalSearchParams();
  const hasPrefilledRef = useRef(false);
  const prefillPrompt = (params.prompt as string) || '';
  const refineId = (params.refineId as string) || '';

  useEffect(() => {
    // Prefill when coming from "Refine" (only once per navigation).
    if (!hasPrefilledRef.current && prefillPrompt) {
      setPrompt(prefillPrompt);
      hasPrefilledRef.current = true;
    }
  }, [prefillPrompt]);

  const handleExamplePress = (example: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPrompt(example);
  };

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
    Alert.alert('Error', message);
  };

  const handleCreate = async () => {
    if (!prompt.trim()) return;

    setIsCreating(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const userPrompt = prompt.trim();

    try {
      const oracleJson = await generateOracle(userPrompt);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.push({
        pathname: '/oracle-preview',
        params: {
          userPrompt,
          oracle: JSON.stringify(oracleJson),
          ...(refineId ? { refineId } : {}),
        },
      });

      setPrompt('');
    } catch (error) {
      console.error('generateOracle error:', error);
      showToast('Something went wrong — try a simpler request or try again');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = prompt.trim().length > 0;

  if (isCreating) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.textMuted} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Building your oracle...</Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>This won&apos;t take long</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create a New Oracle',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.inputFooter,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 12,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.textInput, { color: colors.textSecondary }]}
              placeholder="Describe the tool you want... e.g., 'Help me decide if I should move cities' or 'Predict my mood based on sleep and coffee'"
              placeholderTextColor={colors.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              multiline
              maxLength={300}
            />
            <View style={[styles.underline, { backgroundColor: isFocused ? colors.accent : 'rgba(255,255,255,0.12)' }]} />
          </View>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            style={({ pressed }) => [
              styles.generateButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: canCreate ? 1 : 0.45,
                transform: [{ scale: pressed && canCreate ? 0.98 : 1 }],
              },
            ]}
          >
            {({ pressed }) => (
              <>
                <Wand2
                  size={18}
                  color={canCreate ? '#FFFFFF' : colors.textMuted}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.generateButtonText,
                    {
                      color: canCreate ? '#FFFFFF' : colors.textMuted,
                    },
                  ]}
                >
                  Generate Oracle
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 18,
    letterSpacing: -0.5,
    fontFamily: Typography.title,
  },
  loadingSubtext: {
    fontSize: 16,
    marginTop: 8,
    fontFamily: Typography.body,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  inputWrapper: {
    paddingHorizontal: 0,
    paddingVertical: 10,
    minHeight: 56,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Typography.body,
    paddingHorizontal: 2,
    paddingVertical: 10,
    minHeight: 44,
  },
  underline: {
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
    opacity: 0.9,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Typography.bodyStrong,
  },
});
