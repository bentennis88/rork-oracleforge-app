import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  Platform,
} from 'react-native';
// No gradients for the clean, professional theme
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Moon,
  Sun,
  Bell,
  Vibrate,
  Info,
  ChevronRight,
  Shield,
  HelpCircle,
  LogOut,
  Crown,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/typography';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { oracles, favoriteOracles } = useOracles();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleThemeToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleTheme();
  };

  const totalUsage = oracles.reduce((sum, o) => sum + o.usageCount, 0);

  const stats = [
    { label: 'Oracles', value: oracles.length },
    { label: 'Favorites', value: favoriteOracles.length },
    { label: 'Total Uses', value: totalUsage },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerGradient, { backgroundColor: colors.background }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.avatarMonogram, { color: colors.text }]}>
              {(user?.email?.[0] || 'O').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.email?.split('@')[0] || 'Oracle Forger'}
          </Text>
          <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>
            Creating wisdom since 2024
          </Text>
        </Animated.View>

        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Subscription
          </Text>
          <View style={[styles.subscriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionHeader}>
                <View style={[styles.planBadge, { borderColor: colors.border }]}>
                  <Zap size={16} color={colors.textMuted} />
                  <Text style={[styles.planBadgeText, { color: colors.textMuted }]}>
                    Free Plan
                  </Text>
                </View>
              </View>
              <View style={styles.limitContainer}>
                <Text style={[styles.limitText, { color: colors.textSecondary }]}>
                  Limited to 3 oracles
                </Text>
                <View style={styles.limitBar}>
                  <View 
                    style={[
                      styles.limitBarFill, 
                      { 
                        backgroundColor: 'rgba(255,255,255,0.22)',
                        width: `${Math.min((oracles.length / 3) * 100, 100)}%`
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.limitCount, { color: colors.textMuted }]}>
                  {oracles.length} of 3 used
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.upgradeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }}
            >
              <View style={styles.upgradeButtonGradient}>
                <Crown size={18} color="#FFFFFF" />
                <Text style={[styles.upgradeButtonText, { color: '#FFFFFF' }]}>Upgrade to Pro</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleThemeToggle}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                {isDark ? (
                  <Moon size={22} color={colors.textSecondary} />
                ) : (
                  <Sun size={22} color={colors.textSecondary} />
                )}
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleThemeToggle}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: 'rgba(255,255,255,0.18)' }}
                thumbColor="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Preferences
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Vibrate size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Haptic Feedback
                </Text>
              </View>
              <Switch
                value={true}
                trackColor={{ false: colors.border, true: 'rgba(255,255,255,0.18)' }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Notifications
                </Text>
              </View>
              <Switch
                value={false}
                trackColor={{ false: colors.border, true: 'rgba(255,255,255,0.18)' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
                  {user?.email || 'Not logged in'}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity 
              style={styles.settingRow} 
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  await signOut();
                  router.replace('/welcome');
                } catch (error) {
                  console.error('Sign out error:', error);
                }
              }}
            >
              <View style={styles.settingLeft}>
                <LogOut size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
                  Sign Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            About
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <Info size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  About OracleForge
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <HelpCircle size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Help & Support
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <Shield size={22} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Privacy Policy
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Info size={16} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              OracleForge v1.0.0
            </Text>
          </View>
          <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>
            Made with ♥
          </Text>
        </View>
      </ScrollView>
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
    height: 200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  avatarMonogram: {
    fontFamily: Typography.title,
    fontSize: 28,
    letterSpacing: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Typography.title,
  },
  userSubtitle: {
    fontSize: 15,
    fontFamily: Typography.body,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
    fontFamily: Typography.bodyStrong,
  },
  settingsCard: {
    borderRadius: 8,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Typography.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
  },
  subscriptionCard: {
    borderRadius: 8,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  subscriptionContent: {
    gap: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.bodyStrong,
  },
  limitContainer: {
    gap: 8,
  },
  limitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  limitBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  limitCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    borderRadius: 8,
    borderWidth: 1,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.bodyStrong,
  },
});
