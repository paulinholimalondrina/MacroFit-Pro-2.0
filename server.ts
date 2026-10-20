import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import pg from 'pg';
import { createServer as createViteServer } from 'vite';
import { BARCODE_CATALOG_BR, BASE_TACO_EXPANDIDA, type FoodItem } from './src/data/tacoDatabase.ts';
import {
  filterFoodsByQuery,
  normalizeBarcode,
  parseFatSecretDescription,
  parseOpenFoodFactsProduct,
  removerAcentos,
  type DiaryEntry,
  type MetabolicGoals,
} from './src/utils/nutrition.ts';

const { Pool } = pg;

const PORT = 3000;

// Neon PostgreSQL connection string from the user's shared Gemini session (with env override)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_TZ8J1HvGzWSd@ep-crimson-base-b5sz5ns2.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

const CHAVE_MESTRA_RECUPERACAO = process.env.MACROFIT_RESET_KEY || 'macrofit2026';

// FatSecret API credentials from the user's shared Gemini session (with env override)
const FATSECRET_CLIENT_ID =
  process.env.FATSECRET_CLIENT_ID || 'fe6063cade4b4ca3ba6487f3d521c556';
const FATSECRET_CLIENT_SECRET =
  process.env.FATSECRET_CLIENT_SECRET || 'a4833d40ca15452392896fb1efa1bc64';

let pgPool: pg.Pool | null = null;
let pgAvailable = false;

// Local JSON persistent fallback store if PostgreSQL is unreachable
interface LocalStoreData {
  users: Record<
    string,
    {
      id: number;
      username: string;
      senhaHash: string;
      token: string;
      metas: MetabolicGoals;
      agua: Record<string, number>;
      diario: Record<string, Record<string, DiaryEntry[]>>;
    }
  >;
  customFoods: FoodItem[];
}

const LOCAL_STORE_PATH = path.resolve(process.cwd(), '.macrofit_store.json');

function loadLocalStore(): LocalStoreData {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
      return JSON.parse(raw) as LocalStoreData;
    }
  } catch (err) {
    console.warn('Could not load local store, initializing new store:', err);
  }
  return { users: {}, customFoods: [] };
}

function saveLocalStore(store: LocalStoreData): void {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save local store:', err);
  }
}

const localStore = loadLocalStore();

function hashSenha(senha: string): string {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

async function initDatabase(): Promise<void> {
  if (!DATABASE_URL || DATABASE_URL.includes('COLE_AQUI')) {
    console.log('No external DATABASE_URL configured, using local store.');
    return;
  }

  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });

    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          senha_hash TEXT NOT NULL,
          token TEXT UNIQUE,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS metas_usuario (
          user_id INT PRIMARY KEY REFERENCES usuarios(id),
          kcal INT DEFAULT 2200,
          prot REAL DEFAULT 160.0,
          carb REAL DEFAULT 250.0,
          fat REAL DEFAULT 60.0,
          agua INT DEFAULT 2500,
          genero VARCHAR(10) DEFAULT 'm',
          idade REAL DEFAULT 30.0,
          peso REAL DEFAULT 75.0,
          altura REAL DEFAULT 175.0,
          atividade REAL DEFAULT 1.55,
          objetivo REAL DEFAULT 0.0
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS consumo_agua (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES usuarios(id),
          data VARCHAR(15) NOT NULL,
          quantidade REAL DEFAULT 0,
          UNIQUE(user_id, data)
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS diario_refeicoes (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES usuarios(id),
          data VARCHAR(15) NOT NULL,
          categoria VARCHAR(100) NOT NULL,
          nome TEXT NOT NULL,
          marca TEXT,
          quantidade REAL NOT NULL,
          unidade_desc TEXT,
          calorias REAL NOT NULL,
          proteinas REAL NOT NULL,
          carboidratos REAL NOT NULL,
          gorduras REAL NOT NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS alimentos (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          marca TEXT,
          calorias REAL DEFAULT 0,
          proteinas REAL DEFAULT 0,
          carboidratos REAL DEFAULT 0,
          gorduras REAL DEFAULT 0,
          fonte VARCHAR(50) DEFAULT 'TACO'
        );
      `);

      pgAvailable = true;
      console.log('Connected to Neon PostgreSQL database successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('Neon PostgreSQL connection unavailable, using local fallback store:', (err as Error).message);
    pgAvailable = false;
  }
}

// FatSecret OAuth2 Token Cache
const fatSecretTokenCache: { accessToken: string | null; expiresAt: number } = {
  accessToken: null,
  expiresAt: 0,
};

async function obterTokenFatSecret(): Promise<string | null> {
  const now = Date.now() / 1000;
  if (fatSecretTokenCache.accessToken && fatSecretTokenCache.expiresAt > now) {
    return fatSecretTokenCache.accessToken;
  }

  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) {
    return null;
  }

  try {
    const credentials = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');
    const resp = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=basic',
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { access_token?: string; expires_in?: number };
      if (data.access_token) {
        fatSecretTokenCache.accessToken = data.access_token;
        fatSecretTokenCache.expiresAt = now + (data.expires_in || 86400) - 60;
        return fatSecretTokenCache.accessToken;
      }
    }
  } catch (err) {
    console.warn('FatSecret OAuth token warning:', (err as Error).message);
  }
  return null;
}

async function searchFatSecretAPI(query: string): Promise<FoodItem[]> {
  const token = await obterTokenFatSecret();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      search_expression: query,
      format: 'json',
      max_results: '25',
      region: 'BR',
      language: 'pt',
    });

    const resp = await fetch(`https://platform.fatsecret.com/rest/foods/search/v1?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      foods?: { food?: Array<{ food_name?: string; brand_name?: string; food_description?: string }> | { food_name?: string; brand_name?: string; food_description?: string } };
    };

    let rawFoods = json?.foods?.food || [];
    if (!Array.isArray(rawFoods)) {
      rawFoods = [rawFoods];
    }

    const parsedItems: FoodItem[] = [];
    for (const f of rawFoods) {
      const nome = (f.food_name || '').trim();
      if (!nome) continue;
      const marca = (f.brand_name || 'Genérico').trim();
      const macros = parseFatSecretDescription(f.food_description || '');
      if (macros.calorias > 0 || macros.proteinas > 0 || macros.carboidratos > 0) {
        parsedItems.push({
          nome,
          marca,
          calorias: macros.calorias,
          proteinas: macros.proteinas,
          carboidratos: macros.carboidratos,
          gorduras: macros.gorduras,
          fonte: 'FATSECRET',
        });
      }
    }
    return parsedItems;
  } catch (err) {
    console.warn('FatSecret search warning:', (err as Error).message);
    return [];
  }
}

