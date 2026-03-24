import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { BeautifulMention } from '../components/BeautifulMention';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAssets } from '../hooks/useAssets';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { SortModal } from '../components/SortModal';
import { useTranslation } from 'react-i18next';

type SearchFilterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchFilter'>;

interface Props {
  navigation: SearchFilterScreenNavigationProp;
}

const COUNTRIES = ['USA', 'Germany', 'USSR', 'UK', 'France', 'Turkey', 'Russia', 'China'];
const GENERATIONS = ['WW2', 'Cold War', '3rd Gen', '4th Gen', '5th Gen'];

export const SearchFilterScreen: React.FC<Props> = ({ navigation }) => {
  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';
  const { t } = useTranslation();

  const categories = useStore(useShallow(state => state.categories));
  
  const selectedCategoryId = useStore((state) => state.selectedCategoryId);
  const setFilterCategory = useStore((state) => state.setFilterCategory);

  const selectedCountry = useStore((state) => state.selectedCountry);
  const setFilterCountry = useStore((state) => state.setFilterCountry);

  const selectedGeneration = useStore((state) => state.selectedGeneration);
  const setFilterGeneration = useStore((state) => state.setFilterGeneration);

  const searchQuery = useStore((state) => state.searchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const resetFilters = useStore(state => state.resetFilters);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  
  // Debounce Search Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Sync with store (e.g. on reset)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);
  const displayedAssets = useAssets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]} edges={['bottom', 'top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={isDark ? '#888' : '#AAA'} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={localSearch}
            onChangeText={setLocalSearch}
            autoFocus={true}
          />
          {localSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearch('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#888' : '#AAA'} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => setSortModalVisible(true)} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity onPress={() => resetFilters()} style={styles.resetButton}>
            <Text style={styles.resetText}>{t('search.reset')}</Text>
          </TouchableOpacity>
          
          {categories.map(cat => (
            <BeautifulMention
              key={cat.id}
              label={cat.name}
              isActive={selectedCategoryId === cat.id}
              onPress={() => setFilterCategory(selectedCategoryId === cat.id ? null : cat.id)}
              onRemove={() => setFilterCategory(null)}
            />
          ))}
          {COUNTRIES.map(c => (
            <BeautifulMention
              key={c}
              label={c}
              isActive={selectedCountry === c}
              onPress={() => setFilterCountry(selectedCountry === c ? null : c)}
              onRemove={() => setFilterCountry(null)}
            />
          ))}
          {GENERATIONS.map(g => (
            <BeautifulMention
              key={g}
              label={g}
              isActive={selectedGeneration === g}
              onPress={() => setFilterGeneration(selectedGeneration === g ? null : g)}
              onRemove={() => setFilterGeneration(null)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={displayedAssets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <QuickAccessCard
              asset={item}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={
          <Text style={[styles.resultsCount, { color: isDark ? '#888' : '#666' }]}>
            {displayedAssets.length} {t('search.results').toLowerCase()}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#888" style={{ marginBottom: 16 }} />
            <Text style={{ color: isDark ? '#888' : '#666' }}>{t('search.no_match')}</Text>
          </View>
        }
      />

      <SortModal visible={sortModalVisible} onClose={() => setSortModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  closeButton: {
    padding: 4,
    marginRight: 8,
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingLeft: 38,
    paddingRight: 38,
    fontSize: 16,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  sortButton: {
    padding: 8,
    marginLeft: 8,
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resetButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  resetText: {
    color: '#FF453A',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: '48%',
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
});
