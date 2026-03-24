import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
const { documentDirectory } = FileSystem as any;

/**
 * Database Manager for War-Assets-3D
 * Handles initialization, schema migrations, and provides a safe singleton instance.
 */

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isDbReady = false;

const DB_NAME = 'war-assets-v28.db';

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  // Return existing instance if available
  if (dbInstance) {
    try {
      await dbInstance.getFirstAsync('PRAGMA user_version;');
      return dbInstance;
    } catch (e) {
      console.warn('[DB] Existing instance check failed, resetting handle...', e);
      try { await dbInstance.closeAsync(); } catch (err) { }
      dbInstance = null;
    }
  }

  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      // Ensure SQLite directory exists (preventing path-not-found errors on some devices)
      const dbDir = `${documentDirectory}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
        console.log('[DB] Created SQLite directory');
      }

      console.log(`[DB] Connecting to ${DB_NAME}...`);
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Verification
      await db.getFirstAsync('PRAGMA user_version;');

      try {
        await db.execAsync('PRAGMA foreign_keys = ON;');
        await db.execAsync('PRAGMA journal_mode = WAL;');
      } catch (e) {
        console.warn('[DB] PRAGMA config warning:', e);
      }

      try {
        await applyMigrations(db);
      } catch (migrationError: any) {
        console.error('MIGRATION RECOVERY: Initialization continued despite migration error:', migrationError);
        // We catch here to prevent bricking the app startup (Null Activity Fix)
      }

      dbInstance = db;
      isDbReady = true;
      return db;
    } catch (error: any) {
      console.error('CRITICAL DB CONNECTION FAILURE:', error);
      dbInstance = null;
      initializationPromise = null;
      throw new Error(`DB_INIT_FAILED: ${error.message || 'Unknown error'}`);
    }
  })();

  return initializationPromise;
}

/**
 * Safe query execution wrapper with automatic retry on native failures (NPE)
 */
export async function runQuery<T>(queryFn: (db: SQLite.SQLiteDatabase) => Promise<T>, retries = 1): Promise<T> {
  try {
    const db = await initDB();
    if (!db) throw new Error('Database handle is null');
    return await queryFn(db);
  } catch (e: any) {
    console.error(`[DB] Query failed (Attempt ${2 - retries}/2):`, e);

    // If it's a native error (like NPE), wipe the cached instance and retry once
    if (e.message?.includes('NullPointerException') || e.message?.includes('Database is closed') || retries > 0) {
      console.warn('[DB] Troubleshooting native failure, clearing instance and retrying...');
      if (dbInstance) {
        try { await dbInstance.closeAsync(); } catch (err) { }
      }
      dbInstance = null;
      initializationPromise = null;
      isDbReady = false;

      if (retries > 0) {
        return runQuery(queryFn, retries - 1);
      }
    }
    throw e;
  }
}

async function applyMigrations(db: SQLite.SQLiteDatabase) {
  const versionResult: any = await db.getFirstAsync('PRAGMA user_version;');
  const currentVersion = versionResult?.user_version || 0;
  console.log(`[DB] Engine. Version: ${currentVersion}`);

  // v20 PROTOCOL: Multi-image support
  if (currentVersion < 20) {
    if (currentVersion === 19) {
      console.log('[DB] v20 Migration: Adding images support...');
      try {
        await db.execAsync("ALTER TABLE assets ADD COLUMN images TEXT;");
        await db.execAsync('PRAGMA user_version = 20;');
        console.log('[DB] Migration v20 complete. Proceeding to re-seed data...');
        // We continue to re-seed to populate the new images column
      } catch (e: any) {
        console.warn('Migration failed, falling back to full re-seed', e);
      }
    }

    console.log('[DB] v20 RE-SEED: Nuking for data integrity...');

    await db.execAsync('PRAGMA foreign_keys = OFF;');

    try {
      await db.withExclusiveTransactionAsync(async () => {
        const tables = ['assets', 'categories', 'asset_3d_models', 'comparison_queue', 'onboarding_content', 'favorites', 'app_state', 'offline_status'];
        for (const t of tables) await db.execAsync(`DROP TABLE IF EXISTS ${t};`);

        await db.execAsync('CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL);');

        await db.execAsync(`
          CREATE TABLE assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            catId TEXT NOT NULL,
            img TEXT,
            model TEXT,
            dangerLevel INTEGER,
            threatType TEXT,
            featured BOOLEAN DEFAULT 0,
            specs TEXT,
            translations TEXT,
            wikiUrl TEXT,
            images TEXT,
            country TEXT,
            countryCode TEXT,
            FOREIGN KEY (catId) REFERENCES categories(id) ON DELETE CASCADE
          );
        `);

        await db.execAsync(`
          CREATE TABLE favorites (
            id TEXT PRIMARY KEY,
            assetId TEXT NOT NULL,
            FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
          );
        `);

        await db.execAsync(`
          CREATE TABLE onboarding_content (
            id TEXT PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            description TEXT,
            image TEXT,
            orderIndex INTEGER
          );
        `);

        await db.execAsync(`
          CREATE TABLE asset_3d_models (
            assetId TEXT PRIMARY KEY,
            localPath TEXT NOT NULL,
            lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
          );
        `);

        await db.execAsync(`
          CREATE TABLE comparison_queue (
            assetId TEXT PRIMARY KEY,
            FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
          );
        `);

        await db.execAsync(`
          CREATE TABLE app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            firstLaunch BOOLEAN NOT NULL DEFAULT 1,
            theme TEXT NOT NULL DEFAULT 'light',
            language TEXT NOT NULL DEFAULT 'en',
            arEnabled BOOLEAN NOT NULL DEFAULT 0,
            onboardingProgress INTEGER NOT NULL DEFAULT 0,
            supportsAR BOOLEAN NOT NULL DEFAULT 0
          );
        `);
        await db.execAsync('INSERT INTO app_state (id) VALUES (1);');

        await db.execAsync(`
          CREATE TABLE offline_status (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            is_offline_ready BOOLEAN NOT NULL DEFAULT 0,
            db_size_bytes INTEGER NOT NULL DEFAULT 0,
            last_sync DATETIME
          );
        `);
        await db.execAsync('INSERT INTO offline_status (id) VALUES (1);');

        // Seeding
        const cats = [
          { id: '1', name: 'Tanks' }, { id: '2', name: 'Aircraft' },
          { id: '3', name: 'Air Defense' }, { id: '4', name: 'Drones/Missiles' },
          { id: '5', name: 'Navy' }
        ];
        console.log(`[DB] Seeding ${cats.length} categories...`);
        const catStmt = await db.prepareAsync('INSERT OR REPLACE INTO categories (id, name) VALUES (?, ?)');
        try {
          for (const c of cats) {
            await catStmt.executeAsync([c.id, c.name]);
          }
        } catch (e: any) {
          console.error('[DB] Category seeding failed:', e);
        } finally {
          await catStmt.finalizeAsync();
        }

        const MILITARY_ASSETS = require('../assets/data/military-assets-v28-optimized.json');
        console.log(`[DB] Seeding ${MILITARY_ASSETS.length} assets...`);

        const assetStmt = await db.prepareAsync(
          `INSERT OR REPLACE INTO assets (id, name, catId, img, model, dangerLevel, threatType, featured, specs, translations, wikiUrl, images, country, countryCode) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        try {
          for (let i = 0; i < MILITARY_ASSETS.length; i++) {
            const a = MILITARY_ASSETS[i];

            // Full Integrity Guard: Skip if missing name OR catId (Paranoid Validation)
            if (!a || !a.name || !a.catId) {
              console.error(`[DB] CRITICAL: Skipping malformed asset at index ${i} (Data: ${JSON.stringify(a)?.slice(0, 100)}...)`);
              continue;
            }

            // Schema Enforcement: Ensure id, name, catId, dangerLevel are valid
            const assetId = a.id || `gen-${i}`;
            const dLevel = typeof a.dangerLevel === 'number' ? a.dangerLevel : 0;
            const isFeaturedAsset = a.featured ? 1 : 0;

            await assetStmt.executeAsync([
              assetId,
              String(a.name),
              String(a.catId),
              a.img || null,
              a.model || null,
              dLevel,
              a.threatType || '',
              isFeaturedAsset,
              a.specs ? JSON.stringify(a.specs) : null,
              a.translations ? JSON.stringify(a.translations) : null,
              a.wikiUrl || null,
              a.images ? JSON.stringify(a.images) : null,
              a.country || null,
              a.countryCode || null
            ]);
          }
          console.log('[DB] Asset seeding loop complete.');
        } catch (e: any) {
          console.error('[DB] Asset seeding failed:', e);
          throw e; // Bubble up for transaction rollback
        } finally {
          await assetStmt.finalizeAsync();
        }

        const ONBOARDING_DATA = require('../assets/onboarding.json');
        console.log(`[DB] Seeding ${ONBOARDING_DATA.length} onboarding slides...`);
        const onboardingStmt = await db.prepareAsync(
          `INSERT OR REPLACE INTO onboarding_content (id, title, subtitle, image, orderIndex) 
           VALUES (?, ?, ?, ?, ?)`
        );

        try {
          for (const slide of ONBOARDING_DATA) {
            await onboardingStmt.executeAsync([slide.id, slide.title, slide.subtitle, slide.image, slide.orderIndex]);
          }
        } catch (e: any) {
          console.error('[DB] Onboarding seeding failed:', e);
        } finally {
          await onboardingStmt.finalizeAsync();
        }

        await db.execAsync('PRAGMA user_version = 20;');
        console.log('[DB] Migration and Seeding v20 complete.');
      });
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  // v23 PROTOCOL: Junk Purge & URL Standardization
  if (currentVersion < 23) {
    console.log('[DB] v23 Migration: Purging junk & standardizing 3D links...');
    try {
      await db.withExclusiveTransactionAsync(async () => {
        // Hard Purge: Remove non-military or legacy placeholder records
        await db.execAsync(`
          DELETE FROM assets 
          WHERE name LIKE '%Harley%' 
          OR name LIKE '%Classified%'   
          OR name LIKE '%Placeholder%'
          OR catId IS NULL;
        `);

        // URL Standardization: Ensure all image/model paths follow the secure R2 pattern
        const R2_BASE = 'https://pub-2c4d302f7a9147f2b8723c7d066dc44f.r2.dev';

        // We can't easily iterate and update with direct SQL if we need logic, 
        // but we can use REPLACE if they already have parts of it.
        // Actually, the requirement says "Ensure all follow... structure".
        // Let's force update the paths if they don't start with the R2_BASE

        await db.execAsync(`
          UPDATE assets 
          SET img = '${R2_BASE}/images/' || id || '.jpg'
          WHERE img IS NOT NULL AND img NOT LIKE 'http%';
        `);

        await db.execAsync(`
          UPDATE assets 
          SET model = '${R2_BASE}/models/' || id || '.glb'
          WHERE model IS NOT NULL AND model NOT LIKE 'http%';
        `);

        await db.execAsync('PRAGMA user_version = 23;');
        console.log('[DB] Migration v23 complete.');
      });
    } catch (e) {
      console.error('[DB] Migration v23 FAILED:', e);
    }
  }

  // v24 PROTOCOL: Domain-Agnostic Sanitization (Migration to Worker Proxy)
  if (currentVersion < 24) {
    console.log('[DB] v24 Migration: Sanitizing asset paths for domain-agnostic logic...');
    try {
      await db.withExclusiveTransactionAsync(async () => {
        // Scrubbing logic: Remove domain prefixes and leave only relative paths
        // This allows cdnConfig.ts to dynamically append the Proxy or Local domain.

        await db.execAsync(`
          UPDATE assets 
          SET img = REPLACE(REPLACE(REPLACE(img, 'https://pub-2c4d302f7a9147f2b8723c7d066dc44f.r2.dev/images/', ''), 'http://localhost:3000/public/images/', ''), 'images/', '')
          WHERE img IS NOT NULL;
        `);

        await db.execAsync(`
          UPDATE assets 
          SET model = REPLACE(REPLACE(REPLACE(model, 'https://pub-2c4d302f7a9147f2b8723c7d066dc44f.r2.dev/models/', ''), 'http://localhost:3000/public/models/', ''), 'models/', '')
          WHERE model IS NOT NULL;
        `);

        // Handle images[] JSON array if technically possible via SQL, or just clear and let re-seed fix it?
        // Re-seeding is usually safer for complex JSON transformations
        // But let's try a simple replace for common domains
        await db.execAsync(`
          UPDATE assets 
          SET images = REPLACE(images, 'https://pub-2c4d302f7a9147f2b8723c7d066dc44f.r2.dev/images/', '')
          WHERE images IS NOT NULL;
        `);

        await db.execAsync('PRAGMA user_version = 24;');
        console.log('[DB] Migration v24 complete.');
      });
    } catch (e) {
      console.error('[DB] Migration v24 FAILED:', e);
    }
  }

  // v25 PROTOCOL: Geospatial Intelligence (Country Mapping)
  if (currentVersion < 25) {
    console.log('[DB] v25 Migration: Adding country mapping columns...');
    try {
      await db.withExclusiveTransactionAsync(async () => {
        // 1. ADD COLUMNS
        try {
          await db.execAsync("ALTER TABLE assets ADD COLUMN country TEXT;");
        } catch (e) { } // Ignore if already exists
        try {
          await db.execAsync("ALTER TABLE assets ADD COLUMN countryCode TEXT;");
        } catch (e) { } // Ignore if already exists

        // 2. FORCE RE-SEED TO INJECT NEW DATA FROM JSON
        const MILITARY_ASSETS = require('../assets/data/military-assets-v27.json');
        const updateStmt = await db.prepareAsync('UPDATE assets SET country = ?, countryCode = ? WHERE id = ?');

        try {
          for (let i = 0; i < MILITARY_ASSETS.length; i++) {
            const a = MILITARY_ASSETS[i];
            // Integrity Guard for Update
            if (!a || !a.name || !a.catId) {
              console.error(`[DB] CRITICAL: Skipping malformed update at index ${i}`);
              continue;
            }
            await updateStmt.executeAsync([a.country || null, a.countryCode || null, a.id]);
          }
        } catch (e: any) {
          console.error('[DB] Migration v25 re-seed failed:', e);
        } finally {
          await updateStmt.finalizeAsync();
        }

        await db.execAsync('PRAGMA user_version = 25;');
        console.log('[DB] Migration v25 complete.');
      });
    } catch (e) {
      console.error('[DB] Migration v25 FAILED:', e);
    }
  }
}

