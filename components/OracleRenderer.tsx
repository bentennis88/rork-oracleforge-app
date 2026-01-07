import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

type OracleComponentType = 'text' | 'number' | 'slider' | 'select' | 'switch';

export type OracleJsonComponent = {
  id: string;
  type: OracleComponentType;
  label: string;
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
};

export type OracleJsonResult = {
  type: 'text' | 'chart' | 'list' | 'advice';
  formula?: string;
  chartType?: 'line' | 'bar' | 'pie';
  message?: string;
};

export type OracleJson = {
  title: string;
  description: string;
  category: string;
  components: OracleJsonComponent[];
  result: OracleJsonResult;
};

type OracleRendererProps = {
  oracle: OracleJson;
  /**
   * Optional: receive live input values + computed output.
   */
  onChange?: (args: { inputs: Record<string, any>; computed: any; renderedText?: string }) => void;
};

const DEFAULT_CHART_HEIGHT = 220;

function coerceDefaultValue(component: OracleJsonComponent) {
  if (component.defaultValue !== undefined) return component.defaultValue;

  switch (component.type) {
    case 'text':
      return '';
    case 'number':
      return component.min ?? 0;
    case 'slider':
      return component.min ?? 0;
    case 'select':
      return component.options?.[0] ?? '';
    case 'switch':
      return false;
    default:
      return '';
  }
}

function clampNumber(n: number, min?: number, max?: number) {
  let out = n;
  if (typeof min === 'number') out = Math.max(min, out);
  if (typeof max === 'number') out = Math.min(max, out);
  return out;
}

