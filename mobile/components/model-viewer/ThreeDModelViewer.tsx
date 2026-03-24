import React, { Suspense, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { AssetCDNService } from '../../services/AssetCDNService';
import { dbHelper } from '../../scripts/init-db';
import { CDN_CONFIG } from '../../config/cdnConfig';

interface ModelProps {
  url: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const Model: React.FC<ModelProps> = ({ url, onLoad, onError }) => {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      onLoad?.();
    }
  }, [scene, onLoad]);

  // Manual rotation removed in favor of OrbitControls autoRotate for damping support
  // useFrame(() => {
  //   if (modelRef.current) {
  //     modelRef.current.rotation.y += 0.005;
  //   }
  // });

  useEffect(() => {
    return () => {
      if (scene) {
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
      }
    };
  }, [scene]);

  return <primitive ref={modelRef} object={scene} />;
};

const FallbackBox: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#4A4A4A"
        wireframe
        emissive="#00FF00"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

interface Props {
  assetId: string;
  modelUrl: string;
  assetVersion?: string;
  expectedChecksum?: string;
  isMini?: boolean;
}

export const ThreeDModelViewer: React.FC<Props> = ({
  assetId,
  modelUrl,
  assetVersion,
  expectedChecksum,
  isMini = false
}) => {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleModelCaching = async () => {
      try {
        await AssetCDNService.init();

        const absoluteModelUrl = CDN_CONFIG.resolveModel(modelUrl);
        if (!absoluteModelUrl) {
          setError(true);
          setLoading(false);
          return;
        }

        const version = assetVersion || '1.0.0';

        const uri = await AssetCDNService.getModelUri({
          id: assetId,
          version,
          cdnUrl: absoluteModelUrl,
          expectedChecksum,
        });

        await dbHelper.saveModelCache(assetId, uri);

        if (isMounted) {
          setLocalUrl(uri);
          setLoading(false);
          setError(false);
        }
      } catch (err: any) {
        console.error('Model caching error:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    handleModelCaching();

    return () => {
      isMounted = false;
    };
  }, [assetId, modelUrl, assetVersion, expectedChecksum]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Suppress non-critical EXGL warnings
    LogBox.ignoreLogs([
      'gl.pixelStorei: commands out of sequence',
      'THREE.WebGLRenderer: Context Lost',
    ]);
  }, []);

  const handleModelLoad = () => {
    if (!isMini) {
      setShowGuide(true);
      setTimeout(() => setShowGuide(false), 2000);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.skeletonContainer}>
          <ActivityIndicator size={isMini ? "small" : "large"} color={theme.colors.primary} />
          <View style={styles.pulseContainer}>
            {!isMini && <Text style={styles.loadingTextPrimary}>ESTABLISHING NEURAL LINK</Text>}
            {!isMini && <Text style={styles.loadingTextSecondary}>Streaming tactical geometry from R2 Node...</Text>}
          </View>
        </View>
      </View>
    );
  }

  // Handle Missing or Error states with the professional "Unavailable" UI
  if (modelUrl === null || error || !localUrl) {
    if (isMini) return null; // Don't show complex error UI in mini cards

    return (
      <View style={styles.noModelContainer}>
        <Ionicons name="shield-outline" size={64} color={theme.colors.primary} style={styles.tacticalIcon} />
        <Text style={styles.noModelTitle}>TACTICAL INTEL UNAVAILABLE</Text>
        <Text style={styles.noModelDesc}>
          3D visualization for {assetId} is currently restricted or geometry stream failed.
          Check satellite link or R2 storage status.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(false); setLoading(true); }}>
          <Text style={styles.retryBtnText}>RE-ATTEMPT SYNC</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: isMini ? 'transparent' : '#000' }]}
      pointerEvents={isMini ? 'none' : 'auto'}
    >
      <Canvas
        camera={{ position: [5, 5, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        
        <Suspense fallback={null}>
          <Stage 
            environment="city" 
            intensity={isMini ? 0.2 : 0.5} 
            adjustCamera={true}
          >
            <Model 
              url={localUrl!} 
              onLoad={handleModelLoad} 
            />
          </Stage>
        </Suspense>

        {!isMini && (
          <OrbitControls
            makeDefault
            minDistance={1}
            maxDistance={10}
            autoRotate={true}
            autoRotateSpeed={1.5}
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={0.5}
          />
        )}
      </Canvas>

      {showGuide && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.guideOverlay}
        >
          <Ionicons name="finger-print-outline" size={40} color={theme.colors.primary} />
          <Text style={styles.guideText}>SWIPE TO ROTATE • PINCH TO ZOOM</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#FFF',
    marginTop: 20,
    fontSize: 16,
    opacity: 0.7,
  },
  fallbackLabel: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,165,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  fallbackText: {
    color: '#FFA500',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  noModelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tacticalIcon: {
    fontSize: 40,
    color: theme.colors.primary,
    marginBottom: 15,
    opacity: 0.8,
  },
  noModelTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  noModelDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingTextPrimary: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  loadingTextSecondary: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  retryBtn: {
    marginTop: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 157, 0.05)',
  },
  retryBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  guideOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -40 }],
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.2)',
  },
  guideText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 1,
    textAlign: 'center',
  }
});
