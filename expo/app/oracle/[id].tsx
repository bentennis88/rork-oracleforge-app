import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useOracles } from '@/hooks/useOracles';

export default function OracleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { oracles, isLoading } = useOracles();

  const oracle = useMemo(() => oracles.find((o) => o.id === id), [id, oracles]);

  useEffect(() => {
    if (!oracle) return;

    const fullOracle =
      oracle?.oracleJson ??
      ({
        title: oracle?.name ?? 'Untitled Oracle',
        description: oracle?.description ?? '',
        category: oracle?.category ?? 'Other',
        components: [],
        result: { type: 'text', message: 'No result' },
      } as const);

    router.replace({
      pathname: '/oracle-run',
      params: {
        oracle: JSON.stringify(fullOracle),
        userPrompt: oracle?.prompt ?? '',
        oracleId: oracle?.id ?? '',
      },
    });
  }, [oracle]);

  if (!oracle) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : (
          <Text style={[styles.text, { color: colors.textSecondary }]}>Oracle not found</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.textMuted} />
      <Text style={[styles.text, { color: colors.textMuted }]}>Opening oracle…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  text: {
    fontSize: 14,
  },
});


