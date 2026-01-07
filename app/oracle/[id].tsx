import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Star,
  Play,
  Sparkles,
  Trash2,
  Scale,
  Target,
  Lightbulb,
  Heart,
  Zap,
  Calendar,
  Sun,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';
import { categoryColors, categoryLabels } from '@/types/oracle';
import GlowingOrb from '@/components/GlowingOrb';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Scale,
  Target,
  Lightbulb,
  Heart,
  Zap,
  Calendar,
  Star,
  Sparkles,
  Sun,
  Timer,
};

export default function OracleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { oracles, toggleFavorite, incrementOracleUsage, deleteOracle } = useOracles();
  const insets = useSafeAreaInsets();

  const oracle = oracles.find((o) => o.id === id);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, pulseAnim]);

  if (!oracle) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Oracle not found
        </Text>
      </View>
    );
  }

  const categoryColor = colors[categoryColors[oracle.category] as keyof typeof colors] as string;
  const IconComponent = iconMap[oracle.icon] || Sparkles;

  const handleClose = () => {
    router.back();
  };

  const handleToggleFavorite = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite(oracle.id);
  };

  const handleRun = async () => {
    setIsRunning(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    resultFadeAnim.setValue(0);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const responses = [
      "The path ahead suggests moving forward with confidence. Trust your intuition.",
      "Now is the time for patience. Let the situation unfold naturally.",
      "Your energy aligns with creativity today. Explore new possibilities.",
      "Focus on what truly matters. Remove distractions from your path.",
      "Balance is key. Consider all perspectives before deciding.",
      "The answer lies within. Take a moment for quiet reflection.",
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    setResult(randomResponse);
    incrementOracleUsage(oracle.id);

    setIsRunning(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.timing(resultFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    deleteOracle(oracle.id);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${categoryColor}20`, colors.background]}
        style={styles.headerGradient}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={handleClose}
          >
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.favoriteButton, { backgroundColor: colors.surface }]}
            onPress={handleToggleFavorite}
          >
            <Star
              size={22}
              color={oracle.isFavorite ? colors.accent : colors.textMuted}
              fill={oracle.isFavorite ? colors.accent : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.oracleHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
              <IconComponent size={32} color={categoryColor} />
            </View>
            <Text style={[styles.oracleName, { color: colors.text }]}>
              {oracle.name}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {categoryLabels[oracle.category]}
              </Text>
            </View>
            <Text style={[styles.oracleDescription, { color: colors.textSecondary }]}>
              {oracle.description}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {oracle.usageCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Uses
              </Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {oracle.lastUsedAt
                  ? new Date(oracle.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Last Used
              </Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Ask your question (optional)
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="What would you like to know?"
                placeholderTextColor={colors.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.runButton, { backgroundColor: categoryColor }]}
            onPress={handleRun}
            disabled={isRunning}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {isRunning ? (
                <GlowingOrb size={28} color="#fff" />
              ) : (
                <Play size={24} color="#fff" fill="#fff" />
              )}
            </Animated.View>
            <Text style={styles.runButtonText}>
              {isRunning ? 'Consulting Oracle...' : 'Consult Oracle'}
            </Text>
          </TouchableOpacity>

          {result && (
            <Animated.View
              style={[
                styles.resultContainer,
                { backgroundColor: colors.surface, opacity: resultFadeAnim }
              ]}
            >
              <LinearGradient
                colors={[`${categoryColor}10`, 'transparent']}
                style={styles.resultGlow}
              />
              <Sparkles size={20} color={categoryColor} />
              <Text style={[styles.resultText, { color: colors.text }]}>
                {result}
              </Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.surface }]}
            onPress={handleDelete}
          >
            <Trash2 size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>
              Delete Oracle
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  oracleHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  oracleName: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  oracleDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    borderRadius: 14,
    padding: 16,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 60,
    borderRadius: 18,
    marginBottom: 24,
  },
  runButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  resultContainer: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 24,
    gap: 12,
    overflow: 'hidden',
  },
  resultGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  resultText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});
