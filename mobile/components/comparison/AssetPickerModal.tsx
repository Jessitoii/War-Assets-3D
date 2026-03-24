import React, { useState, useMemo } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, StyleSheet, Image, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { theme } from '../../styles/theme';
import { filterAssets } from '../../utils/assetFilters';
import { useTranslation } from 'react-i18next';
import { CDN_CONFIG } from '../../config/cdnConfig';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AssetPickerModal: React.FC<Props> = ({ visible, onClose }) => {
  const [search, setSearch] = useState('');
  const assets = useStore((state) => state.assets);
  const comparisonQueue = useStore((state) => state.comparisonQueue);
  const addToComparison = useStore((state) => state.addToComparison);
  const isDark = useStore((state) => state.theme) === 'dark';
  const { i18n } = useTranslation();

  const availableAssets = useMemo(() => {
    const filtered = filterAssets(assets, {
      searchQuery: search,
      language: i18n.language
    });
    return filtered.filter(a => !comparisonQueue.includes(a.id));
  }, [assets, search, comparisonQueue, i18n.language]);

  const handleSelect = (assetId: string) => {
    addToComparison(assetId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>Select Asset</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}
            placeholder="Search assets..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={availableAssets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.assetItem, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
              onPress={() => handleSelect(item.id)}
            >
              {/* @ts-ignore */}
              <Image source={{ uri: CDN_CONFIG.resolveImage(item.images[0]) }} style={styles.assetThumb} />
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: isDark ? '#FFF' : '#000' }]}>{item.name}</Text>
                <Text style={styles.assetCategory}>{item.categoryId}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#888" style={{ marginBottom: 16 }} />
              <Text style={{ color: isDark ? '#888' : '#666', textAlign: 'center' }}>
                {search ? 'No assets match your search.' : 'No more assets available to compare.'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    top: 28,
    zIndex: 1,
  },
  searchInput: {
    height: 44,
    borderRadius: 22,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  assetThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
  },
  assetCategory: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
});
