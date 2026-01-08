import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Star, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';
import { useAuth } from '@/hooks/useAuth';
import OracleCard from '@/components/OracleCard';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Typography } from '@/constants/typography';

export default React.memo(function HomeScreen() {
  const { colors } = useTheme();
  const { oracles, favoriteOracles, recentOracles, isLoading } = useOracles();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, [fadeAnim, slideAnim]);

  const handleCreateOracle = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)/create');
  }, []);

  const showToast = useCallback((message: string) => {
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
  }, []);

  const confirmDelete = useCallback(
    (oracleId: string, oracleName?: string) => {
      if (!user) return;

      const doDelete = async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'oracles', oracleId));
          // Firestore snapshot listener in useOracles will refresh the list automatically.
        } catch (e) {
          console.error('Delete failed:', e);
          showToast('Delete failed');
        }
      };

      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        const name = oracleName ? `'${oracleName}'` : 'this oracle';
        if (confirm(`Permanently delete ${name}? This cannot be undone.`)) void doDelete();
        return;
      }

      Alert.alert(
        `Permanently delete '${oracleName || 'this oracle'}'?`,
        'This cannot be undone.',
        [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
        ]
      );
    },
    [showToast, user]
  );

  const handleOraclePress = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/oracle/${id}` as const);
  }, []);

  const handleOracleRun = useCallback((oracle: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const fullOracle =
      oracle?.oracleJson ??
      ({
        title: oracle?.name ?? 'Untitled Oracle',
        description: oracle?.description ?? '',
        category: oracle?.category ?? 'Other',
        components: [],
        result: { type: 'text', message: 'No result' },
      } as const);

    router.push({
      pathname: '/oracle-run',
      params: {
        oracle: JSON.stringify(fullOracle),
        userPrompt: oracle?.prompt ?? '',
        oracleId: oracle?.id ?? '',
      },
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.greeting, { color: colors.text }]}>Dashboard</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              {firstName}&apos;s oracles
            </Text>
          </View>
          <Pressable
            onPress={handleCreateOracle}
            style={({ pressed }) => [
              styles.createButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.createButtonText, { color: '#FFFFFF' }]}>New</Text>
          </Pressable>
        </Animated.View>



        {favoriteOracles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={18} color={colors.textMuted} strokeWidth={2} />
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
                  onPress={() => handleOracleRun(oracle)}
                  onRunPress={() => handleOracleRun(oracle)}
                  onDeletePress={() => confirmDelete(oracle.id, oracle.name)}
                  onLongPress={() => confirmDelete(oracle.id, oracle.name)}
                  variant="compact"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {recentOracles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recently Used
              </Text>
            </View>
            <View style={styles.recentList}>
              {recentOracles.slice(0, 3).map((oracle) => (
                <OracleCard
                  key={oracle.id}
                  oracle={oracle}
                  onPress={() => handleOracleRun(oracle)}
                  onRunPress={() => handleOracleRun(oracle)}
                  onDeletePress={() => confirmDelete(oracle.id, oracle.name)}
                  onLongPress={() => confirmDelete(oracle.id, oracle.name)}
                  variant="list"
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Oracles
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
                {oracles.length}
              </Text>
            </View>
          </View>
          <View style={styles.oracleGrid}>
            {oracles.map((oracle) => (
              <OracleCard
                key={oracle.id}
                oracle={oracle}
                onPress={() => handleOracleRun(oracle)}
                onRunPress={() => handleOracleRun(oracle)}
                onDeletePress={() => confirmDelete(oracle.id, oracle.name)}
                onLongPress={() => confirmDelete(oracle.id, oracle.name)}
                variant="grid"
              />
            ))}
          </View>
        </View>

        {oracles.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Create your first oracle
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Use “New” to start building.
            </Text>
          </View>
        )}
      </ScrollView>

    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerContent: {
    gap: 8,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    fontFamily: Typography.title,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.body,
  },
  createButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: Typography.bodyStrong,
    letterSpacing: 0.2,
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
    fontFamily: Typography.titleAlt,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
  // FAB removed for calmer, more professional UI
});
