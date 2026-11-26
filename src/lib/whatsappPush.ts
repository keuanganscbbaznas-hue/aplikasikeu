import { auth } from '../firebase';
import { getApiUrl } from './utils';
import { Submission, getStagesByType, getDisplayAmount } from '../types';
import { toast } from 'sonner';

export interface PushWhatsAppOptions {
  target: string;
  message: string;
  silent?: boolean;
}

export interface PushWhatsAppResult {
  ok: boolean;
  configured?: boolean;
  error?: string;
}

export function normalizeWhatsAppNumber(phoneNumber?: string | null): string {
  if (!phoneNumber || typeof phoneNumber !== 'string') return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  if (normalized.length < 8 || normalized.length > 16) return '';
  return normalized;
}

export async function checkWhatsAppGatewayStatus(): Promise<{ configured: boolean }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return { configured: false };
    const idToken = await currentUser.getIdToken();
    const res = await fetch(getApiUrl('/api/whatsapp/status'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return { configured: false };
    const data = await res.json();
    return { configured: Boolean(data?.configured) };
  } catch {
    return { configured: false };
  }
}

export async function pushWhatsAppMessage({
  target,
  message,
  silent = false,
}: PushWhatsAppOptions): Promise<PushWhatsAppResult> {
  const normalizedTarget = normalizeWhatsAppNumber(target);
  if (!normalizedTarget) {
    if (!silent) {
      toast.error('Nomor WhatsApp tujuan tidak valid atau belum diisi.');
    }
    return { ok: false, error: 'Invalid phone number' };
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    return { ok: false, error: 'Empty message' };
  }

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      if (!silent) {
        toast.error('Silakan masuk dengan Google terlebih dahulu untuk mengirim WhatsApp.');
      }
      return { ok: false, error: 'Unauthenticated' };
    }

    const idToken = await currentUser.getIdToken();
    const res = await fetch(getApiUrl('/api/whatsapp/send'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        target: normalizedTarget,
        message: trimmedMessage,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      const errMsg = data?.error || `Gagal mengirim WhatsApp (HTTP ${res.status})`;
      if (!silent) {
        toast.error(errMsg);
      } else {
        console.warn('Auto WhatsApp Push skipped:', errMsg);
      }
      return {
        ok: false,
        configured: data?.configured,
        error: errMsg,
      };
    }

    if (!silent) {
      toast.success('Notifikasi WhatsApp berhasil dikirim otomatis.');
    }
    return { ok: true, configured: true };
  } catch (err: any) {
    const errMsg = err?.message || 'Gagal menghubungi layanan WhatsApp';
    if (!silent) {
      toast.error(errMsg);
    } else {
      console.warn('Auto WhatsApp Push error:', errMsg);
    }
    return { ok: false, error: errMsg };
  }
}

export function buildSubmissionCreatedWaMessage(params: {
  picName?: string;
  title: string;
  amount: number;
  initialStage: string;
}): string {
  const url = 'https://aplikasikeu.vercel.app';
  return [
    "Assalamu'alaikum Wr. Wb.",
    `Yth. PIC *${params.picName || 'Pengaju'}*, pengajuan baru Anda telah tercatat di MONETA SCB:`,
    `📦 *Judul:* ${params.title}`,
    `💰 *Nominal:* Rp ${(params.amount || 0).toLocaleString('id-ID')}`,
    `📝 *Status:* ${params.initialStage}`,
    '',
    `Pantau progres pengajuan Anda di: ${url}`,
    '',
    'Terima kasih.',
    '- Keuangan SCB BAZNAS',
  ].join('\n');
}

export function buildSubmissionStageUpdateWaMessage(
  submission: Submission,
  nextStageName: string,
  isRejected = false,
  comment?: string
): string {
  const stages = getStagesByType(submission.type);
  const statusLabel = isRejected
    ? `DITOLAK / DIKEMBALIKAN (pada tahap ${stages[submission.currentStageIndex] || submission.status})`
    : nextStageName;
  const url = 'https://aplikasikeu.vercel.app';

  const lines = [
    "Assalamu'alaikum Wr. Wb.",
    `Yth. PIC *${submission.picName || submission.submittedByName || 'Pengaju'}*, terdapat pembaruan status pengajuan Anda:`,
    `📦 *Judul:* ${submission.title}`,
    `💰 *Nominal:* Rp ${getDisplayAmount(submission).toLocaleString('id-ID')}`,
    `📝 *Status Terbaru:* ${statusLabel}`,
  ];

  if (comment && comment.trim()) {
    lines.push(`💬 *Catatan:* ${comment.trim()}`);
  }

  lines.push('', `Cek detail selengkapnya di aplikasi: ${url}`, '', 'Terima kasih.', '- Keuangan SCB BAZNAS');
  return lines.join('\n');
}

export function buildLiveChatReplyWaMessage(params: {
  recipientName?: string;
  senderName: string;
  messageText: string;
}): string {
  const url = 'https://aplikasikeu.vercel.app';
  const snippet = params.messageText.length > 350 ? `${params.messageText.slice(0, 347)}...` : params.messageText;
  return [
    "Assalamu'alaikum Wr. Wb.",
    `Halo *${params.recipientName || 'Rekan SCB'}*, Anda menerima balasan baru pada Live Chat MONETA SCB dari *${params.senderName}*:`,
    '',
    `"${snippet}"`,
    '',
    `Silakan buka aplikasi untuk membalas: ${url}`,
    '- Keuangan SCB BAZNAS',
  ].join('\n');
}

export function buildDonationVerifiedWaMessage(params: {
  donaturName?: string;
  amount: number;
}): string {
  return [
    `Halo ${params.donaturName || 'Donatur'},`,
    '',
    'Terima kasih telah berdonasi ke Sekolah Cendekia BAZNAS.',
    `Donasi Anda sebesar Rp ${(params.amount || 0).toLocaleString('id-ID')} telah kami verifikasi.`,
    '',
    'Semoga menjadi amal jariyah bagi penuntut ilmu. Syukron katsiran.',
  ].join('\n');
}
