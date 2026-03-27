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
// No gradients for the clean, professional theme
import {
  Scale,
  Target,
  Lightbulb,
  Heart,
  Zap,
  Calendar,
  Star,
  Sun,
  Timer,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Oracle } from '@/types/oracle';

const { width } = Dimensions.get('window');

interface OracleCardProps {
  oracle: Oracle;
  onPress: () => void;
  variant?: 'compact' | 'list' | 'grid';
  onRunPress?: () => void;
  onDeletePress?: () => void;
  onLongPress?: () => void;
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
  Sun,
  Timer,
  Plus,
};

export default React.memo(function OracleCard({
  oracle,
  onPress,
  variant = 'grid',
  onRunPress,
  onDeletePress,
  onLongPress,
}: OracleCardProps) {
  const { colors } = useTheme();
  const IconComponent = iconMap[oracle.icon] || Plus;
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

  const handleDeletePress = (e: any) => {
    if (typeof (e?.stopPropagation) === 'function') e.stopPropagation();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onDeletePress) onDeletePress();
  };

  if (variant === 'compact') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.compactCard,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={450}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
        <View style={[styles.compactIcon, { borderColor: colors.border }]}>
          <IconComponent size={20} color={colors.textSecondary} />
        </View>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
          {oracle.name}
        </Text>
        {oracle.isFavorite && <Star size={14} color={colors.textSecondary} />}
        {onDeletePress && (
          <TouchableOpacity
            onPress={handleDeletePress}
            style={[styles.trashButton, { borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <Trash2 size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'list') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={450}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
        <View style={[styles.listIcon, { borderColor: colors.border }]}>
          <IconComponent size={22} color={colors.textSecondary} />
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
          {oracle.isFavorite && <Star size={14} color={colors.textSecondary} />}
          <Text style={[styles.listUsage, { color: colors.textMuted }]}>
            {oracle.usageCount}×
          </Text>
          {onDeletePress && (
            <TouchableOpacity
              onPress={handleDeletePress}
              style={[styles.trashButton, { borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const cardWidth = (width - 52) / 2;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: colors.surface, width: cardWidth, borderColor: colors.border }]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
      <View style={styles.gridHeader}>
        <View style={[styles.gridIcon, { borderColor: colors.border }]}>
          <IconComponent size={22} color={colors.textSecondary} />
        </View>
        <View style={styles.gridHeaderRight}>
          {oracle.isFavorite && <Star size={14} color={colors.textSecondary} />}
          {onDeletePress && (
            <TouchableOpacity
              onPress={handleDeletePress}
              style={[styles.trashButton, { borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              <Trash2 size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
        {oracle.name}
      </Text>
      <Text style={[styles.gridDescription, { color: colors.textSecondary }]} numberOfLines={1}>
        {oracle.description}
      </Text>
      <View style={styles.gridFooter}>
        <View style={styles.gridFooterLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.textMuted }]}>
              {oracle.category}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {formatDate(oracle.createdAt)}
          </Text>
        </View>
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
    borderRadius: 4,
    minWidth: 160,
    overflow: 'hidden',
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  trashButton: {
    width: 28,
    height: 28,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
  },
  listDescription: {
    fontSize: 13,
    opacity: 0.9,
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
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gridHeaderRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  gridName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
  },
  gridDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.9,
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
    borderRadius: 2,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
