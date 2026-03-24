import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { AssetCard } from '../components/AssetCard';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { useShallow } from 'zustand/react/shallow';

type Props = StackScreenProps<RootStackParamList, 'Favorites'>;

export const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';

  const assets = useStore(useShallow((state) => state.assets));
  const favorites = useStore(useShallow((state) => state.favorites));

  const favoritedAssets = useMemo(() => {
    return assets.filter((asset) => favorites.includes(asset.id));
  }, [assets, favorites]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>TACTICAL COLLECTION</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={favoritedAssets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AssetCard
              asset={item}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={80} color={isDark ? '#444' : '#CCC'} />
            <Text style={[styles.emptyText, { color: isDark ? '#FFF' : '#000' }]}>DATASET EMPTY</Text>
            <Text style={[styles.emptySubtext, { color: isDark ? '#888' : '#666' }]}>
              Secure assets by marking them as favorites to build your local intelligence repository.
            </Text>
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
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40, // Match back button width
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 20,
    letterSpacing: 2,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
