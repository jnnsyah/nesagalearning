/**
 * Sanitizes technical database and system errors into clean, friendly Indonesian error messages for users.
 */
export function formatErrorMessage(err: any, fallback: string = 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'): string {
	if (!err) return fallback;

	const msg = typeof err === 'string' ? err : String(err.message || err.detail || '');

	// Clean user-crafted messages (don't contain raw DB/SQL syntax)
	if (
		msg &&
		!msg.toLowerCase().includes('constraint') &&
		!msg.toLowerCase().includes('duplicate key') &&
		!msg.toLowerCase().includes('foreign key') &&
		!msg.toLowerCase().includes('violates') &&
		!msg.toLowerCase().includes('syntax error') &&
		!msg.toLowerCase().includes('postgres') &&
		!msg.toLowerCase().includes('select') &&
		!msg.toLowerCase().includes('insert into') &&
		!msg.toLowerCase().includes('update ') &&
		!msg.toLowerCase().includes('delete from')
	) {
		return msg;
	}

	// Map raw Postgres database constraint error patterns
	if (msg.includes('unique constraint') || msg.includes('duplicate key')) {
		if (msg.includes('nisn')) {
			return 'NISN tersebut sudah terdaftar untuk siswa lain.';
		}
		if (msg.includes('username')) {
			return 'Username tersebut sudah digunakan.';
		}
		if (msg.includes('email')) {
			return 'Alamat email tersebut sudah terdaftar.';
		}
		return 'Data dengan kombinasi ini sudah ada di dalam sistem.';
	}

	if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
		return 'Data tidak dapat diproses atau dihapus karena masih terikat dengan relasi data lain.';
	}

	if (msg.includes('invalid input syntax for integer') || msg.includes('invalid number')) {
		return 'Format angka atau referensi data tidak valid.';
	}

	if (msg.includes('null value in column') || msg.includes('not-null constraint')) {
		return 'Harap lengkapi semua bidang isian wajib.';
	}

	return fallback;
}
