import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const ELEMENT_ID = "qr-reader-region";

export default function QrScanner({ onResult, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const qr = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = qr;
    let stopped = false;

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        if (stopped) return;
        stopped = true;
        qr.stop().then(() => qr.clear()).catch(() => {});
        onResult(decodedText);
      },
      () => {} // ignore per-frame scan failures
    ).catch((err) => {
      onResult(null, err?.message || "Couldn't access the camera.");
    });

    return () => {
      if (!stopped) {
        qr.stop().then(() => qr.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-ink/90 z-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div id={ELEMENT_ID} className="rounded-xl overflow-hidden bg-black" />
        <button
          onClick={onClose}
          className="mt-5 w-full bg-panel text-ink rounded-md py-2.5 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
