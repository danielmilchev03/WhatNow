import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { inviteUrl } from '../invite';

const COPIED_MS = 2000;

/** Invite link for the room: a "Copy link" button, the link itself and a QR code to scan. */
export function InviteShare({ code }: { code: string }) {
  const { t } = useTranslation();
  const url = inviteUrl(window.location.origin, code);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toString(url, { type: 'svg', margin: 1 })
      .then((svg) => {
        if (active) setQrSrc(`data:image/svg+xml,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    // navigator.clipboard is missing on insecure origins, e.g. a phone on http://192.168.x.x.
    const write = navigator.clipboard?.writeText(url);
    if (!write) {
      setCopyFailed(true);
      return;
    }
    write.then(
      () => {
        setCopyFailed(false);
        setCopied(true);
      },
      () => setCopyFailed(true),
    );
  };

  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border p-4">
      <h2 className="font-semibold">{t('lobby.inviteTitle')}</h2>
      {qrSrc && <img src={qrSrc} alt={t('lobby.qrAlt')} className="h-40 w-40" />}
      <p className="text-xs break-all text-gray-500">{url}</p>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border-2 border-rose-600 px-4 py-2 font-semibold text-rose-600"
      >
        {copied ? t('lobby.linkCopied') : t('lobby.copyLink')}
      </button>
      {copyFailed && (
        <label className="flex w-full flex-col gap-1 text-sm text-gray-600">
          {t('lobby.copyFailed')}
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="rounded-lg border p-2 text-gray-900"
          />
        </label>
      )}
    </section>
  );
}
