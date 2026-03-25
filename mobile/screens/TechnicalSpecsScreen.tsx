import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { PerformanceRadar } from '../components/asset-detail/PerformanceRadar';
import { useTranslation } from 'react-i18next';
import { DossierModal } from '../components/asset-detail/DossierModal';
import { getFlagEmoji } from '../utils/countryUtils';

type Props = StackScreenProps<RootStackParamList, 'TechnicalSpecs'>;

export const TechnicalSpecsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { assetId } = route.params;
  const { t, i18n } = useTranslation();
  const isDark = useStore((state) => state.theme === 'dark');
  const asset = useStore((state) => state.assets.find(a => a.id === assetId));
  // --- 🕵️ DEBUG LOGS START ---
  console.log('--- 🔍 DB-TO-UI TRACE ---');
  console.log('Target Asset ID:', assetId);
  if (!asset) {
    console.log('❌ FATAL: Asset not found in Store!');
  } else {
    console.log('✅ Asset Found:', asset.name);
    console.log('Raw Specs (Root):', typeof asset.specs, asset.specs ? 'Exists' : 'Null');
    console.log('Raw Translations:', typeof asset.translations, asset.translations ? 'Exists' : 'Null');

    // Detaylı inceleme
    if (asset.translations) {
      const parsed = typeof asset.translations === 'string' ? JSON.parse(asset.translations) : asset.translations;
      console.log('Available Langs:', Object.keys(parsed));
      console.log('Current Lang Config:', i18n.language);
      console.log('Target Lang Content:', JSON.stringify(parsed[i18n.language.split('-')[0]])?.slice(0, 100));
    }
  }
  console.log('--- 🔍 DEBUG END ---');
  // --- 🕵️ DEBUG LOGS END ---
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dossierVisible, setDossierVisible] = useState(false);
  const [dossierData, setDossierData] = useState({ title: '', content: '' });


  // 1. Dil Ayarı (tr-TR -> tr)
  const currentLang = (i18n.language || 'en').split('-')[0];

  // 2. Yardımcı Fonksiyon (Tanımlama hatasını önlemek için yukarıda)
  const formatValue = (val: any) => {
    const s = String(val);
    if (!s || s === "" || s.toLowerCase() === 'null') return t('specs.na');
    if (s.toLowerCase() === 'classified') return t('specs.classified');
    return s;
  };

  // 3. SQLite String -> Object Dönüşümü
  const translations = typeof asset?.translations === 'string'
    ? JSON.parse(asset.translations)
    : asset?.translations;

  // 4. Dil Verisini Yakala
  const langData = translations?.[currentLang];
  const enFallback = translations?.['en'];
  const displaySpecs = langData || enFallback || {};

  // 5. YENİ MANTIK: Veriyi Yapısına Göre Haritala
  let specs: any[] = [];
  let displayDossier: any = {};

  if (langData && langData.short_specs) {
    // ✅ LOGLARINDAKİ YAPI (tr.short_specs.range)
    specs = Object.entries(langData.short_specs)
      .filter(([_, value]) => value !== "") // Boş olanları süz
      .map(([key, value]) => ({
        key,
        short: formatValue(value),
        full: langData.full_dossier?.[key] || ""
      }));
    displayDossier = langData.full_dossier || {};
  }
  else if (langData) {
    // ✅ ALTERNATİF YAPI (tr.range.short_specs)
    specs = Object.entries(langData)
      .filter(([key, value]) => value && typeof value === 'object' && 'short_specs' in (value as any))
      .map(([key, value]: [string, any]) => ({
        key,
        short: formatValue(value.short_specs),
        full: value.full_dossier || ""
      }));

    // Dossier'ı bu yapıdan türet
    displayDossier = specs.reduce((acc, curr) => {
      if (curr.full) acc[curr.key] = curr.full;
      return acc;
    }, {});
  }
  else {
    // ✅ FALLBACK: Çeviri yoksa kök dizindeki düz specs'e bak
    const fallbackSource = asset?.specs || {};
    specs = Object.entries(fallbackSource)
      .filter(([key, value]) => typeof value === 'string' && key !== 'metrics')
      .map(([key, value]) => ({
        key,
        short: formatValue(value),
        full: ""
      }));
  }

  // 6. Ülke Bilgileri (Zaten çalışıyordu ama garantiye alalım)
  const countryCode = langData?.countryCode || asset?.translations?.['en']?.countryCode || asset?.countryCode;
  const countryName = langData?.country || asset?.translations?.['en']?.country || asset?.country;
  const handleSpecPress = (key: string, short: string, full?: string) => {
    setDossierData({
      title: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
      content: full || short
    });
    setDossierVisible(true);
  };

  const truncate = (str: string, limit: number = 60) => {
    if (str.length <= limit) return str;
    return str.substring(0, limit) + '...';
  };

  const textColor = isDark ? '#FFF' : '#000';
  const borderColor = isDark ? '#333' : '#E5E5EA';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>{t('specs.title')}</Text>
      </View>

      <ScrollView style={styles.container}>
        <View style={[styles.countryBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={styles.flagText}>
            {getFlagEmoji(countryCode || '')}
          </Text>
          <Text style={[styles.countryName, { color: textColor }]}>
            {countryName || 'Global'}
          </Text>
        </View>


        <View style={styles.table}>
          <View style={[styles.tableHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.headerCell, { color: textColor, flex: 1 }]}>{t('specs.label')}</Text>
            <TouchableOpacity
              style={styles.headerCellContainer}
              onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <Text style={[styles.headerCell, { color: textColor }]}>{t('specs.value')}</Text>
              <Ionicons name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {specs.map((item, index) => {
            const isLong = item.short.length > 60;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.tableRow,
                  { borderBottomColor: borderColor },
                  index % 2 === 1 && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                ]}
                onPress={() => handleSpecPress(item.key, item.short, item.full)}
              >
                <Text style={[styles.cell, { color: isDark ? '#AAA' : '#666', flex: 1, textTransform: 'capitalize' }]}>
                  {item.key.replace(/([A-Z])/g, ' $1')}
                </Text>
                <Text style={[styles.cell, { color: theme.colors.primary, fontWeight: '600', flex: 2, textAlign: 'right' }]}>
                  {truncate(item.short)}
                </Text>
              </TouchableOpacity>
            );
          })}

        </View>

        <View style={styles.chartSection}>
          <PerformanceRadar metrics={(asset as any)?.metrics || (asset as any)?.specs?.metrics} isDark={isDark} />
        </View>

        {/* --- TACTICAL DOSSIER SECTION --- */}
        {Object.keys(displayDossier).length > 0 && (
          <View style={[styles.dossierContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.dossierHeader}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
              <Text style={[styles.dossierTitle, { color: textColor }]}>TACTICAL DOSSIER</Text>
            </View>

            {Object.entries(displayDossier).map(([key, value]) => {
              // Sadece metin olanları ve boş olmayanları göster
              if (!value || typeof value !== 'string' || key === 'metrics') return null;

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.dossierItem}
                  onPress={() => handleSpecPress(key, value, value)}
                >
                  <Text style={[styles.dossierLabel, { color: theme.colors.primary }]}>
                    {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                  </Text>
                  <Text style={[styles.dossierText, { color: textColor }]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <DossierModal
        visible={dossierVisible}
        onClose={() => setDossierVisible(false)}
        title={dossierData.title}
        content={dossierData.content}
        isDark={isDark}
      />

    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  container: {
    padding: 16,
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerCell: {
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cell: {
    fontSize: 16,
  },
  chartPlaceholder: {
    marginTop: 10,
    marginBottom: 40,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chartSection: {
    marginTop: 10,
    marginBottom: 40,
    alignItems: 'center',
  },
  chartBox: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    gap: 10,
    alignSelf: 'flex-start',
  },
  flagText: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  dossierContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dossierTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dossierItem: {
    marginBottom: 16,
  },
  dossierLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dossierText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
});

