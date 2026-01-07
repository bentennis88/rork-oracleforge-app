import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, X, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';

const { width, height } = Dimensions.get('window');

export default function OraclePreviewScreen() {
  const { colors } = useTheme();
  const { addOracle } = useOracles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState('New Oracle');
  const [description] = useState(params.prompt as string || '');
  const [showResponse, setShowResponse] = useState(false);
  const [responseType, setResponseType] = useState<'yes' | 'no'>('yes');

  const confettiPieces = useRef(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(width / 2),
      y: new Animated.Value(height * 0.4),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const responseScaleAnim = useRef(new Animated.Value(0)).current;
  const responseOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showResponse) {
      if (responseType === 'yes') {
        confettiPieces.forEach((piece, index) => {
          const angle = (Math.random() - 0.5) * Math.PI * 1.5;
          const distance = Math.random() * 200 + 100;
          const duration = Math.random() * 800 + 1200;

          Animated.parallel([
            Animated.timing(piece.x, {
              toValue: width / 2 + Math.cos(angle) * distance,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.y, {
              toValue: height * 0.4 + Math.sin(angle) * distance + Math.random() * 300,
              duration,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(piece.opacity, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(piece.opacity, {
                toValue: 0,
                duration: duration - 100,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(piece.rotate, {
              toValue: Math.random() * 720 - 360,
              duration,
              useNativeDriver: true,
            }),
          ]).start();
        });
      } else {
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start();
      }

      Animated.parallel([
        Animated.spring(responseScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(responseOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        setShowResponse(false);
        responseScaleAnim.setValue(0);
        responseOpacityAnim.setValue(0);
        confettiPieces.forEach((piece) => {
          piece.x.setValue(width / 2);
          piece.y.setValue(height * 0.4);
          piece.opacity.setValue(0);
          piece.rotate.setValue(0);
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showResponse, responseType, confettiPieces, shakeAnim, responseScaleAnim, responseOpacityAnim]);

  const handleChoice = (choice: 'yes' | 'no') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        choice === 'yes' 
          ? Haptics.ImpactFeedbackStyle.Medium 
          : Haptics.ImpactFeedbackStyle.Heavy
      );
    }
    setResponseType(choice);
    setShowResponse(true);
  };

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const category = description.toLowerCase().includes('habit') || description.toLowerCase().includes('streak')
      ? 'habit'
      : description.toLowerCase().includes('creative') || description.toLowerCase().includes('writing')
      ? 'creativity'
      : description.toLowerCase().includes('decision') || description.toLowerCase().includes('pros and cons')
      ? 'decision'
      : description.toLowerCase().includes('predict') || description.toLowerCase().includes('growth') || description.toLowerCase().includes('savings')
      ? 'prediction'
      : 'decision';

    const newOracle = await addOracle({
      name: title,
      description,
      category,
      prompt: description,
      icon: 'Sparkles',
    });

    if (!newOracle) {
      console.error('Failed to save oracle');
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

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Interactive Tool</Text>
          <View style={[styles.toolContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>
              Decision Helper
            </Text>
            <Text style={[styles.toolSubtitle, { color: colors.textSecondary }]}>
              Tap a button to get your answer
            </Text>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.choiceButton, { backgroundColor: colors.accent }]}
                onPress={() => handleChoice('yes')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.choiceGradient}
                />
                <Check size={32} color="#ffffff" strokeWidth={3} />
                <Text style={styles.choiceButtonText}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, { backgroundColor: '#ef4444' }]}
                onPress={() => handleChoice('no')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.choiceGradient}
                />
                <X size={32} color="#ffffff" strokeWidth={3} />
                <Text style={styles.choiceButtonText}>No</Text>
              </TouchableOpacity>
            </View>

            {showResponse && (
              <Animated.View
                style={[
                  styles.responseContainer,
                  {
                    backgroundColor: responseType === 'yes' ? '#10b98120' : '#ef444420',
                    transform: [
                      { scale: responseScaleAnim },
                      { translateX: responseType === 'no' ? shakeAnim : 0 },
                    ],
                    opacity: responseOpacityAnim,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.responseText,
                    { color: responseType === 'yes' ? '#10b981' : '#ef4444' },
                  ]}
                >
                  {responseType === 'yes' ? '✨ Yes! Go for it!' : '❌ Not this time'}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
      </ScrollView>

      {showResponse && responseType === 'yes' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiPieces.map((piece, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5],
                  transform: [
                    { translateX: piece.x },
                    { translateY: piece.y },
                    { 
                      rotate: piece.rotate.interpolate({
                        inputRange: [-360, 360],
                        outputRange: ['-360deg', '360deg'],
                      }),
                    },
                  ],
                  opacity: piece.opacity,
                },
              ]}
            />
          ))}
        </View>
      )}

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
        >
          <LinearGradient
            colors={[colors.accent, colors.accentLight]}
            style={styles.saveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            Save to Dashboard
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
  toolContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  toolTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  toolSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 20,
  },
  choiceButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  choiceGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  choiceButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  responseContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  responseText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
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
