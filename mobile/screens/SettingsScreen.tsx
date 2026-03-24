import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useStore } from '../store';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../locales';
import { LanguageCode } from '../store/slices/appSlice';

export const SettingsScreen = () => {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const arEnabled = useStore((state) => state.arEnabled);
  const setArEnabled = useStore((state) => state.setArEnabled);
  const supportsAR = useStore((state) => state.supportsAR);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const { t } = useTranslation();

  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState({
    is_offline_ready: false,
    db_size_bytes: 0,
    last_sync: null as string | null,
  });

  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#1a1a2e' : '#f0f2f5',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#2d3748',
    subtext: isDark ? '#94a3b8' : '#718096',
    border: isDark ? '#2e3748' : '#e2e8f0',
    primary: '#3182ce',
  };

  const fetchOfflineStatus = async () => {
    try {
      const db = await SQLite.openDatabaseAsync('war-assets.db');
      const result: any = await db.getFirstAsync('SELECT * FROM offline_status WHERE id = 1');
      if (result) {
        setOfflineStatus({
          is_offline_ready: Boolean(result.is_offline_ready),
          db_size_bytes: result.db_size_bytes || 0,
          last_sync: result.last_sync,
        });
      }
    } catch (e) {
      console.error('Failed to fetch offline status', e);
    }
  };

  useEffect(() => {
    fetchOfflineStatus();
  }, []);

  const handleToggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleToggleAR = () => {
    if (!supportsAR) {
      Alert.alert('AR Not Supported', 'Your device does not support AR features.');
      return;
    }
    setArEnabled(!arEnabled);
  };
  
  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setShowLanguageModal(false);
  };

  const languages: { code: LanguageCode; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe' },
    { code: 'ru', label: 'Russian', native: 'Русский' },
    { code: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'zh', label: 'Chinese', native: '中文' },
  ];

  const currentLanguageLabel = languages.find(l => l.code === language)?.native || 'English';

  const handleDataSync = async () => {
    setIsSyncing(true);
    try {
      // Mock API call to /api/v1/sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const dbInfo = await FileSystem.getInfoAsync((FileSystem.documentDirectory || '') + 'SQLite/war-assets.db');
      const dbSize = dbInfo.exists ? dbInfo.size : 0;
      const timestamp = new Date().toISOString();

      const db = await SQLite.openDatabaseAsync('war-assets.db');
      await db.runAsync(
        'UPDATE offline_status SET is_offline_ready = 1, db_size_bytes = ?, last_sync = ? WHERE id = 1',
        [dbSize, timestamp]
      );
      
      await fetchOfflineStatus();
      Alert.alert('Sync Complete', 'Data successfully synchronized.');
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not synchronize data.');
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('common.settings')}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('common.appearance')}</Text>
        
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{t('common.dark_mode')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>{t('common.toggle_theme')}</Text>
          </View>
          <Switch 
            value={isDark} 
            onValueChange={handleToggleTheme}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityHint="Toggles dark mode"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity 
          style={styles.row}
          onPress={() => setShowLanguageModal(true)}
        >
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{currentLanguageLabel}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>{t('settings.language_selection') || 'Change application language'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.select_language') || 'Select Language'}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    language === item.code && { backgroundColor: `${colors.primary}20` }
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <View>
                    <Text style={[styles.languageNative, { color: colors.text }]}>{item.native}</Text>
                    <Text style={[styles.languageLabel, { color: colors.subtext }]}>{item.label}</Text>
                  </View>
                  {language === item.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('common.data_sync')}</Text>
        
        <View style={styles.stateContainer}>
          <View style={styles.stateRow}>
            <Ionicons name={offlineStatus.is_offline_ready ? "cloud-done" : "cloud-offline"} size={24} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {offlineStatus.is_offline_ready ? t('common.offline_ready') : t('common.online_only')}
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                {t('common.db_size')}: {(offlineStatus.db_size_bytes / 1024).toFixed(1)} KB
              </Text>
              {offlineStatus.last_sync && (
                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                  {t('common.last_sync')}: {new Date(offlineStatus.last_sync).toLocaleString(language)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.syncButton, { backgroundColor: colors.primary, opacity: isSyncing ? 0.7 : 1 }]}
          onPress={handleDataSync}
          disabled={isSyncing}
        >
          <Ionicons name="sync" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.syncButtonText}>
            {isSyncing ? t('common.syncing') : t('common.sync_now')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('common.features')}</Text>
        
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{t('common.enable_ar')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {supportsAR ? t('common.allow_ar') : t('common.ar_not_supported')}
            </Text>
          </View>
          <Switch 
            value={arEnabled} 
            onValueChange={handleToggleAR}
            disabled={!supportsAR}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityHint="Toggles augmented reality capability"
          />
        </View>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 14,
  },
  stateContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageNative: {
    fontSize: 18,
    fontWeight: '600',
  },
  languageLabel: {
    fontSize: 14,
  },
});
