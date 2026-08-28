import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';
import { systemEmailConfig, emailOutbox } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Enkripsi/dekripsi sederhana menggunakan EMAIL_SECRET dari env.
// Di production gunakan Node crypto AES-256 atau vault secrets.
function getSecret(): string {
	return process.env.EMAIL_SECRET ?? 'nlc-dev-secret-change-in-production';
}

export function encryptPassword(plain: string): string {
	const secret = getSecret();
	const buf = Buffer.from(plain);
	const key = Buffer.from(secret);
	const bytes = new Uint8Array(buf.length);
	for (let i = 0; i < buf.length; i++) bytes[i] = buf[i] ^ key[i % key.length];
	return Buffer.from(bytes).toString('base64');
}

export function decryptPassword(encoded: string): string {
	const secret = getSecret();
	const buf = Buffer.from(encoded, 'base64');
	const key = Buffer.from(secret);
	const bytes = new Uint8Array(buf.length);
	for (let i = 0; i < buf.length; i++) bytes[i] = buf[i] ^ key[i % key.length];
	return Buffer.from(bytes).toString();
}

/** Baca konfigurasi email aktif dari database. */
export async function getActiveEmailConfig() {
	const config = await db
		.select()
		.from(systemEmailConfig)
		.where(eq(systemEmailConfig.isActive, true))
		.limit(1);
	return config[0] ?? null;
}

/** Buat Nodemailer transporter berdasarkan konfigurasi aktif dari DB. */
export async function createTransporter() {
	const config = await getActiveEmailConfig();

	if (!config || config.provider === 'disabled') {
		return null;
	}

	const smtpPass = config.smtpPassEncrypted ? decryptPassword(config.smtpPassEncrypted) : '';

	if (config.provider === 'gmail') {
		// Gmail menggunakan App Password (2FA wajib aktif di akun Google)
		return nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: config.smtpUser ?? config.senderEmail,
				pass: smtpPass
			}
		});
	}

	// Custom SMTP
	return nodemailer.createTransport({
		host: config.smtpHost ?? 'smtp.gmail.com',
		port: parseInt(config.smtpPort ?? '587'),
		secure: parseInt(config.smtpPort ?? '587') === 465,
		auth: {
			user: config.smtpUser ?? config.senderEmail,
			pass: smtpPass
		}
	});
}

export interface SendMailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

/**
 * Kirim email menggunakan konfigurasi aktif dari database.
 * Mengembalikan { success: true } atau { success: false, error: string }.
 */
export async function sendMail(
	options: SendMailOptions
): Promise<{ success: boolean; error?: string }> {
	const config = await getActiveEmailConfig();
	const senderEmail = config?.senderEmail ?? 'noreply@nlc.sch.id';

	try {
		const transporter = await createTransporter();

		if (!transporter || !config) {
			const errMsg = 'Tidak ada konfigurasi email aktif. Silakan atur di Admin → Pengaturan → Email.';
			await db.insert(emailOutbox).values({
				senderEmail,
				recipientEmail: options.to,
				subject: options.subject,
				bodyHtml: options.html,
				bodyText: options.text ?? null,
				status: 'failed',
				errorMessage: errMsg
			});
			return { success: false, error: errMsg };
		}

		await transporter.sendMail({
			from: `"${config.senderName}" <${config.senderEmail}>`,
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text
		});

		// Catat ke outbox
		await db.insert(emailOutbox).values({
			senderEmail: config.senderEmail,
			recipientEmail: options.to,
			subject: options.subject,
			bodyHtml: options.html,
			bodyText: options.text ?? null,
			status: 'sent',
			errorMessage: null
		});

		return { success: true };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		try {
			await db.insert(emailOutbox).values({
				senderEmail,
				recipientEmail: options.to,
				subject: options.subject,
				bodyHtml: options.html,
				bodyText: options.text ?? null,
				status: 'failed',
				errorMessage: message
			});
		} catch {
			// ignore log failure
		}
		return { success: false, error: message };
	}
}

/** Template HTML email reset password */
export function buildResetPasswordEmail(opts: {
	fullName: string;
	resetLink: string;
	expiresInMinutes: number;
}): string {
	return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:800;">🔐 Reset Password</h1>
              <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">Permintaan reset password diterima</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Halo, <strong>${opts.fullName}</strong> 👋</p>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk membuat password baru.
                Link ini hanya berlaku selama <strong>${opts.expiresInMinutes} menit</strong>.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${opts.resetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:700;">
                  Atur Ulang Password Saya
                </a>
              </div>
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-align:center;">Atau salin tautan ini ke browser:</p>
              <p style="margin:0;color:#6366f1;font-size:11px;text-align:center;word-break:break-all;">${opts.resetLink}</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Jika Anda tidak merasa mengajukan reset password, abaikan email ini. Akun Anda aman.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">Dikirim oleh sistem NLC · Jangan balas email ini</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/** Generate kode verifikasi 6 angka (OTP) */
export function generateVerificationCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Hash kode verifikasi 6 angka menggunakan SHA-256 */
export function hashVerificationCode(code: string): string {
	return crypto.createHash('sha256').update(code).digest('hex');
}

/** Hitung durasi cooldown (dalam detik) berdasarkan jumlah resend (Progressive Backoff) */
export function getCooldownForResend(resendCount: number): number {
	if (resendCount <= 0) return 30; // 30 detik (resend pertama setelah daftar)
	if (resendCount === 1) return 60; // 1 menit
	if (resendCount === 2) return 120; // 2 menit
	if (resendCount === 3) return 300; // 5 menit
	return 900; // 15 menit (untuk percobaan 5+)
}

/** Template HTML email kode verifikasi (OTP) */
export function buildVerificationEmail(opts: {
	fullName: string;
	code: string;
	expiresInMinutes: number;
}): string {
	return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kode Verifikasi Email</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:800;">✉️ Verifikasi Email</h1>
              <p style="color:#d1fae5;margin:6px 0 0;font-size:13px;">Kode Konfirmasi Pendaftaran Akun NLC</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Halo, <strong>${opts.fullName}</strong> 👋</p>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Terima kasih telah mendaftar di Nesaga Learning Community. Masukkan kode verifikasi 6 digit berikut untuk mengaktifkan email akun Anda:
              </p>
              <div style="text-align:center;margin:28px 0;">
                <div style="display:inline-block;background:#f0fdf4;border:2px dashed #059669;padding:14px 36px;border-radius:12px;">
                  <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:900;letter-spacing:10px;color:#047857;">${opts.code}</span>
                </div>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:12.5px;text-align:center;">
                Kode ini hanya berlaku selama <strong>${opts.expiresInMinutes} menit</strong>. Jangan bagikan kode ini kepada siapa pun.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Jika Anda tidak pernah merasa mendaftar di NLC, abaikan email ini.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">Dikirim oleh sistem NLC · Jangan balas email ini</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
