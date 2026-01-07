import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ToastAndroid,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import generateOracle from '@/src/services/grokApi';

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

  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCreating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      particleAnims.forEach((anim, index) => {
        const delay = index * 150;
        const angle = (index / particleAnims.length) * Math.PI * 2;
        const distance = 120;

        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim.x, {
                toValue: Math.cos(angle) * distance,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(anim.y, {
                toValue: Math.sin(angle) * distance,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.opacity, {
                  toValue: 0.8,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                  toValue: 0,
                  duration: 1800,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 0,
                  duration: 1800,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(anim.x, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(anim.y, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        ).start();
      });
    } else {
      glowAnim.setValue(0);
      pulseAnim.setValue(1);
      particleAnims.forEach((anim) => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.opacity.setValue(0);
        anim.scale.setValue(0);
      });
    }
  }, [isCreating, glowAnim, pulseAnim, particleAnims]);

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
        <LinearGradient
          colors={[
            colors.accent + '10',
            colors.background,
            colors.accentLight + '10',
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContent}>
          {particleAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  backgroundColor: colors.accent,
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    { scale: anim.scale },
                  ],
                  opacity: anim.opacity,
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.glowingOrb,
              {
                backgroundColor: colors.accent,
                transform: [{ scale: pulseAnim }],
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]
            }
          >
            <Sparkles size={48} color={colors.background} strokeWidth={2.5} />
          </Animated.View>
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
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
        >
          <View style={styles.examplesSection}>
            <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>
              Tap an example to get started:
            </Text>
            {examplePrompts.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.exampleBubble, { backgroundColor: colors.surface }]}
                onPress={() => handleExamplePress(example)}
                activeOpacity={0.7}
              >
                <Text style={[styles.exampleText, { color: colors.text }]}>{example}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Describe the tool you want... e.g., 'Help me decide if I should move cities' or 'Predict my mood based on sleep and coffee'"
              placeholderTextColor={colors.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={300}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.generateButton,
              {
                backgroundColor: canCreate ? colors.accent : colors.surface,
              },
            ]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                canCreate
                  ? [colors.accent, colors.accentLight]
                  : ['transparent', 'transparent']
              }
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Sparkles size={20} color={canCreate ? colors.background : colors.textMuted} strokeWidth={2.5} />
            <Text
              style={[
                styles.generateButtonText,
                { color: canCreate ? colors.background : colors.textMuted },
              ]}
            >
              Generate Oracle
            </Text>
          </TouchableOpacity>
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
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glowingOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 32,
    letterSpacing: -0.5,
  },
  loadingSubtext: {
    fontSize: 16,
    marginTop: 8,
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
  examplesSection: {
    gap: 12,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleBubble: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: width * 0.8,
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  inputWrapper: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