async function searchOpenFoodFactsAPI(query: string): Promise<FoodItem[]> {
  try {
    const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'MacroFitPro/2.0 (Android PWA; suporte@macrofit.app)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      products?: Array<{
        product_name?: string;
        brands?: string;
        nutriments?: Record<string, number | string>;
      }>;
    };

    const items: FoodItem[] = [];
    for (const p of data.products || []) {
      const nome = (p.product_name || '').trim();
      if (!nome) continue;
      const marca = (p.brands || 'OpenFoodFacts').trim();
      const n = p.nutriments || {};
      const calorias = Math.round(Number(n['energy-kcal_100g'] || n['energy-kcal'] || 0) * 10) / 10;
      const proteinas = Math.round(Number(n.proteins_100g || 0) * 10) / 10;
      const carboidratos = Math.round(Number(n.carbohydrates_100g || 0) * 10) / 10;
      const gorduras = Math.round(Number(n.fat_100g || 0) * 10) / 10;

      if (calorias > 0 || proteinas > 0 || carboidratos > 0) {
        items.push({
          nome,
          marca,
          calorias,
          proteinas,
          carboidratos,
          gorduras,
          fonte: 'OPEN_FOOD_FACTS',
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function resolveUserByToken(token: string | undefined): Promise<{ id: number; username: string } | null> {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;

  if (pgAvailable && pgPool) {
    try {
      const res = await pgPool.query('SELECT id, username FROM usuarios WHERE token = $1', [cleanToken]);
      if (res.rows.length > 0) {
        return { id: Number(res.rows[0].id), username: String(res.rows[0].username) };
      }
    } catch (err) {
      console.warn('PG token lookup failed, checking local store:', (err as Error).message);
    }
  }

  for (const u of Object.values(localStore.users)) {
    if (u.token === cleanToken) {
      return { id: u.id, username: u.username };
    }
  }
  return null;
}

async function startServer() {
  await initDatabase();

  const app = express();
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(express.json());

  // Direct APK download route with proper Android MIME type
  app.get('/api/download-apk', (_req, res) => {
    const apkPath = path.resolve(process.cwd(), 'public', 'MacroFit-Pro.apk');
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="MacroFit-Pro.apk"');
      res.sendFile(apkPath);
      return;
    }
    res.status(404).json({ detail: 'APK file not found.' });
  });

  // Health & Status endpoint (matches both /api/status and root JSON check)
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'ok',
      mensagem: 'MacroFit API Híbrida (TACO + FatSecret + Neon PostgreSQL) Ativa',
      database: pgAvailable ? 'neon_postgresql' : 'local_persistent',
      fatsecretConfigured: Boolean(FATSECRET_CLIENT_ID && FATSECRET_CLIENT_SECRET),
      tacoItemsCount: BASE_TACO_EXPANDIDA.length + localStore.customFoods.length,
    });
  });

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (username.length < 3 || password.length < 4) {
      res.status(400).json({ detail: 'Usuário deve ter mín. 3 letras e senha mín. 4 caracteres.' });
      return;
    }

    const senhaHash = hashSenha(password);
    const token = crypto.createHash('sha256').update(`${username}_${Date.now()}`).digest('hex');

    if (pgAvailable && pgPool) {
      try {
        const existing = await pgPool.query('SELECT id FROM usuarios WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
          res.status(400).json({ detail: 'Este nome de usuário já existe.' });
          return;
        }
        const insertUser = await pgPool.query(
          'INSERT INTO usuarios (username, senha_hash, token) VALUES ($1, $2, $3) RETURNING id',
          [username, senhaHash, token]
        );
        const userId = insertUser.rows[0].id;
        await pgPool.query('INSERT INTO metas_usuario (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
        res.json({ status: 'ok', token, username, source: 'neon_postgresql' });
        return;
      } catch (err) {
        console.warn('PG register error, falling back to local store:', (err as Error).message);
      }
    }

    if (localStore.users[username]) {
      res.status(400).json({ detail: 'Este nome de usuário já existe.' });
      return;
    }

    const newId = Object.keys(localStore.users).length + 1;
    localStore.users[username] = {
      id: newId,
      username,
      senhaHash,
      token,
      metas: {
        kcal: 2200,
        prot: 160,
        carb: 250,
        fat: 60,
        agua: 2500,
        tmb: 1699,
        get: 2633,
        genero: 'm',
        idade: 30,
        peso: 75,
        altura: 175,
        atividade: 1.55,
        objetivo: 0,
      },
      agua: {},
      diario: {},
    };
    saveLocalStore(localStore);
    res.json({ status: 'ok', token, username, source: 'local_persistent' });
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const senhaHash = hashSenha(password);
    const token = crypto.createHash('sha256').update(`${username}_${Date.now()}`).digest('hex');

    if (pgAvailable && pgPool) {
      try {
        const result = await pgPool.query(
          'SELECT id FROM usuarios WHERE username = $1 AND senha_hash = $2',
          [username, senhaHash]
        );
        if (result.rows.length > 0) {
          const userId = result.rows[0].id;
          await pgPool.query('UPDATE usuarios SET token = $1 WHERE id = $2', [token, userId]);
          res.json({ status: 'ok', token, username, source: 'neon_postgresql' });
          return;
        }
      } catch (err) {
        console.warn('PG login error, checking local store:', (err as Error).message);
      }
    }

    const localUser = localStore.users[username];
    if (!localUser || localUser.senhaHash !== senhaHash) {
      res.status(400).json({ detail: 'Usuário ou senha incorretos.' });
      return;
    }

    localUser.token = token;
    saveLocalStore(localStore);
    res.json({ status: 'ok', token, username, source: 'local_persistent' });
  });

  // Auth: Reset Password with Master Key
  app.post('/api/auth/reset-password', async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const chaveMestra = String(req.body?.chave_mestra || '').trim();
    const novaSenha = String(req.body?.nova_senha || '');

    if (chaveMestra !== CHAVE_MESTRA_RECUPERACAO) {
      res.status(403).json({ detail: 'Chave mestra de recuperação incorreta.' });
      return;
    }
    if (novaSenha.length < 4) {
      res.status(400).json({ detail: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    const novoHash = hashSenha(novaSenha);
    const token = crypto.createHash('sha256').update(`${username}_${Date.now()}`).digest('hex');

    if (pgAvailable && pgPool) {
      try {
        const result = await pgPool.query('SELECT id FROM usuarios WHERE username = $1', [username]);
        if (result.rows.length > 0) {
          await pgPool.query('UPDATE usuarios SET senha_hash = $1, token = $2 WHERE id = $3', [
            novoHash,
            token,
            result.rows[0].id,
          ]);
          res.json({ status: 'ok', token, username, mensagem: 'Senha redefinida com sucesso!' });
          return;
        }
      } catch (err) {
        console.warn('PG reset-password error:', (err as Error).message);
      }
    }

    const localUser = localStore.users[username];
    if (!localUser) {
      res.status(404).json({ detail: 'Usuário não encontrado.' });
      return;
    }

    localUser.senhaHash = novoHash;
    localUser.token = token;
    saveLocalStore(localStore);
    res.json({ status: 'ok', token, username, mensagem: 'Senha redefinida com sucesso!' });
  });

  // User Complete Data for Date
  app.get('/api/usuario/dados-completos', async (req, res) => {
    const dataStr = String(req.query.data || new Date().toISOString().split('T')[0]);
    const user = await resolveUserByToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ detail: 'Sessão inválida ou expirada.' });
      return;
    }

    if (pgAvailable && pgPool) {
      try {
        const metasRes = await pgPool.query(
          `SELECT kcal, prot, carb, fat, agua, genero, idade, peso, altura, atividade, objetivo
           FROM metas_usuario WHERE user_id = $1`,
          [user.id]
        );
        const metas = metasRes.rows[0] || {
          kcal: 2200,
          prot: 160,
          carb: 250,
          fat: 60,
          agua: 2500,
          genero: 'm',
          idade: 30,
          peso: 75,
          altura: 175,
          atividade: 1.55,
          objetivo: 0,
        };

        const aguaRes = await pgPool.query(
          'SELECT quantidade FROM consumo_agua WHERE user_id = $1 AND data = $2',
          [user.id, dataStr]
        );
        const agua = aguaRes.rows[0]?.quantidade ? Number(aguaRes.rows[0].quantidade) : 0;

        const diarioRes = await pgPool.query(
          `SELECT id, categoria, nome, marca, quantidade, unidade_desc, calorias, proteinas, carboidratos, gorduras
           FROM diario_refeicoes WHERE user_id = $1 AND data = $2 ORDER BY id ASC`,
          [user.id, dataStr]
        );

        const diario: Record<string, DiaryEntry[]> = {};
        for (const r of diarioRes.rows) {
          const cat = String(r.categoria);
          if (!diario[cat]) diario[cat] = [];
          diario[cat].push({
            id: r.id,
            categoria: cat,
            nome: r.nome,
            marca: r.marca || 'Genérico',
            quantidade: Number(r.quantidade),
            unidadeDesc: r.unidade_desc || 'g',
            calorias: Number(r.calorias),
            proteinas: Number(r.proteinas),
            carboidratos: Number(r.carboidratos),
            gorduras: Number(r.gorduras),
          });
        }

        res.json({ metas, agua, diario, source: 'neon_postgresql' });
        return;
      } catch (err) {
        console.warn('PG dados-completos error:', (err as Error).message);
      }
    }

    const u = localStore.users[user.username];
    if (!u) {
      res.status(404).json({ detail: 'Usuário não encontrado.' });
      return;
    }

    res.json({
      metas: u.metas,
      agua: u.agua[dataStr] || 0,
      diario: u.diario[dataStr] || {},
      source: 'local_persistent',
    });
  });

  // Save User Metabolic Goals
  app.post('/api/usuario/metas', async (req, res) => {
    const user = await resolveUserByToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ detail: 'Sessão inválida.' });
      return;
    }

    const m = req.body || {};
    const metas = {
      kcal: Number(m.kcal) || 2200,
      prot: Number(m.prot) || 160,
      carb: Number(m.carb) || 250,
      fat: Number(m.fat) || 60,
      agua: Number(m.agua) || 2500,
      genero: m.genero === 'f' ? 'f' : 'm',
      idade: Number(m.idade) || 30,
      peso: Number(m.peso) || 75,
      altura: Number(m.altura) || 175,
      atividade: Number(m.atividade) || 1.55,
      objetivo: Number(m.objetivo) || 0,
    };

    if (pgAvailable && pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO metas_usuario (user_id, kcal, prot, carb, fat, agua, genero, idade, peso, altura, atividade, objetivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT(user_id) DO UPDATE SET
             kcal=EXCLUDED.kcal, prot=EXCLUDED.prot, carb=EXCLUDED.carb, fat=EXCLUDED.fat,
             agua=EXCLUDED.agua, genero=EXCLUDED.genero, idade=EXCLUDED.idade, peso=EXCLUDED.peso,
             altura=EXCLUDED.altura, atividade=EXCLUDED.atividade, objetivo=EXCLUDED.objetivo`,
          [
            user.id,
            metas.kcal,
            metas.prot,
            metas.carb,
            metas.fat,
            metas.agua,
            metas.genero,
            metas.idade,
            metas.peso,
            metas.altura,
            metas.atividade,
            metas.objetivo,
          ]
        );
        res.json({ status: 'ok' });
        return;
      } catch (err) {
        console.warn('PG salvar metas error:', (err as Error).message);
      }
    }

    if (localStore.users[user.username]) {
      localStore.users[user.username].metas = {
        ...localStore.users[user.username].metas,
        ...metas,
      };
      saveLocalStore(localStore);
    }
    res.json({ status: 'ok' });
  });

  // Save Water Consumption
  app.post('/api/usuario/agua', async (req, res) => {
    const user = await resolveUserByToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ detail: 'Sessão inválida.' });
      return;
    }

    const dataStr = String(req.body?.data || new Date().toISOString().split('T')[0]);
    const quantidade = Math.max(0, Number(req.body?.quantidade) || 0);

    if (pgAvailable && pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO consumo_agua (user_id, data, quantidade)
           VALUES ($1, $2, $3)
           ON CONFLICT(user_id, data) DO UPDATE SET quantidade=EXCLUDED.quantidade`,
          [user.id, dataStr, quantidade]
        );
        res.json({ status: 'ok' });
        return;
      } catch (err) {
        console.warn('PG salvar agua error:', (err as Error).message);
      }
    }

    if (localStore.users[user.username]) {
      localStore.users[user.username].agua[dataStr] = quantidade;
      saveLocalStore(localStore);
    }
    res.json({ status: 'ok' });
  });

  // Add Meal Entry
  app.post('/api/usuario/refeicao', async (req, res) => {
    const user = await resolveUserByToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ detail: 'Sessão inválida.' });
      return;
    }

    const item = req.body || {};
    const dataStr = String(item.data || new Date().toISOString().split('T')[0]);
    const categoria = String(item.categoria || 'Almoço');
    const nome = String(item.nome || 'Alimento');
    const marca = String(item.marca || 'Genérico');
    const quantidade = Number(item.quantidade) || 100;
    const unidadeDesc = String(item.unidade_desc || item.unidadeDesc || `${quantidade}g`);
    const calorias = Number(item.calorias) || 0;
    const proteinas = Number(item.proteinas) || 0;
    const carboidratos = Number(item.carboidratos) || 0;
    const gorduras = Number(item.gorduras) || 0;

    if (pgAvailable && pgPool) {
      try {
        const insertRes = await pgPool.query(
          `INSERT INTO diario_refeicoes
            (user_id, data, categoria, nome, marca, quantidade, unidade_desc, calorias, proteinas, carboidratos, gorduras)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            user.id,
            dataStr,
            categoria,
            nome,
            marca,
            quantidade,
            unidadeDesc,
            calorias,
            proteinas,
            carboidratos,
            gorduras,
          ]
        );
        res.json({ status: 'ok', id: insertRes.rows[0].id });
        return;
      } catch (err) {
        console.warn('PG adicionar refeicao error:', (err as Error).message);
      }
    }

    const newId = Date.now();
    const u = localStore.users[user.username];
    if (u) {
      if (!u.diario[dataStr]) u.diario[dataStr] = {};
      if (!u.diario[dataStr][categoria]) u.diario[dataStr][categoria] = [];
      u.diario[dataStr][categoria].push({
        id: newId,
        categoria,
        nome,
        marca,
        quantidade,
        unidadeDesc,
        calorias,
        proteinas,
        carboidratos,
        gorduras,
      });
      saveLocalStore(localStore);
    }
    res.json({ status: 'ok', id: newId });
  });

  // Delete Meal Entry
  app.delete('/api/usuario/refeicao/:id', async (req, res) => {
    const user = await resolveUserByToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ detail: 'Sessão inválida.' });
      return;
    }

    const itemId = req.params.id;

    if (pgAvailable && pgPool) {
      try {
        await pgPool.query('DELETE FROM diario_refeicoes WHERE id = $1 AND user_id = $2', [
          Number(itemId) || 0,
          user.id,
        ]);
        res.json({ status: 'ok' });
        return;
      } catch (err) {
        console.warn('PG remover refeicao error:', (err as Error).message);
      }
    }

    const u = localStore.users[user.username];
    if (u) {
      for (const dateKey of Object.keys(u.diario)) {
        for (const catKey of Object.keys(u.diario[dateKey])) {
          u.diario[dateKey][catKey] = u.diario[dateKey][catKey].filter(
            (entry) => String(entry.id) !== String(itemId)
          );
        }
      }
      saveLocalStore(localStore);
    }
    res.json({ status: 'ok' });
  });

  // Add Custom Food Item
  app.post('/api/alimentos', async (req, res) => {
    const nome = String(req.body?.nome || '').trim();
    const marca = String(req.body?.marca || 'Manual').trim() || 'Manual';
    const calorias = Math.round((Number(req.body?.calorias) || 0) * 10) / 10;
    const proteinas = Math.round((Number(req.body?.proteinas) || 0) * 10) / 10;
    const carboidratos = Math.round((Number(req.body?.carboidratos) || 0) * 10) / 10;
    const gorduras = Math.round((Number(req.body?.gorduras) || 0) * 10) / 10;

    if (!nome) {
      res.status(400).json({ detail: 'Nome do alimento é obrigatório.' });
      return;
    }

    const novoAlimento: FoodItem = {
      nome,
      marca,
      calorias,
      proteinas,
      carboidratos,
      gorduras,
      fonte: 'MANUAL',
    };

    localStore.customFoods.unshift(novoAlimento);
    saveLocalStore(localStore);

    if (pgAvailable && pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO alimentos (nome, marca, calorias, proteinas, carboidratos, gorduras, fonte)
           VALUES ($1, $2, $3, $4, $5, $6, 'MANUAL')`,
          [nome, marca, calorias, proteinas, carboidratos, gorduras]
        );
      } catch (err) {
        console.warn('PG salvar alimento manual warning:', (err as Error).message);
      }
    }

    res.json({ status: 'sucesso', item: novoAlimento });
  });

  // Hybrid Food Search: TACO Local + Custom DB + FatSecret OAuth2 + OpenFoodFacts
  app.get('/api/alimentos', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.json({ origem: 'taco_local', total: 0, itens: [] });
      return;
    }

    const combinedLocalPool: FoodItem[] = [...localStore.customFoods, ...BASE_TACO_EXPANDIDA];

    if (pgAvailable && pgPool) {
      try {
        const dbFoods = await pgPool.query(
          'SELECT nome, marca, calorias, proteinas, carboidratos, gorduras, fonte FROM alimentos LIMIT 500'
        );
        for (const r of dbFoods.rows) {
          combinedLocalPool.push({
            nome: r.nome,
            marca: r.marca || 'TACO',
            calorias: Number(r.calorias),
            proteinas: Number(r.proteinas),
            carboidratos: Number(r.carboidratos),
            gorduras: Number(r.gorduras),
            fonte: r.fonte || 'TACO_LOCAL',
          });
        }
      } catch {
        // Ignore PG read errors and rely on in-memory TACO
      }
    }

    const resultadosLocais = filterFoodsByQuery(combinedLocalPool, q);

    // Deduplicate local matches first
    const seenKeys = new Set<string>();
    const dedupedLocal: FoodItem[] = [];
    for (const item of resultadosLocais) {
      const key = `${removerAcentos(item.nome)}|${removerAcentos(item.marca)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedLocal.push(item);
      }
    }

    // If we have 6+ strong local matches, return immediately (0ms latency)
    if (dedupedLocal.length >= 6) {
      res.json({
        origem: 'taco_local',
        total: dedupedLocal.length,
        itens: dedupedLocal.slice(0, 30),
      });
      return;
    }

    // Query FatSecret commercial catalog in parallel with OpenFoodFacts fallback
    let externalItems = await searchFatSecretAPI(removerAcentos(q));
    let origem = 'hibrido_taco_fatsecret';

    if (externalItems.length === 0) {
      externalItems = await searchOpenFoodFactsAPI(q);
      if (externalItems.length > 0) {
        origem = 'hibrido_openfoodfacts';
      } else {
        origem = 'taco_local';
      }
    }

    // Cache newly discovered commercial items in local store and PG
    for (const extItem of externalItems) {
      const key = `${removerAcentos(extItem.nome)}|${removerAcentos(extItem.marca)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedLocal.push(extItem);
        localStore.customFoods.push(extItem);
      }
    }

    if (externalItems.length > 0) {
      saveLocalStore(localStore);
    }

    res.json({
      origem,
      total: dedupedLocal.length,
      itens: dedupedLocal.slice(0, 35),
    });
  });

  // Barcode Product Lookup: Local Cache -> BARCODE_CATALOG_BR -> OpenFoodFacts v2 -> FatSecret Barcode API
  app.get('/api/alimentos/barcode/:code', async (req, res) => {
    const cleanCode = normalizeBarcode(req.params.code || '');
    if (cleanCode.length < 8) {
      res.status(400).json({ detail: 'Código de barras inválido (mínimo 8 dígitos).' });
      return;
    }

    // 1. Check custom foods and local catalog
    const customMatch = localStore.customFoods.find(
      (f) => f.codigoBarras && normalizeBarcode(f.codigoBarras) === cleanCode
    );
    if (customMatch) {
      res.json({ status: 'ok', origem: 'cache_local', item: customMatch });
      return;
    }

    if (BARCODE_CATALOG_BR[cleanCode]) {
      res.json({
        status: 'ok',
        origem: 'catalogo_br',
        item: BARCODE_CATALOG_BR[cleanCode],
      });
      return;
    }

    // 2. Query OpenFoodFacts API v2 (Brazilian & Global EAN-13 database)
    const offUrls = [
      `https://br.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
    ];

    for (const url of offUrls) {
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'MacroFitPro/1.0 (https://macrofit.local)' },
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const parsedItem = parseOpenFoodFactsProduct(data, cleanCode);
          if (parsedItem) {
            localStore.customFoods.unshift(parsedItem);
            saveLocalStore(localStore);
            res.json({ status: 'ok', origem: 'openfoodfacts_barcode', item: parsedItem });
            return;
          }
        }
      } catch {
        // try next endpoint
      }
    }

    // 3. Fallback: Query FatSecret Barcode API if token available
    try {
      const fsToken = await getFatSecretAccessToken();
      if (fsToken) {
        const gtin13 = cleanCode.padStart(13, '0');
        const params = new URLSearchParams({
          method: 'food.find_id_for_barcode',
          barcode: gtin13,
          format: 'json',
        });
        const fsResp = await fetch(
          `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${fsToken}` },
            signal: AbortSignal.timeout(4500),
          }
        );
        if (fsResp.ok) {
          const fsData = (await fsResp.json()) as { food_id?: { value?: string } };
          const foodId = fsData?.food_id?.value;
          if (foodId && foodId !== '0') {
            const detailParams = new URLSearchParams({
              method: 'food.get.v4',
              food_id: String(foodId),
              format: 'json',
            });
            const detailResp = await fetch(
              `https://platform.fatsecret.com/rest/server.api?${detailParams.toString()}`,
              {
                headers: { Authorization: `Bearer ${fsToken}` },
                signal: AbortSignal.timeout(4500),
              }
            );
            if (detailResp.ok) {
              const detailJson = (await detailResp.json()) as {
                food?: {
                  food_name?: string;
                  brand_name?: string;
                  servings?: {
                    serving?:
                      | Array<Record<string, string>>
                      | Record<string, string>;
                  };
                };
              };
              const f = detailJson.food;
              if (f?.food_name) {
                const rawServings = f.servings?.serving;
                const servingList = Array.isArray(rawServings)
                  ? rawServings
                  : rawServings
                    ? [rawServings]
                    : [];
                const s = servingList[0] || {};
                const metricAmt = Number(s.metric_serving_amount) || 100;
                const scale = metricAmt > 0 ? 100 / metricAmt : 1;
                const fsItem: FoodItem = {
                  nome: f.food_name,
                  marca: f.brand_name || 'FatSecret',
                  calorias: Math.round((Number(s.calories) || 0) * scale * 10) / 10,
                  proteinas: Math.round((Number(s.protein) || 0) * scale * 10) / 10,
                  carboidratos: Math.round((Number(s.carbohydrate) || 0) * scale * 10) / 10,
                  gorduras: Math.round((Number(s.fat) || 0) * scale * 10) / 10,
                  fonte: 'BARCODE',
                  codigoBarras: cleanCode,
                };
                localStore.customFoods.unshift(fsItem);
                saveLocalStore(localStore);
                res.json({ status: 'ok', origem: 'fatsecret_barcode', item: fsItem });
                return;
              }
            }
          }
        }
      }
    } catch {
      // ignore FatSecret errors
    }

    res.status(404).json({
      detail: `Produto com código ${cleanCode} não encontrado nas bases automáticas. Você pode cadastrá-lo manualmente agora!`,
      codigoBarras: cleanCode,
    });
  });

  // Direct Android APK Download Route
  app.get('/MacroFit-Pro.apk', (_req, res) => {
    const apkPublicPath = path.join(process.cwd(), 'public', 'MacroFit-Pro.apk');
    const apkDistPath = path.join(process.cwd(), 'dist', 'MacroFit-Pro.apk');
    const targetPath = fs.existsSync(apkPublicPath)
      ? apkPublicPath
      : fs.existsSync(apkDistPath)
        ? apkDistPath
        : null;

    if (!targetPath) {
      res.status(404).send('Arquivo APK não encontrado.');
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="MacroFit-Pro.apk"');
    res.sendFile(targetPath);
  });

  // ============================================================================
  // GitHub OAuth & 1-Click Repository Publisher
  // ============================================================================
  let githubAccessToken = (process.env.GITHUB_TOKEN || '').trim();

  app.get('/api/github/status', async (_req, res) => {
    const token = githubAccessToken || (process.env.GITHUB_TOKEN || '').trim();
    const hasOAuthConfig = Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    );
    if (!token) {
      res.json({ connected: false, hasOAuthConfig });
      return;
    }
    try {
      const ghResp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MacroFit-Pro-Publisher',
        },
      });
      if (ghResp.ok) {
        const user = (await ghResp.json()) as { login: string; html_url: string };
        res.json({
          connected: true,
          username: user.login,
          profileUrl: user.html_url,
          hasOAuthConfig,
        });
        return;
      }
    } catch {
      // ignore
    }
    res.json({ connected: false, hasOAuthConfig });
  });

  app.get('/api/auth/github/url', (req, res) => {
    const clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
    if (!clientId) {
      res.status(400).json({
        detail:
          'Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET nas variáveis de ambiente ou use o botão GitHub no topo do Google AI Studio.',
      });
      return;
    }
    const baseAppUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`
    ).replace(/\/+$/, '');
    const redirectUri = `${baseAppUrl}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo workflow',
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  const githubCallbackHandler: express.RequestHandler = async (req, res) => {
    const code = String(req.query.code || '');
    const clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();

    if (code && clientId && clientSecret) {
      try {
        const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        });
        if (tokenResp.ok) {
          const data = (await tokenResp.json()) as { access_token?: string };
          if (data.access_token) {
            githubAccessToken = data.access_token;
          }
        }
      } catch (err) {
        console.warn('GitHub OAuth token exchange error:', (err as Error).message);
      }
    }

    res.send(`<!doctype html>
<html>
  <body style="background:#090D16;color:#F8FAFC;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Conectado ao GitHub com sucesso! Esta janela será fechada automaticamente.</p>
  </body>
</html>`);
  };

  app.get(['/auth/callback', '/auth/callback/'], githubCallbackHandler);

  app.post('/api/github/publish', async (req, res) => {
    const token = githubAccessToken || (process.env.GITHUB_TOKEN || '').trim();
    if (!token) {
      res.status(401).json({
        detail:
          'Conecte sua conta GitHub via OAuth, defina GITHUB_TOKEN nos Secrets do AI Studio ou clique no ícone do GitHub na barra superior do AI Studio.',
      });
      return;
    }

    const repoName =
      String(req.body?.repoName || 'MacroFit-Pro')
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, '-') || 'MacroFit-Pro';

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'MacroFit-Pro-Publisher',
    };

    try {
      // 1. Get authenticated GitHub user
      const userResp = await fetch('https://api.github.com/user', { headers: ghHeaders });
      if (!userResp.ok) {
        res.status(401).json({ detail: 'Token do GitHub inválido ou expirado.' });
        return;
      }
      const ghUser = (await userResp.json()) as { login: string };
      const owner = ghUser.login;

      // 2. Check if repository exists; create if not
      const checkResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: ghHeaders,
      });
      if (checkResp.status === 404) {
        const createResp = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: ghHeaders,
          body: JSON.stringify({
            name: repoName,
            description:
              'MacroFit Pro — Aplicativo Android (.apk) e Web Full-Stack para controle de macronutrientes, TMB/GET, hidratação e base TACO + FatSecret sincronizada na nuvem.',
            private: false,
            auto_init: true,
          }),
        });
        if (!createResp.ok) {
          const errText = await createResp.text();
          res.status(400).json({ detail: `Erro ao criar repositório no GitHub: ${errText}` });
          return;
        }
        // Wait briefly for initial commit
        await new Promise((r) => setTimeout(r, 1200));
      }

      // 3. Collect project files to publish
      const filesToPublish = [
        'README.md',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'server.ts',
        'render.yaml',
        '.gitignore',
        '.env.example',
        '.github/workflows/deploy-pages.yml',
        'src/main.tsx',
        'src/index.css',
        'src/App.tsx',
        'src/data/tacoDatabase.ts',
        'src/utils/nutrition.ts',
        'src/utils/nutrition.test.ts',
        'src/hooks/usePWAInstall.ts',
        'src/components/PWAInstallModal.tsx',
        'src/components/BarcodeScannerView.tsx',
        'src/components/FoodSearchModal.tsx',
        'src/components/MetabolicGoalsView.tsx',
        'src/components/TacoCatalogView.tsx',
        'src/components/AccountCloudView.tsx',
        'public/icon.svg',
        'public/apple-touch-icon.png',
        'public/pwa-192x192.png',
        'public/pwa-512x512.png',
        'public/pwa-maskable-512x512.png',
        'public/MacroFit-Pro.apk',
      ];

      let uploadedCount = 0;
      for (const relPath of filesToPublish) {
        const absPath = path.join(process.cwd(), relPath);
        if (!fs.existsSync(absPath)) continue;

        const contentBase64 = fs.readFileSync(absPath).toString('base64');

        // Check existing file SHA if updating
        let existingSha: string | undefined;
        const existingResp = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}`,
          { headers: ghHeaders }
        );
        if (existingResp.ok) {
          const existingData = (await existingResp.json()) as { sha?: string };
          existingSha = existingData.sha;
        }

        const putResp = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}`,
          {
            method: 'PUT',
            headers: ghHeaders,
            body: JSON.stringify({
              message: `chore: publish ${relPath} from MacroFit Pro`,
              content: contentBase64,
              ...(existingSha ? { sha: existingSha } : {}),
            }),
          }
        );
        if (putResp.ok) {
          uploadedCount++;
        }
      }

      // 4. Enable GitHub Pages (workflow build type) if not enabled
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({ build_type: 'workflow' }),
      }).catch(() => {});

      res.json({
        status: 'ok',
        owner,
        repoName,
        uploadedCount,
        repoUrl: `https://github.com/${owner}/${repoName}`,
        pagesUrl: `https://${owner}.github.io/${repoName}/`,
      });
    } catch (err) {
      res.status(500).json({ detail: `Falha ao publicar no GitHub: ${(err as Error).message}` });
    }
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MacroFit Pro server running on http://localhost:${PORT}`);
  });
}

startServer();
