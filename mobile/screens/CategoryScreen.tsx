import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { BeautifulMention } from '../components/BeautifulMention';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = StackScreenProps<RootStackParamList, 'Category'>;

export const CategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId: initialCategoryId } = route.params;
  const { t } = useTranslation();

  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';

  const categories = useStore(useShallow(state => state.categories));
  const assets = useStore(useShallow(state => state.assets));

  const selectedCategoryId = useStore((state) => state.selectedCategoryId);
  const setFilterCategory = useStore((state) => state.setFilterCategory);

  const selectedCountry = useStore((state) => state.selectedCountry);
  const selectedGeneration = useStore((state) => state.selectedGeneration);

  // Sync route param on initial mount
  useEffect(() => {
    if (initialCategoryId && selectedCategoryId !== initialCategoryId) {
      setFilterCategory(initialCategoryId);
    }
  }, [initialCategoryId]);

  const displayedAssets = useMemo(() => {
    return assets.filter(asset => {
      if (selectedCategoryId && asset.categoryId !== selectedCategoryId) return false;
      if (selectedCountry && asset.specs?.country && asset.specs.country !== selectedCountry) return false;
      if (selectedGeneration && asset.specs?.generation && asset.specs.generation !== selectedGeneration) return false;
      return true;
    });
  }, [assets, selectedCategoryId, selectedCountry, selectedGeneration]);

  const handleCategoryPress = (id: string) => {
    if (selectedCategoryId === id) {
      setFilterCategory(null);
    } else {
      setFilterCategory(id);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>{t('browse.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SearchFilter')} style={styles.filterButton}>
          <Ionicons name="filter" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
      </View>

      <View style={styles.mentionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mentionsScroll}>
          {categories.map(cat => (
            <BeautifulMention
              key={cat.id}
              label={cat.name}
              isActive={selectedCategoryId === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              onRemove={() => setFilterCategory(null)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={displayedAssets}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <QuickAccessCard
              asset={item}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: isDark ? '#FFF' : '#000' }}>{t('browse.no_assets')}</Text>
          </View>
        }
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  title: {
    ...theme.typography.title,
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  filterButton: {
    padding: 8,
    marginRight: -8,
  },
  mentionsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  mentionsScroll: {
    paddingHorizontal: 16,
  },
  listContainer: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: '48%',
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 50,
    alignItems: 'center',
  }
});
