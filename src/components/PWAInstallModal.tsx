import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, MoreVertical, PlusSquare, PackageCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [selectedPlatform, setSelectedPlatform] = useState<'apk' | 'pwa' | 'ios'>(isIOS ? 'ios' : 'apk');
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [apkDownloaded, setApkDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownloadApk = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isDownloadingApk) return;
    setIsDownloadingApk(true);
    try {
      const response = await fetch('./MacroFit-Pro.apk?v=2.0', { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha no download');
      const blob = await response.blob();
      const apkBlob = new Blob([blob], { type: 'application/vnd.android.package-archive' });
      const url = window.URL.createObjectURL(apkBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'MacroFit-Pro.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      setApkDownloaded(true);
    } catch {
      // Fallback to direct link
      const link = document.createElement('a');
      link.href = './MacroFit-Pro.apk?v=2.0';
      link.download = 'MacroFit-Pro.apk';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloadingApk(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-[#111827] border-t sm:border border-slate-800 p-6 shadow-2xl">
        <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="pwa-modal-title" className="text-base font-bold text-white">
                Baixar APK v2.0 & Instalar no Android
              </h3>
              <p className="text-xs text-slate-400">
                Inclui Leitor de Código de Barras (Câmera) + Base TACO
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar guia de instalação"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct APK Download Banner */}
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              Pacote Android Compilado (MacroFit-Pro.apk)
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">v2.0 · Câmera + TACO</span>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Baixe a nova versão <strong className="text-white">v2.0 (.apk)</strong> com o <strong className="text-emerald-300">Leitor de Código de Barras por Câmera</strong>, base TACO embutida e sincronização na nuvem:
          </p>
          <a
            href="./MacroFit-Pro.apk?v=2.0"
            download="MacroFit-Pro.apk"
            onClick={handleDownloadApk}
            className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            {isDownloadingApk
              ? 'Preparando Download...'
              : apkDownloaded
                ? 'Download v2.0 Iniciado (Baixar Novamente)'
                : 'Baixar MacroFit-Pro.apk (v2.0)'}
          </a>
        </div>

        {isInstallable && (
          <div className="mb-4">
            <button
              type="button"
              onClick={async () => {
                const ok = await install();
                if (ok) onClose();
              }}
              className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Ou Instalar Direto via Chrome (PWA)
            </button>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => setSelectedPlatform('apk')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedPlatform === 'apk'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Instalar APK
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('pwa')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedPlatform === 'pwa'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chrome PWA
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('ios')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedPlatform === 'ios'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            iOS (Safari)
          </button>
        </div>

        {selectedPlatform === 'apk' ? (
          <ol className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Desinstale a versão anterior (v1.0) se já estiver no celular</p>
                <p className="text-slate-400 mt-0.5">
                  Como o arquivo APK fica gravado no aparelho, desinstale o APK antigo antes de instalar o novo <strong className="text-slate-200">v2.0</strong> para evitar conflito de assinatura do Android.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Baixe e instale o novo MacroFit-Pro.apk (v2.0)</p>
                <p className="text-slate-400 mt-0.5">
                  Toque no botão verde acima e abra o arquivo baixado. Se o Play Protect exibir aviso, toque em <strong className="text-slate-200">"Mais detalhes → Instalar assim mesmo"</strong>.
                </p>
              </div>
            </li>
          </ol>
        ) : selectedPlatform === 'pwa' ? (
          <ol className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Abra o menu do Chrome no Android</p>
                <p className="text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                  Toque no ícone <MoreVertical className="w-3.5 h-3.5 inline text-slate-300" /> no canto superior direito do navegador.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Selecione "Instalar aplicativo"</p>
                <p className="text-slate-400 mt-0.5">
                  Ou toque em <strong className="text-slate-200">"Adicionar à tela inicial"</strong>.
                </p>
              </div>
            </li>
          </ol>
        ) : (
          <ol className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Toque em Compartilhar no Safari</p>
                <p className="text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                  Na barra inferior do Safari, toque no botão <Share2 className="w-3.5 h-3.5 inline text-slate-300" /> Compartilhar.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Adicionar à Tela de Início</p>
                <p className="text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                  Role a lista e toque em <PlusSquare className="w-3.5 h-3.5 inline text-slate-300" /> <strong className="text-slate-200">Adicionar à Tela de Início</strong>.
                </p>
              </div>
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
