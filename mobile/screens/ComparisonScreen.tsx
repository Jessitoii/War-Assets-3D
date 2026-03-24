import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Dimensions, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { ComparisonHeader } from '../components/comparison/ComparisonHeader';
import { AssetComparisonCard } from '../components/comparison/AssetComparisonCard';
import { AssetPickerModal } from '../components/comparison/AssetPickerModal';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BattleForecastModal } from '../components/comparison/BattleForecastModal';

const { width } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export const ComparisonScreen = () => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [forecastVisible, setForecastVisible] = useState(false);
  const comparisonQueue = useStore((state) => state.comparisonQueue);
  const assets = useStore((state) => state.assets);
  const removeFromComparison = useStore((state) => state.removeFromComparison);
  const isDark = useStore((state) => state.theme) === 'dark';
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const queuedAssets = comparisonQueue
    .map(id => assets.find(a => a.id === id))
    .filter((a): a is any => !!a);

  const handleMiniPreviewPress = (assetId: string) => {
    navigation.navigate('ModelViewer', { assetId });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ComparisonHeader onAddPress={() => setPickerVisible(true)} />

      {queuedAssets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
            <Ionicons name="git-compare-outline" size={64} color={isDark ? '#444' : '#CCC'} />
          </View>
          <Text style={[styles.emptyText, { color: isDark ? '#888' : '#666' }]}>
            {t('comparison.empty_queue')}
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#444' : '#999' }]}>
            {t('comparison.empty_subtext')}
          </Text>
          <View style={styles.spacer} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={276} // Card width (260) + margin (16)
          decelerationRate="fast"
          pagingEnabled={false}
        >
          {queuedAssets.map(asset => (
            <AssetComparisonCard
              key={asset.id}
              asset={asset}
              isDark={isDark}
              onRemove={() => removeFromComparison(asset.id)}
              onPressMiniPreview={() => handleMiniPreviewPress(asset.id)}
            />
          ))}
          {queuedAssets.length < 3 && (
            <TouchableOpacity
              style={[styles.addSlot, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={48} color={isDark ? '#444' : '#CCC'} />
              <Text style={[styles.addSlotText, { color: isDark ? '#444' : '#CCC' }]}>{t('comparison.add_asset')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {queuedAssets.length === 2 && (
        <View style={styles.simulationContainer}>
          <TouchableOpacity 
            style={[styles.simulationButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setForecastVisible(true)}
          >
            <Ionicons name="shield-half-outline" size={24} color="#FFF" />
            <Text style={styles.simulationButtonText}>{t('comparison.initiate_simulation')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <AssetPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
      />

      {queuedAssets.length === 2 && (
        <BattleForecastModal
          visible={forecastVisible}
          onClose={() => setForecastVisible(false)}
          assetA={queuedAssets[0]}
          assetB={queuedAssets[1]}
          isDark={isDark}
        />
      )}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  spacer: {
    height: 60,
  },
  addSlot: {
    width: 260,
    height: 480, // Approximate height of the card
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128,128,128,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSlotText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  simulationContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  simulationButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  simulationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
  },
});