function safeEvalFormula(formula: string, inputs: Record<string, any>) {
  const expr = String(formula ?? '').trim();
  if (!expr) return null;

  // Basic hardening: block common JS escape hatches.
  const blocked = /[`;]|(\b(function|return|var|let|const|while|for|if|new|this|global|window|process|require|import|export|eval|constructor)\b)/i;
  if (blocked.test(expr)) {
    throw new Error('Unsafe formula');
  }

  // Allow only a conservative character set.
  const allowedChars = /^[0-9a-zA-Z_\s.+\-*/%(),?:<>=!&|[\]."'{}]*$/;
  if (!allowedChars.test(expr)) {
    throw new Error('Invalid formula characters');
  }

  // eslint-disable-next-line no-new-func
  const fn = new Function('inputs', 'Math', `"use strict"; return (${expr});`);
  return fn(inputs, Math);
}

function interpolateMessage(template: string, context: Record<string, any>) {
  return template.replace(/\{([a-zA-Z0-9_.$]+)\}/g, (_, key) => {
    const value = key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), context);
    if (value == null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });
}

function normalizeLineChartData(computed: any) {
  // Supported shapes:
  // - number[] => y-values
  // - { labels: string[], data: number[] }
  // - { labels: string[], series: number[] }
  if (Array.isArray(computed) && computed.every((x) => typeof x === 'number')) {
    return {
      labels: computed.map((_, i) => String(i + 1)),
      data: computed as number[],
    };
  }

  if (computed && typeof computed === 'object') {
    const labels = Array.isArray(computed.labels) ? computed.labels.map(String) : null;
    const data =
      Array.isArray(computed.data) && computed.data.every((x: any) => typeof x === 'number')
        ? computed.data
        : Array.isArray(computed.series) && computed.series.every((x: any) => typeof x === 'number')
        ? computed.series
        : null;

    if (labels && data) return { labels, data };
  }

  return null;
}

function normalizePieChartData(computed: any) {
  // Supported shapes:
  // - [{ name, value, color? }] => slices
  // - { [label]: number } => slices
  if (Array.isArray(computed) && computed.length > 0) {
    if (computed.every((x) => x && typeof x === 'object')) {
      const slices = computed
        .map((x) => ({
          name: String(x.name ?? x.label ?? ''),
          population: typeof x.value === 'number' ? x.value : typeof x.population === 'number' ? x.population : 0,
          color: String(x.color ?? ''),
        }))
        .filter((s) => s.name);
      return slices.length ? slices : null;
    }
    return null;
  }

  if (computed && typeof computed === 'object') {
    const entries = Object.entries(computed).filter(([, v]) => typeof v === 'number');
    if (!entries.length) return null;
    return entries.map(([k, v]) => ({ name: k, population: v as number, color: '' }));
  }

  return null;
}

export function OracleRenderer({ oracle, onChange }: OracleRendererProps) {
  const { colors } = useTheme();
  const [inputs, setInputs] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const c of oracle.components ?? []) initial[c.id] = coerceDefaultValue(c);
    return initial;
  });

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [inputs]);

  const computed = useMemo(() => {
    if (!oracle?.result?.formula) return null;
    return safeEvalFormula(oracle.result.formula, inputs);
  }, [oracle?.result?.formula, inputs]);

  const renderedText = useMemo(() => {
    const message = oracle?.result?.message;
    if (!message) return undefined;

    const context = {
      inputs,
      result: computed,
      ...(computed && typeof computed === 'object' ? computed : {}),
    };

    return interpolateMessage(message, context);
  }, [oracle?.result?.message, inputs, computed]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [computed, renderedText, anim]);

  useEffect(() => {
    onChange?.({ inputs, computed, renderedText });
  }, [inputs, computed, renderedText, onChange]);

  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 40, 360);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      color: (opacity = 1) => `${colors.accent}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
      labelColor: (opacity = 1) => `${colors.textSecondary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
      strokeWidth: 2,
      decimalPlaces: 0,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.accentLight,
      },
    }),
    [colors]
  );

  const line = useMemo(() => normalizeLineChartData(computed), [computed]);
  const pie = useMemo(() => normalizePieChartData(computed), [computed]);
  const pieColors = useMemo(
    () => ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'],
    []
  );

  const setInput = (id: string, value: any) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <LinearGradient
          colors={[`${colors.accent}12`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Text style={[styles.heading, { color: colors.text }]}>Inputs</Text>

        <View style={styles.inputs}>
          {(oracle.components ?? []).map((c) => {
            const value = inputs[c.id];
            return (
              <View key={c.id} style={styles.inputRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{c.label}</Text>

                {c.type === 'text' && (
                  <TextInput
                    style={[
                      styles.textInput,
                      { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                    placeholder={c.placeholder ?? 'Type here…'}
                    placeholderTextColor={colors.textMuted}
                    value={String(value ?? '')}
                    onChangeText={(t) => setInput(c.id, t)}
                  />
                )}

                {c.type === 'number' && (
                  <TextInput
                    style={[
                      styles.textInput,
                      { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                    placeholder={c.placeholder ?? '0'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={String(value ?? '')}
                    onChangeText={(t) => {
                      const n = Number(t);
                      if (!Number.isFinite(n)) {
                        setInput(c.id, t);
                        return;
                      }
                      setInput(c.id, clampNumber(n, c.min, c.max));
                    }}
                  />
                )}

                {c.type === 'slider' && (
                  <View style={styles.sliderRow}>
                    <Text style={[styles.sliderValue, { color: colors.text }]}>{String(value ?? '')}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={c.min ?? 0}
                      maximumValue={c.max ?? 100}
                      step={c.step ?? 1}
                      value={typeof value === 'number' ? value : coerceDefaultValue(c)}
                      onValueChange={(v) => setInput(c.id, v)}
                      minimumTrackTintColor={colors.accent}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.accentLight}
                    />
                  </View>
                )}

                {c.type === 'select' && (
                  <View style={[styles.pickerWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Picker selectedValue={value} onValueChange={(v) => setInput(c.id, v)}>
                      {(c.options ?? []).map((opt) => (
                        <Picker.Item key={opt} label={opt} value={opt} />
                      ))}
                    </Picker>
                  </View>
                )}

                {c.type === 'switch' && (
                  <View style={styles.switchRow}>
                    <Switch
                      value={Boolean(value)}
                      onValueChange={(v) => setInput(c.id, v)}
                      trackColor={{ false: colors.border, true: `${colors.accent}55` }}
                      thumbColor={Boolean(value) ? colors.accent : colors.textMuted}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Animated.View
        style={[
          styles.resultCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          {
            transform: [
              {
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.015],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.accentLight}16`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Text style={[styles.heading, { color: colors.text }]}>Result</Text>

        {oracle.result.type === 'chart' && oracle.result.chartType === 'pie' && pie && (
          <PieChart
            data={pie.map((s, i) => ({
              ...s,
              color: s.color || pieColors[i % pieColors.length],
              legendFontColor: colors.textSecondary,
              legendFontSize: 12,
            }))}
            width={chartWidth}
            height={DEFAULT_CHART_HEIGHT}
            chartConfig={chartConfig as any}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            hasLegend
            center={[0, 0]}
          />
        )}

        {oracle.result.type === 'chart' && oracle.result.chartType !== 'pie' && line && (
          <LineChart
            data={{
              labels: line.labels,
              datasets: [{ data: line.data }],
            }}
            width={chartWidth}
            height={DEFAULT_CHART_HEIGHT}
            chartConfig={chartConfig as any}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            style={styles.chart}
          />
        )}

        {(oracle.result.type === 'text' || oracle.result.type === 'advice') && (
          <View style={styles.textResultWrap}>
            <Text style={[styles.resultText, { color: colors.text }]}>{renderedText ?? String(computed ?? '')}</Text>
          </View>
        )}

        {oracle.result.type === 'list' && Array.isArray(computed) && (
          <View style={styles.list}>
            {computed.slice(0, 12).map((item: any, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                <Text style={[styles.listText, { color: colors.text }]}>{String(item)}</Text>
              </View>
            ))}
          </View>
        )}

        {oracle.result.type === 'list' && !Array.isArray(computed) && (
          <View style={styles.textResultWrap}>
            <Text style={[styles.resultText, { color: colors.textSecondary }]}>
              {renderedText ?? (computed == null ? 'Adjust inputs to see results.' : String(computed))}
            </Text>
          </View>
        )}

        {oracle.result.message && (oracle.result.type === 'chart' || oracle.result.type === 'list') && (
          <View style={styles.captionWrap}>
            <Text style={[styles.caption, { color: colors.textSecondary }]}>{renderedText}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  resultCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  inputs: {
    gap: 12,
  },
  inputRow: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sliderRow: {
    gap: 8,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  chart: {
    borderRadius: 14,
    marginTop: 6,
  },
  textResultWrap: {
    marginTop: 6,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  captionWrap: {
    marginTop: 12,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    marginTop: 6,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});


