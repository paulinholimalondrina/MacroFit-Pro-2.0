import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, ScanBarcode, Search, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface BarcodeScannerViewProps {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
  isLookingUp: boolean;
  errorMsg: string;
}

const SAMPLE_BARCODES = [
  { code: '7891000100103', label: 'Nescau 2.0 (Nestlé)' },
  { code: '7898956207016', label: 'Pasta de Amendoim (Dr. Peanut)' },
  { code: '7898215151784', label: 'Leite Integral (Piracanjuba)' },
  { code: '7891025114611', label: 'Iogurte Grego (Danone)' },
  { code: '7896051111014', label: 'Requeijão Cremoso (Itambé)' },
  { code: '7891350034869', label: 'Aveia em Flocos (Quaker)' },
];

export const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({
  onDetected,
  onCancel,
  isLookingUp,
  errorMsg,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'denied'>('starting');
  const [cameraHint, setCameraHint] = useState('Aponte a câmera traseira para o código de barras do produto');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    hasTriggeredRef.current = false;
    let isMounted = true;
    let stream: MediaStream | null = null;
    let zxingReader: BrowserMultiFormatReader | null = null;
    let detectorInterval: number | null = null;

    const startCameraScanner = async () => {
      setCameraStatus('starting');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Câmera não disponível neste navegador');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraStatus('active');

        // 1. Try native hardware-accelerated BarcodeDetector on Android Chrome if available
        const NativeBarcodeDetector = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (NativeBarcodeDetector) {
          try {
            const detector = new NativeBarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
            });
            detectorInterval = window.setInterval(async () => {
              if (!videoRef.current || hasTriggeredRef.current) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const clean = barcodes[0].rawValue.replace(/\D+/g, '');
                  if (clean.length >= 8 && !hasTriggeredRef.current) {
                    hasTriggeredRef.current = true;
                    onDetected(clean);
                  }
                }
              } catch {
                // ignore frame error
              }
            }, 220);
          } catch {
            // fallback to ZXing below
          }
        }

        // 2. Also run ZXing multi-format reader for universal support (iOS, Desktop, WebView)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        zxingReader = new BrowserMultiFormatReader(hints, 300);
        if (videoRef.current) {
          zxingReader
            .decodeFromStream(stream, videoRef.current, (result) => {
              if (result && !hasTriggeredRef.current) {
                const clean = result.getText().replace(/\D+/g, '');
                if (clean.length >= 8) {
                  hasTriggeredRef.current = true;
                  onDetected(clean);
                }
              }
            })
            .catch(() => {});
        }
      } catch {
        if (!isMounted) return;
        setCameraStatus('denied');
        setCameraHint(
          'Permissão de câmera não concedida ou dispositivo sem câmera ativa. Digite o código EAN-13 abaixo ou escolha um produto de teste:'
        );
      }
    };

    startCameraScanner();

    return () => {
      isMounted = false;
      if (detectorInterval) window.clearInterval(detectorInterval);
      if (zxingReader) {
        try {
          zxingReader.reset();
        } catch {
          // ignore
        }
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, onDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualBarcode.replace(/\D+/g, '');
    if (clean.length >= 8) {
      onDetected(clean);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ScanBarcode className="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
            Scanner EAN-13 / Código de Barras
          </h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cameraStatus === 'active' && (
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3" />
              Inverter
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Voltar à Busca
          </button>
        </div>
      </div>

      {/* Live Camera Viewfinder */}
      <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-20'}`}
        />

        {/* Scanner Reticle & Laser Guide */}
        {cameraStatus === 'active' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-[260px] h-28 rounded-2xl border-2 border-emerald-400/80 relative shadow-[0_0_0_9999px_rgba(9,13,22,0.55)]">
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
            </div>
            <span className="mt-3 text-[11px] font-medium text-emerald-300 bg-slate-950/90 px-3 py-1 rounded-full border border-emerald-500/30">
              {isLookingUp ? 'Consultando tabela nutricional do código...' : cameraHint}
            </span>
          </div>
        )}

        {cameraStatus === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs">
            <Camera className="w-6 h-6 text-emerald-400 animate-pulse" />
            <span>Iniciando câmera para leitura de código de barras...</span>
          </div>
        )}

        {cameraStatus === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center gap-2">
            <Camera className="w-6 h-6 text-amber-400" />
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">{cameraHint}</p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Manual Barcode Entry */}
      <form onSubmit={handleManualSubmit} className="space-y-1.5">
        <label htmlFor="manual-ean-input" className="block text-xs font-medium text-slate-300">
          Ou digite os números do código de barras (EAN-13 / EAN-8):
        </label>
        <div className="flex gap-2">
          <input
            id="manual-ean-input"
            type="text"
            inputMode="numeric"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Ex: 7891000100103"
            className="min-w-0 flex-1 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isLookingUp || manualBarcode.replace(/\D+/g, '').length < 8}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            {isLookingUp ? 'Buscando...' : 'Buscar Código'}
          </button>
        </div>
      </form>

      {/* Quick Test Brazilian Barcodes */}
      <div className="pt-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Testar agora com códigos de barras reais de supermercado:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SAMPLE_BARCODES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => onDetected(item.code)}
              disabled={isLookingUp}
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-200 truncate">{item.label}</span>
              <span className="text-[11px] font-mono text-emerald-400 shrink-0">{item.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
