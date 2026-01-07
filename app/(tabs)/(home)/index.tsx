import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Sparkles, Star, Clock, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';
import { useAuth } from '@/hooks/useAuth';
import OracleCard from '@/components/OracleCard';
import GlowingOrb from '@/components/GlowingOrb';

const MOTIVATIONAL_QUOTES = [
  "The future belongs to those who believe in the beauty of their dreams.",
  "Every moment is a fresh beginning.",
  "Your only limit is your mind.",
  "Believe you can and you're halfway there.",
  "The best time for new beginnings is now.",
  "Small steps every day lead to big changes.",
  "Trust your intuition, it knows the way.",
];

export default React.memo(function HomeScreen() {
  const { colors } = useTheme();
  const { oracles, favoriteOracles, recentOracles, isLoading } = useOracles();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  const firstName = useMemo(() => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(fabScale, {
      toValue: 1,
      delay: 400,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim, fabScale]);

  const handleCreateOracle = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)/create');
  }, []);

  const handleOraclePress = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/oracle/${id}` as const);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.backgroundSecondary, colors.background]}
        style={styles.headerGradient}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hey {firstName},</Text>
            <Text style={[styles.quote, { color: colors.textSecondary }]}>
              {dailyQuote}
            </Text>
          </View>
        </Animated.View>



        {favoriteOracles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={18} color={colors.accent} fill={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Favorites
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {favoriteOracles.map((oracle) => (
                <OracleCard
                  key={oracle.id}
                  oracle={oracle}
                  onPress={() => handleOraclePress(oracle.id)}
                  onRunPress={() => handleOraclePress(oracle.id)}
                  variant="compact"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {recentOracles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={colors.cyan} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recently Used
              </Text>
            </View>
            <View style={styles.recentList}>
              {recentOracles.slice(0, 3).map((oracle) => (
                <OracleCard
                  key={oracle.id}
                  oracle={oracle}
                  onPress={() => handleOraclePress(oracle.id)}
                  onRunPress={() => handleOraclePress(oracle.id)}
                  variant="list"
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={colors.accentLight} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Oracles
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.countText, { color: colors.background }]}>
                {oracles.length}
              </Text>
            </View>
          </View>
          <View style={styles.oracleGrid}>
            {oracles.map((oracle) => (
              <OracleCard
                key={oracle.id}
                oracle={oracle}
                onPress={() => handleOraclePress(oracle.id)}
                onRunPress={() => handleOraclePress(oracle.id)}
                variant="grid"
              />
            ))}
          </View>
        </View>

        {oracles.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <GlowingOrb size={80} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No oracles yet.
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap Create to build your first one!
            </Text>
          </View>
        )}
      </ScrollView>

      <Animated.View 
        style={[
          styles.fab,
          { 
            backgroundColor: colors.accent,
            bottom: insets.bottom + 20,
            transform: [{ scale: fabScale }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleCreateOracle}
          activeOpacity={0.9}
        >
          <Plus size={28} color={colors.background} strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 28,
  },
  headerContent: {
    gap: 8,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  quote: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    opacity: 0.8,
  },

  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  horizontalScroll: {
    paddingRight: 20,
    gap: 12,
  },
  recentList: {
    gap: 12,
  },
  oracleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