/**
 * Exported helper for common database operations
 */
export const dbHelper = {
  isReady: () => isDbReady,
  getAppState: () => runQuery(db => db.getFirstAsync('SELECT * FROM app_state WHERE id = 1')),
  updateTheme: (theme: string) => {
    if (!isDbReady) {
      console.log('[DB] Database not ready, skipping theme persistence.');
      return Promise.resolve();
    }
    return runQuery(db => db.runAsync('UPDATE app_state SET theme = ? WHERE id = 1', [theme]));
  },

  // Reset Function for debugging
  resetDatabase: async () => {
    try {
      if (dbInstance) {
        await dbInstance.closeAsync();
        dbInstance = null;
        initializationPromise = null;
        isDbReady = false;
      }
      const dbPath = `${documentDirectory}SQLite/${DB_NAME}`;
      const info = await FileSystem.getInfoAsync(dbPath);
      if (info.exists) {
        await FileSystem.deleteAsync(dbPath);
        console.log('[DB] Database file deleted successfully.');
      }
      // Re-initialize
      await initDB();
    } catch (e) {
      console.error('[DB] Failed to reset database:', e);
    }
  },

  // Model Caching
  getCachedModel: (assetId: string) => runQuery(db => db.getFirstAsync('SELECT localPath FROM asset_3d_models WHERE assetId = ?', [assetId])),
  saveModelCache: (assetId: string, path: string) => runQuery(db => db.runAsync(
    'INSERT OR REPLACE INTO asset_3d_models (assetId, localPath, lastUpdated) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [assetId, path]
  )),

  // Comparison Queue
  getComparisonQueue: () => runQuery(db => db.getAllAsync('SELECT assetId FROM comparison_queue')),
  addToComparison: (assetId: string) => runQuery(db => db.runAsync('INSERT OR IGNORE INTO comparison_queue (assetId) VALUES (?)', [assetId])),
  removeFromComparison: (assetId: string) => runQuery(db => db.runAsync('DELETE FROM comparison_queue WHERE assetId = ?', [assetId])),
  clearComparison: () => runQuery(db => db.runAsync('DELETE FROM comparison_queue')),

  // Favorites (Tactical Collection)
  getFavorites: () => runQuery(db => db.getAllAsync('SELECT assetId FROM favorites')),
  addToFavorites: (assetId: string) => runQuery(db => db.runAsync('INSERT OR IGNORE INTO favorites (id, assetId) VALUES (?, ?)', [assetId, assetId])),
  removeFromFavorites: (assetId: string) => runQuery(db => db.runAsync('DELETE FROM favorites WHERE assetId = ?', [assetId])),
};
