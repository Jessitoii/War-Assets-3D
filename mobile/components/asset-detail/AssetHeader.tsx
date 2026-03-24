import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence
} from 'react-native-reanimated';

interface AssetHeaderProps {
  name: string;
  isFavorite: boolean;
  isDark: boolean;
  isTrending?: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({
  name,
  isFavorite,
  isDark,
  isTrending,
  onBack,
  onToggleFavorite,
}) => {
  const textColor = isDark ? '#FFF' : '#000';
  const iconColor = isDark ? '#FFF' : '#000';

  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isTrending) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [isTrending]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={onBack} 
        style={styles.backButton}
        accessibilityLabel="Go back"
        accessibilityHint="Navigates to the previous screen"
      >
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {name}
        </Text>
        {isTrending && (
          <Animated.View style={[styles.liveIndicator, animatedStyle]}>
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity 
        onPress={onToggleFavorite} 
        style={styles.favoriteButton}
        accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
        accessibilityHint={isFavorite ? "Removes this asset from your favorites list" : "Adds this asset to your favorites list"}
      >
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color={isFavorite ? '#FF3B30' : iconColor} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    height: 60,
  },
  backButton: {
    padding: 8,
    width: theme.spacing.touchTarget,
    height: theme.spacing.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    ...theme.typography.title,
    fontSize: 20,
    maxWidth: '70%',
  },
  favoriteButton: {
    padding: 8,
    width: theme.spacing.touchTarget,
    height: theme.spacing.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
