# MacroFit Pro — Nutrição, Macronutrientes & APK Android

Aplicativo **Android (`.apk` nativo e PWA Standalone)** e **Web Full-Stack** para controle diário de macronutrientes, cálculo metabólico (Equação de Mifflin-St Jeor TMB/GET), rastreamento de hidratação e busca híbrida de alimentos (**Tabela TACO + FatSecret API + OpenFoodFacts**) sincronizado na nuvem com **Neon PostgreSQL**.

---

## 📱 Download do Aplicativo Android (`.apk`)

O pacote Android compilado e assinado digitalmente (`v2` + `v3` APK Signature Scheme) está incluído neste repositório:

- **Arquivo APK**: [`public/MacroFit-Pro.apk`](./public/MacroFit-Pro.apk) (`com.macrofit.pro` v1.0.0)
- **Compatibilidade**: Android 7.0+ (API 24 a 34)
- **Recursos Offline**: Inclui toda a Tabela TACO expandida, calculadora TMB/GET e conversor de medidas caseiras embutidos dentro do APK.

---

## ✨ Funcionalidades Principais

1. **Diário Nutricional Inteligente**:
   - Controle de Calorias Restantes, Proteínas (`2.0g/kg`), Carboidratos e Gorduras (`0.8g/kg`).
   - Categorias personalizáveis (`Café da Manhã`, `Almoço`, `Lanche`, `Jantar`, etc.).
2. **Motor Híbrido de Alimentos (3 Camadas)**:
   - **Camada 1 (0ms)**: Base **TACO Expandida** (UNICAMP) + marcas brasileiras populares embutidas localmente com busca tolerante a acentos.
   - **Camada 2 (OAuth 2.0)**: Proxy **FatSecret Platform API** para produtos comerciais e códigos de barras.
   - **Camada 3 (Fallback)**: **OpenFoodFacts Brasil** + cadastro manual sincronizado.
3. **Conversor de Medidas Caseiras**:
   - Gramas (`g`), Mililitros (`ml`), Colher de Sopa (`15g`/`20g`), Colher de Chá (`5g`), Xícara (`200ml`/`240ml`), Concha Média (`120g`), Fatia (`30g`), Ovo (`50g`), Filé Médio (`120g`) e Escopo de Whey (`30g`).
4. **Calculadora Metabólica Mifflin-St Jeor (TMB & GET)**:
   - Cálculo automático de Taxa Metabólica Basal, Gasto Energético Total e meta diária de água (`35 ml/kg`).
5. **Sincronização Multi-Usuário na Nuvem**:
   - Autenticação com contas independentes (`Entrar`, `Criar Conta` e `Recuperar Senha`) persistidas em **Neon PostgreSQL**.

---

## 🚀 Como Executar Localmente

```bash
npm install
npm run dev
```

O servidor completo (Express + Vite + API Híbrida) estará disponível em `http://localhost:3000`.

## 🌐 Deploy Automático (GitHub Pages & Render)

- **GitHub Pages**: O workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) compila e publica automaticamente a aplicação web e o instalador `MacroFit-Pro.apk` no GitHub Pages a cada push na branch `main`.
- **Render (Full-Stack API + PostgreSQL)**: O arquivo [`render.yaml`](./render.yaml) configura o deploy automático do servidor Node/TypeScript (`server.ts`).
