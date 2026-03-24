import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { theme } from '../styles/theme';

interface Props {
  onSearchPress: () => void;
  onComparePress: () => void;
  onFavoritesPress: () => void;
  onSettingsPress?: () => void;
  onMapPress?: () => void;
}

export const HeaderBar: React.FC<Props> = ({ 
  onSearchPress, 
  onComparePress, 
  onFavoritesPress,
  onSettingsPress,
  onMapPress
}) => {
  const currentTheme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const queueLength = useStore((state) => state.comparisonQueue.length);
  const favoriteCount = useStore((state) => state.favorites.length);
  const isDark = currentTheme === 'dark';
  
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
    setMenuVisible(false);
  };

  const handleSettings = () => {
    onSettingsPress?.();
    setMenuVisible(false);
  };

  const handleMap = () => {
    onMapPress?.();
    setMenuVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text 
          style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          WAR ASSETS 3D
        </Text>
      </View>
      
      <View style={styles.iconGroup}>
        {/* Primary Icons */}
        <TouchableOpacity onPress={onSearchPress} style={styles.iconButton} accessibilityLabel="Open search filters">
          <Ionicons name="search" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onFavoritesPress} style={styles.iconButton} accessibilityLabel="Open favorites">
          <Ionicons name="heart" size={24} color={favoriteCount > 0 ? theme.colors.error : (isDark ? '#FFF' : '#000')} />
          {favoriteCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.badgeText}>{favoriteCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onComparePress} style={styles.iconButton} accessibilityLabel="Open comparison">
          <Ionicons name="git-compare" size={24} color={isDark ? '#FFF' : '#000'} />
          {queueLength > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{queueLength}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* More Menu Toggle */}
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)} 
          style={styles.iconButton} 
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-vertical" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Secondary Options Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
    <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[
            styles.menuContent, 
            { 
              backgroundColor: isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }
          ]}>
            <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
              <Ionicons 
                name={isDark ? 'sunny' : 'moon'} 
                size={20} 
                color={theme.colors.primary} 
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: isDark ? '#FFF' : '#000' }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />

            {onSettingsPress && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                  <Ionicons name="settings" size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: isDark ? '#FFF' : '#000' }]}>Settings</Text>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />
              </>
            )}

            {onMapPress && (
              <TouchableOpacity style={styles.menuItem} onPress={handleMap}>
                <Ionicons name="earth" size={20} color={theme.colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDark ? '#FFF' : '#000' }]}>Global Map</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 10,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    ...theme.typography.title,
    fontSize: 15,
    letterSpacing: 1,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 12,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContent: {
    marginTop: 60,
    marginRight: 10,
    borderRadius: 8,
    padding: 8,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    marginHorizontal: 8,
  },
});
