import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
  Play,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Oracle, categoryColors } from '@/types/oracle';

const { width } = Dimensions.get('window');

interface OracleCardProps {
  oracle: Oracle;
  onPress: () => void;
  variant?: 'compact' | 'list' | 'grid';
  onRunPress?: () => void;
}

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

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

export default React.memo(function OracleCard({ oracle, onPress, variant = 'grid', onRunPress }: OracleCardProps) {
  const { colors } = useTheme();
  const categoryColor = colors[categoryColors[oracle.category] as keyof typeof colors] as string;
  const IconComponent = iconMap[oracle.icon] || Sparkles;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handleRunPress = (e: any) => {
    if (onRunPress) {
      e.stopPropagation();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onRunPress();
    }
  };

  if (variant === 'compact') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.compactCard, { backgroundColor: colors.surface }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
        <LinearGradient
          colors={[`${categoryColor}20`, 'transparent']}
          style={styles.cardGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.compactIcon, { backgroundColor: `${categoryColor}20` }]}>
          <IconComponent size={20} color={categoryColor} />
        </View>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
          {oracle.name}
        </Text>
        {oracle.isFavorite && (
          <Star size={14} color={colors.accent} fill={colors.accent} />
        )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'list') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.listCard, { backgroundColor: colors.surface }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
        <View style={[styles.listIcon, { backgroundColor: `${categoryColor}20` }]}>
          <IconComponent size={22} color={categoryColor} />
        </View>
        <View style={styles.listContent}>
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
            {oracle.name}
          </Text>
          <Text style={[styles.listDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {oracle.description}
          </Text>
        </View>
        <View style={styles.listMeta}>
          {oracle.isFavorite && (
            <Star size={14} color={colors.accent} fill={colors.accent} />
          )}
          <Text style={[styles.listUsage, { color: colors.textMuted }]}>
            {oracle.usageCount}×
          </Text>
        </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const cardWidth = (width - 52) / 2;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: colors.surface, width: cardWidth }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
      <LinearGradient
        colors={[`${categoryColor}15`, 'transparent']}
        style={styles.cardGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.gridHeader}>
        <View style={[styles.gridIcon, { backgroundColor: `${categoryColor}20` }]}>
          <IconComponent size={22} color={categoryColor} />
        </View>
        {oracle.isFavorite && (
          <Star size={14} color={colors.accent} fill={colors.accent} />
        )}
      </View>
      <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
        {oracle.name}
      </Text>
      <Text style={[styles.gridDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {oracle.description}
      </Text>
      <View style={styles.gridFooter}>
        <View style={styles.gridFooterLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {oracle.category}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {formatDate(oracle.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.runButton, { backgroundColor: categoryColor }]}
          onPress={handleRunPress}
          activeOpacity={0.8}
        >
          <Play size={14} color={colors.background} fill={colors.background} />
        </TouchableOpacity>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 160,
    overflow: 'hidden',
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
  },
  listDescription: {
    fontSize: 13,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listUsage: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridCard: {
    padding: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  gridDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  gridFooterLeft: {
    flex: 1,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  runButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
