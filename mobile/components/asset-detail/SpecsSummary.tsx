import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Asset, AssetSpecs } from '../../store/slices/assetSlice';
import { getFlagEmoji } from '../../utils/countryUtils';
import { useTranslation } from 'react-i18next';

interface SpecsSummaryProps {
  asset: Asset;
  isDark: boolean;
  onPress: () => void;
}

export const SpecsSummary: React.FC<SpecsSummaryProps> = ({ asset, isDark, onPress }) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language || 'en';

  // Tactical Intelligence Selector: Priority (Current Lang -> EN)
  const langSpecs = asset.translations?.[currentLang]?.short_specs;
  const enFallback = asset.short_specs;

  const displaySpecs = langSpecs || enFallback || {};
  const countryCode = asset.countryCode;
  const countryName = asset.country;

  const cardBg = isDark ? theme.colors.secondary : '#FFF';
  const textColor = isDark ? '#FFF' : '#000';
  const subTextColor = isDark ? '#AAA' : '#666';

  const items = [
    { label: t('asset.range'), value: displaySpecs.range || 'N/A', icon: 'navigate-outline' },
    { label: t('asset.speed'), value: displaySpecs.speed || 'N/A', icon: 'speedometer-outline' },
    { label: t('asset.generation'), value: displaySpecs.generation || 'N/A', icon: 'git-network-outline' },
    {
      label: t('asset.origin'),
      value: `${getFlagEmoji(countryCode || '')} ${countryName || 'Global'}`.trim(),
      icon: 'earth-outline'
    },
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: cardBg }]}
      accessibilityLabel="View technical specifications"
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>{t('common.technical_summary')}</Text>
        <Ionicons name="chevron-forward" size={18} color={subTextColor} />
      </View>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={index} style={styles.specItem}>
            <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
            <Text style={[styles.value, { color: textColor }]}>{item.value}</Text>
            <Text style={[styles.label, { color: subTextColor }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specItem: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});
