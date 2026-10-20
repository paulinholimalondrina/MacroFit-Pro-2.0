import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, LogOut, Server, KeyRound, Smartphone, CheckCircle2, AlertCircle, RefreshCw, GitBranch, ExternalLink, UploadCloud } from 'lucide-react';

interface AccountCloudViewProps {
  currentUser: string | null;
  authToken: string | null;
  apiBaseUrl: string;
  serverStatus: { online: boolean; database: string; message: string };
  onLoginSuccess: (username: string, token: string) => void;
  onLogout: () => void;
  onUpdateApiBaseUrl: (newUrl: string) => void;
  onTestConnection: (urlToTest?: string) => Promise<void>;
  onOpenInstallModal: () => void;
}

export const AccountCloudView: React.FC<AccountCloudViewProps> = ({
  currentUser,
  authToken,
  apiBaseUrl,
  serverStatus,
  onLoginSuccess,
  onLogout,
  onUpdateApiBaseUrl,
  onTestConnection,
  onOpenInstallModal,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [authMessage, setAuthMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customUrlInput, setCustomUrlInput] = useState(apiBaseUrl);
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // GitHub Publisher State
  const [ghStatus, setGhStatus] = useState<{
    connected: boolean;
    username?: string;
    profileUrl?: string;
    hasOAuthConfig?: boolean;
  }>({ connected: false });
  const [repoName, setRepoName] = useState('MacroFit-Pro');
  const [isPublishingGh, setIsPublishingGh] = useState(false);
  const [ghMessage, setGhMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
    repoUrl?: string;
    pagesUrl?: string;
  } | null>(null);

  const checkGitHubStatus = useCallback(async () => {
    try {
      const base = apiBaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${base}/api/github/status`);
      if (resp.ok) {
        const data = await resp.json();
        setGhStatus(data);
      }
    } catch {
      // ignore
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    checkGitHubStatus();
  }, [checkGitHubStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkGitHubStatus();
        setGhMessage({
          type: 'ok',
          text: 'Conta do GitHub conectada com sucesso! Clique em "Publicar no Meu GitHub" abaixo.',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkGitHubStatus]);

  const handleConnectGitHub = async () => {
    setGhMessage(null);
    try {
      const base = apiBaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${base}/api/auth/github/url`);
      const data = (await resp.json()) as { url?: string; detail?: string };
      if (!resp.ok || !data.url) {
        setGhMessage({
          type: 'err',
          text:
            data.detail ||
            'Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET nas configurações ou use o botão do GitHub no topo do AI Studio.',
        });
        return;
      }
      window.open(data.url, 'github_oauth_popup', 'width=600,height=720');
    } catch {
      setGhMessage({
        type: 'err',
        text: 'Erro ao iniciar conexão OAuth com o GitHub.',
      });
    }
  };

  const handlePublishToGitHub = async () => {
    setGhMessage(null);
    setIsPublishingGh(true);
    try {
      const base = apiBaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${base}/api/github/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName: repoName.trim() || 'MacroFit-Pro' }),
      });
      const data = (await resp.json()) as {
        status?: string;
        repoUrl?: string;
        pagesUrl?: string;
        uploadedCount?: number;
        detail?: string;
      };
      if (resp.ok && data.repoUrl) {
        setGhMessage({
          type: 'ok',
          text: `Repositório publicado com sucesso (${data.uploadedCount || 20} arquivos enviados, incluindo MacroFit-Pro.apk e GitHub Pages)!`,
          repoUrl: data.repoUrl,
          pagesUrl: data.pagesUrl,
        });
      } else {
        setGhMessage({
          type: 'err',
          text:
            data.detail ||
            'Para publicar por aqui, conecte o GitHub via OAuth ou clique no ícone do GitHub na barra superior do Google AI Studio.',
        });
      }
    } catch {
      setGhMessage({
        type: 'err',
        text: 'Erro de comunicação ao tentar publicar no GitHub.',
      });
    } finally {
      setIsPublishingGh(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setAuthMessage({ type: 'err', text: 'Preencha o nome de usuário e a senha.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const base = customUrlInput.trim().replace(/\/+$/, '');
      if (authMode === 'reset') {
        const resp = await fetch(`${base}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUser,
            chave_mestra: masterKey.trim(),
            nova_senha: password,
          }),
        });
        const data = (await resp.json()) as { token?: string; username?: string; detail?: string; mensagem?: string };
        if (resp.ok && data.token && data.username) {
          setAuthMessage({ type: 'ok', text: data.mensagem || 'Senha redefinida com sucesso!' });
          onLoginSuccess(data.username, data.token);
        } else {
          setAuthMessage({ type: 'err', text: data.detail || 'Não foi possível redefinir a senha.' });
        }
      } else {
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const resp = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password }),
        });
        const data = (await resp.json()) as { token?: string; username?: string; detail?: string };
        if (resp.ok && data.token && data.username) {
          setAuthMessage({
            type: 'ok',
            text: authMode === 'login' ? 'Conectado com sucesso!' : 'Conta criada e sincronizada!',
          });
          setUsername('');
          setPassword('');
          onLoginSuccess(data.username, data.token);
        } else {
          setAuthMessage({ type: 'err', text: data.detail || 'Falha na autenticação.' });
        }
      }
    } catch {
      setAuthMessage({
        type: 'err',
        text: 'Erro de conexão com o servidor. Verifique a URL da API abaixo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndTestUrl = async (urlValue: string) => {
    const clean = urlValue.trim().replace(/\/+$/, '');
    setCustomUrlInput(clean);
    onUpdateApiBaseUrl(clean);
    setIsTestingUrl(true);
    await onTestConnection(clean);
    setIsTestingUrl(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Multi-User Cloud Sync Card */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Sincronização Multi-Usuário
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acesse seus registros no celular Android e no computador com contas separadas (ex: você e sua esposa)
            </p>
          </div>
        </div>

        {currentUser && authToken ? (
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Sessão ativa sincronizada</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">@{currentUser}</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {serverStatus.database === 'neon_postgresql' ? 'Neon PostgreSQL' : 'Servidor Ativo'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Todas as suas refeições diárias, consumo de água e metas metabólicas estão sendo salvas automaticamente na sua conta.
            </p>

            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[46px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta / Trocar Usuário
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  authMode === 'login' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  authMode === 'register' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('reset');
                  setAuthMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  authMode === 'reset' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Recuperar Senha
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label htmlFor="auth-user" className="block text-xs font-medium text-slate-300 mb-1">
                  Nome de Usuário
                </label>
                <input
                  id="auth-user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: paulinho ou esposa"
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === 'reset' && (
                <div>
                  <label htmlFor="auth-master" className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Chave Mestra de Recuperação
                  </label>
                  <input
                    id="auth-master"
                    type="password"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="Padrão: macrofit2026"
                    className="w-full min-h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-pass" className="block text-xs font-medium text-slate-300 mb-1">
                  {authMode === 'reset' ? 'Nova Senha (mín. 4 caracteres)' : 'Senha'}
                </label>
                <input
                  id="auth-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              {authMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    authMessage.type === 'ok'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {authMessage.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  {authMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? 'Sincronizando...'
                  : authMode === 'login'
                    ? 'Entrar na Conta'
                    : authMode === 'register'
                      ? 'Criar Conta Sincronizada'
                      : 'Redefinir Senha'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Backend Proxy & Android App Configuration */}
      <div className="space-y-6">
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              Conexão da API & Banco de Dados
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              O servidor integrado já inclui proxy FatSecret + Tabela TACO + Neon PostgreSQL. Você também pode apontar para seu Render ou Termux local.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 block">Status da Conexão</span>
              <p className="text-xs font-semibold text-white mt-0.5">{serverStatus.message}</p>
            </div>
            <span
              className={`text-xs font-mono font-semibold ${
                serverStatus.online ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {serverStatus.online ? 'CONECTADO' : 'MODO OFFLINE'}
            </span>
          </div>

          <div>
            <label htmlFor="cfg-backend-url" className="block text-xs font-medium text-slate-300 mb-1.5">
              URL do Servidor API (Vazio = Servidor Integrado Automático)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="cfg-backend-url"
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="Servidor Integrado (Padrão)"
                className="w-full sm:flex-1 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSaveAndTestUrl(customUrlInput)}
                disabled={isTestingUrl}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin text-emerald-400' : ''}`} />
                Salvar & Testar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSaveAndTestUrl('')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-emerald-400 font-medium border border-slate-700/80 transition-colors cursor-pointer"
            >
              Usar Servidor Integrado (Padrão)
            </button>
            <button
              type="button"
              onClick={() =>
                handleSaveAndTestUrl(
                  'https://ais-pre-bni4jp6evocwom3vuscuhd-481614738372.us-east5.run.app'
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-emerald-300 font-medium border border-emerald-500/30 transition-colors cursor-pointer"
            >
              Nuvem AI Studio (Online)
            </button>
            <button
              type="button"
              onClick={() => handleSaveAndTestUrl('https://macrofit-pro-1.onrender.com')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            >
              Render (macrofit-pro-1)
            </button>
            <button
              type="button"
              onClick={() => handleSaveAndTestUrl('http://localhost:8000')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            >
              Termux Local (8000)
            </button>
          </div>
        </div>

        {/* Android Native APK Download & PWA Card */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Instalador Android Nativo (.APK)
            </h3>
            <p className="text-xs text-slate-400">
              Baixe o pacote compilado <strong className="text-slate-200">MacroFit-Pro.apk</strong> para instalar diretamente no seu celular Android com a Tabela TACO offline embutida.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              Baixar .APK
            </button>
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Instruções
            </button>
          </div>
        </div>

        {/* GitHub Repository Publisher Card */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                Publicar no Meu GitHub (Repositório + APK + GitHub Pages)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporte todo o projeto, o instalador <strong className="text-slate-200">MacroFit-Pro.apk</strong> e o workflow automático do GitHub Pages diretamente para sua conta do GitHub.
              </p>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold shrink-0 ${
                ghStatus.connected ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {ghStatus.connected ? `@${ghStatus.username}` : 'PRONTO PARA EXPORTAR'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="MacroFit-Pro"
              aria-label="Nome do repositório no GitHub"
              className="w-full sm:flex-1 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
            />
            {!ghStatus.connected && (
              <button
                type="button"
                onClick={handleConnectGitHub}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                Conectar GitHub
              </button>
            )}
            <button
              type="button"
              onClick={handlePublishToGitHub}
              disabled={isPublishingGh}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              {isPublishingGh ? 'Publicando...' : 'Publicar no Meu GitHub'}
            </button>
          </div>

          {ghMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium space-y-2 ${
                ghMessage.type === 'ok'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
              }`}
            >
              <p>{ghMessage.text}</p>
              {ghMessage.repoUrl && (
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href={ghMessage.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
                  >
                    Abrir Repositório no GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                  {ghMessage.pagesUrl && (
                    <a
                      href={ghMessage.pagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                    >
                      Abrir GitHub Pages <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
