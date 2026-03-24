import { Asset, AssetMetrics } from '../store/slices/assetSlice';

export type Terrain = 'Plains' | 'Mountain' | 'Mud';
export type Weather = 'Clear' | 'Fog' | 'Rain';
export type Range = 'Close' | 'Long';

export interface BattleEnvironment {
  terrain: Terrain;
  weather: Weather;
  range: Range;
}

export interface SimulationResult {
  winner: Asset;
  loser: Asset;
  winnerProbability: number;
  loserProbability: number;
  keyFactors: string[];
  modifiedMetricsA: AssetMetrics;
  modifiedMetricsB: AssetMetrics;
}

export const calculateCP = (metrics: AssetMetrics): number => {
  return (
    metrics.firepower * 0.4 +
    metrics.durability * 0.3 +
    metrics.mobility * 0.2 +
    metrics.stealth * 0.1
  );
};

export const applyModifiers = (
  metrics: AssetMetrics,
  env: BattleEnvironment
): AssetMetrics => {
  const modified = { ...metrics };

  // Terrain (Mountain/Mud): Decreases mobility by 30%
  if (env.terrain === 'Mountain' || env.terrain === 'Mud') {
    modified.mobility *= 0.7;
  }

  // Weather (Fog/Rain): Decreases stealth and firepower (targeting) by 20%
  if (env.weather === 'Fog' || env.weather === 'Rain') {
    modified.stealth *= 0.8;
    modified.firepower *= 0.8;
  }

  // Range (Long): If firepower > 80, asset gets a 15% bonus (sniper advantage)
  if (env.range === 'Long' && metrics.firepower > 80) {
    modified.firepower *= 1.15;
  }

  return modified;
};

export const simulateBattle = (
  assetA: Asset,
  assetB: Asset,
  env: BattleEnvironment
): SimulationResult => {
  const metricsA = assetA.metrics || { firepower: 50, durability: 50, mobility: 50, stealth: 50 };
  const metricsB = assetB.metrics || { firepower: 50, durability: 50, mobility: 50, stealth: 50 };

  const modifiedA = applyModifiers(metricsA, env);
  const modifiedB = applyModifiers(metricsB, env);

  const cpA = calculateCP(modifiedA);
  const cpB = calculateCP(modifiedB);

  const totalCP = cpA + cpB;
  const probA = Math.round((cpA / totalCP) * 100);
  const probB = 100 - probA;

  const winner = cpA >= cpB ? assetA : assetB;
  const loser = cpA >= cpB ? assetB : assetA;
  const winnerProb = cpA >= cpB ? probA : probB;
  const loserProb = cpA >= cpB ? probB : probA;

  const winnerMetrics = cpA >= cpB ? modifiedA : modifiedB;
  const loserMetrics = cpA >= cpB ? modifiedB : modifiedA;

  // Key Factors: Find the highest modified metric for the winner
  const keyFactors: string[] = [];
  const metricsMap = [
    { name: 'Firepower', value: winnerMetrics.firepower },
    { name: 'Durability', value: winnerMetrics.durability },
    { name: 'Mobility', value: winnerMetrics.mobility },
    { name: 'Stealth', value: winnerMetrics.stealth },
  ];

  metricsMap.sort((a, b) => b.value - a.value);
  const topMetric = metricsMap[0];

  if (topMetric.name === 'Stealth' && (env.weather === 'Fog' || env.weather === 'Rain')) {
    keyFactors.push(`Superior Stealth in ${env.weather}`);
  } else if (topMetric.name === 'Firepower' && env.range === 'Long' && winner.metrics!.firepower > 80) {
    keyFactors.push('Sniper Advantage at Long Range');
  } else {
    keyFactors.push(`Dominant ${topMetric.name} Performance`);
  }

  if (winnerMetrics.durability > loserMetrics.firepower * 1.2) {
    keyFactors.push('Unbreakable Defensive Line');
  }

  return {
    winner,
    loser,
    winnerProbability: winnerProb,
    loserProbability: loserProb,
    keyFactors,
    modifiedMetricsA: modifiedA,
    modifiedMetricsB: modifiedB,
  };
};
