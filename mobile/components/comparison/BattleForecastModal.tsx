import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../store/slices/assetSlice';
import { theme } from '../../styles/theme';
import { BattleEnvironment, Terrain, Weather, Range, simulateBattle, SimulationResult } from '../../utils/BattleSimulator';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  assetA: Asset;
  assetB: Asset;
  isDark: boolean;
}

export const BattleForecastModal: React.FC<Props> = ({ visible, onClose, assetA, assetB, isDark }) => {
  const [step, setStep] = useState<'selection' | 'report'>('selection');
  const [terrain, setTerrain] = useState<Terrain>('Plains');
  const [weather, setWeather] = useState<Weather>('Clear');
  const [range, setRange] = useState<Range>('Close');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleRunSimulation = () => {
    const env: BattleEnvironment = { terrain, weather, range };
    const simResult = simulateBattle(assetA, assetB, env);
    setResult(simResult);
    setStep('report');
  };

  const handleClose = () => {
    setStep('selection');
    onClose();
  };

  const renderSelection = () => (
    <View style={styles.content}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : '#666' }]}>SELECT TERRAIN</Text>
      <View style={styles.pickerRow}>
        {(['Plains', 'Mountain', 'Mud'] as Terrain[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.pickerButton,
              terrain === t && styles.pickerButtonActive,
              { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }
            ]}
            onPress={() => setTerrain(t)}
          >
            <Text style={[styles.pickerText, terrain === t && styles.pickerTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : '#666' }]}>WEATHER CONDITIONS</Text>
      <View style={styles.pickerRow}>
        {(['Clear', 'Fog', 'Rain'] as Weather[]).map((w) => (
          <TouchableOpacity
            key={w}
            style={[
              styles.pickerButton,
              weather === w && styles.pickerButtonActive,
              { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }
            ]}
            onPress={() => setWeather(w)}
          >
            <Text style={[styles.pickerText, weather === w && styles.pickerTextActive]}>{w}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : '#666' }]}>ENGAGEMENT RANGE</Text>
      <View style={styles.pickerRow}>
        {(['Close', 'Long'] as Range[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.pickerButton,
              range === r && styles.pickerButtonActive,
              { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }
            ]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.pickerText, range === r && styles.pickerTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.runButton} onPress={handleRunSimulation}>
        <Text style={styles.runButtonText}>INITIATE SIMULATION</Text>
        <Ionicons name="flash" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderReport = () => {
    if (!result) return null;

    return (
      <ScrollView contentContainerStyle={styles.reportContent}>
        <View style={styles.winnerHeader}>
          <View style={styles.advantageBadge}>
            <Text style={styles.advantageText}>TACTICAL ADVANTAGE</Text>
          </View>
          <Text style={[styles.winnerName, { color: theme.colors.primary }]}>{result.winner.name}</Text>
        </View>

        <View style={styles.probabilityContainer}>
          <View style={styles.probRow}>
            <Text style={[styles.probLabel, { color: isDark ? '#FFF' : '#000' }]}>{assetA.name}</Text>
            <Text style={[styles.probValue, { color: theme.colors.primary }]}>
              {result.winner === assetA ? result.winnerProbability : result.loserProbability}%
            </Text>
          </View>
          <View style={styles.probBarContainer}>
            <View 
              style={[
                styles.probBar, 
                { 
                  width: `${result.winner === assetA ? result.winnerProbability : result.loserProbability}%`,
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
          </View>
          <View style={styles.probRow}>
            <Text style={[styles.probLabel, { color: isDark ? '#FFF' : '#000' }]}>{assetB.name}</Text>
            <Text style={[styles.probValue, { color: result.winner === assetB ? theme.colors.primary : '#888' }]}>
              {result.winner === assetB ? result.winnerProbability : result.loserProbability}%
            </Text>
          </View>
        </View>

        <View style={[styles.outcomeCard, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <Text style={[styles.outcomeText, { color: isDark ? '#FFF' : '#000' }]}>
            {result.winner.name} is predicted to neutralize {result.loser.name} with {result.winnerProbability}% efficiency under {terrain}/{weather} conditions at {range} range.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : '#666', marginTop: 24 }]}>KEY FACTORS</Text>
        <View style={styles.factorsList}>
          {result.keyFactors.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <Ionicons name="caret-forward" size={16} color={theme.colors.primary} />
              <Text style={[styles.factorText, { color: isDark ? '#DDD' : '#444' }]}>{factor}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.runButton, { marginTop: 32, backgroundColor: isDark ? '#333' : '#CCC' }]} 
          onPress={() => setStep('selection')}
        >
          <Text style={[styles.runButtonText, { color: isDark ? '#FFF' : '#000' }]}>RE-CONFIGURE</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>
            {step === 'selection' ? 'BATTLE FORECAST' : 'BATTLE REPORT'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'selection' ? renderSelection() : renderReport()}
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  pickerButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(10, 132, 255, 0.1) !important',
  },
  pickerText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  pickerTextActive: {
    color: theme.colors.primary,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  runButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
  reportContent: {
    padding: 20,
  },
  winnerHeader: {
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
  },
  advantageBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  advantageText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  probabilityContainer: {
    marginBottom: 32,
  },
  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  probLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  probValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  probBarContainer: {
    height: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  probBar: {
    height: '100%',
    borderRadius: 4,
  },
  outcomeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  outcomeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  factorsList: {
    gap: 12,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
});
