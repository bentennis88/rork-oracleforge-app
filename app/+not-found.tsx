import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AlertCircle size={64} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text }]}>
          Page Not Found
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This oracle has vanished into the void
        </Text>
        <Link href="/" style={[styles.link, { color: colors.accent }]}>
          Return to Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  link: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});
