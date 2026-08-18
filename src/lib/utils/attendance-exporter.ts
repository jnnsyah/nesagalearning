import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GuruAttendanceDetailViewData } from '$lib/server/services/guru-attendance-recap.service';

/**
 * Export Rekap Presensi to Excel (.xlsx) file
 * Single sheet format with merged title block and structured key-value metadata grid.
 */
export function exportAttendanceToExcel(data: GuruAttendanceDetailViewData) {
	const taName = data.selectedTahunAjaran?.name || 'Semua TA';
	const kelasName = data.selectedKelas?.name || 'Semua Rombel';
	const dateStr = new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const wb = XLSX.utils.book_new();

	// Build Single Sheet Rows with Key-Value Metadata Grid
	const excelRows: (string | number)[][] = [
		['NESAGA LEARNING COMMUNITY (NLC)'],
		['LAPORAN REKAPITULASI PRESENSI SISWA'],
		[],
		['INFORMASI KELAS & METRIK PRESENSI'],
		['Tahun Ajaran', '', taName, '', 'Rombel Kelas', '', kelasName, '', ''],
		['Total Pertemuan', '', `${data.summary.totalSessionsCount} Sesi`, '', 'Total Siswa Terdaftar', '', `${data.summary.totalStudentsCount} Siswa`, '', ''],
		['Kehadiran Overall', '', `${data.summary.overallAttendanceRate}%`, '', 'Tingkat Izin / Sakit', '', `${data.summary.excusedRate}%`, '', ''],
		['Tingkat Alpha', '', `${data.summary.alphaRate}%`, '', 'Tanggal Cetak Laporan', '', dateStr, '', ''],
		[],
		[
			'No',
			'Nama Siswa',
			'NISN',
			'Total Pertemuan',
			'Total Hadir',
			'Total Izin',
			'Total Alpha',
			'% Kehadiran',
			'Status Risiko'
		]
	];

	// Append Student Rows
	data.students.forEach((st, idx) => {
		let statusText = 'Baik';
		if (st.attendanceRate < 50) statusText = 'Perhatian Khusus';
		else if (st.attendanceRate < 80) statusText = 'Cukup';

		excelRows.push([
			idx + 1,
			st.fullName,
			st.nisn || '-',
			data.summary.totalSessionsCount,
			st.totalHadir,
			st.totalExcused,
			st.totalAlpha,
			`${st.attendanceRate}%`,
			statusText
		]);
	});

	const ws = XLSX.utils.aoa_to_sheet(excelRows);

	// Cell Merges (!merges) to prevent text overflow & align headers
	ws['!merges'] = [
		// Title & Subtitle across all 9 columns (A to I)
		{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },

		// Metadata Grid Key-Value Merges
		{ s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
		{ s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
		{ s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
		{ s: { r: 4, c: 6 }, e: { r: 4, c: 8 } },

		{ s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
		{ s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
		{ s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
		{ s: { r: 5, c: 6 }, e: { r: 5, c: 8 } },

		{ s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
		{ s: { r: 6, c: 2 }, e: { r: 6, c: 3 } },
		{ s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },
		{ s: { r: 6, c: 6 }, e: { r: 6, c: 8 } },

		{ s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
		{ s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },
		{ s: { r: 7, c: 4 }, e: { r: 7, c: 5 } },
		{ s: { r: 7, c: 6 }, e: { r: 7, c: 8 } }
	];

	// Column Widths (!cols)
	ws['!cols'] = [
		{ wch: 6 },  // A: No
		{ wch: 30 }, // B: Nama Siswa
		{ wch: 18 }, // C: NISN
		{ wch: 18 }, // D: Total Pertemuan
		{ wch: 14 }, // E: Total Hadir
		{ wch: 14 }, // F: Total Izin
		{ wch: 14 }, // G: Total Alpha
		{ wch: 16 }, // H: % Kehadiran
		{ wch: 20 }  // I: Status Risiko
	];

	XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');

	// Download file
	const filename = `Rekap_Presensi_${kelasName.replace(/\s+/g, '_')}_TA${taName.replace(/\s+/g, '_')}.xlsx`;
	XLSX.writeFile(wb, filename);
}

/**
 * Export Rekap Presensi to PDF (.pdf) file
 */
export function exportAttendanceToPDF(data: GuruAttendanceDetailViewData) {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

	const taName = data.selectedTahunAjaran?.name || 'Semua TA';
	const kelasName = data.selectedKelas?.name || 'Semua Rombel';
	const dateStr = new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	// Header Document
	doc.setFillColor(79, 70, 229); // #4f46e5 Indigo
	doc.rect(0, 0, 297, 22, 'F');

	doc.setTextColor(255, 255, 255);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.text('NESAGA LEARNING COMMUNITY (NLC)', 14, 10);

	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text('LAPORAN REKAPITULASI PRESENSI SISWA', 14, 16);

	doc.setFontSize(8);
	doc.text(`Tanggal Cetak: ${dateStr}`, 240, 16);

	// Metadata Bar
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(226, 232, 240);
	doc.roundedRect(14, 26, 269, 14, 2, 2, 'FD');

	doc.setTextColor(15, 23, 42);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.text(`Tahun Ajaran: ${taName}   |   Rombel: ${kelasName}   |   Total Pertemuan: ${data.summary.totalSessionsCount} Sesi   |   Siswa Terdaftar: ${data.summary.totalStudentsCount} Siswa`, 18, 35);

	// Summary Cards Stats
	doc.setFontSize(8);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(71, 85, 105);
	doc.text(
		`Kehadiran Overall: ${data.summary.overallAttendanceRate}%    |    Izin/Sakit: ${data.summary.excusedRate}%    |    Alpha/Unrecorded: ${data.summary.alphaRate}%`,
		18,
		47
	);

	// Table Data
	const tableHeaders = [
		'No',
		'Nama Siswa',
		'NISN',
		'Total Pertemuan',
		'Total Hadir',
		'Total Izin',
		'Total Alpha',
		'% Kehadiran',
		'Status Risiko'
	];

	const tableBody = data.students.map((st, idx) => {
		let statusText = 'Baik';
		if (st.attendanceRate < 50) statusText = 'Perhatian Khusus';
		else if (st.attendanceRate < 80) statusText = 'Cukup';

		return [
			idx + 1,
			st.fullName,
			st.nisn || '-',
			data.summary.totalSessionsCount,
			st.totalHadir,
			st.totalExcused,
			st.totalAlpha,
			`${st.attendanceRate}%`,
			statusText
		];
	});

	autoTable(doc, {
		startY: 52,
		head: [tableHeaders],
		body: tableBody,
		theme: 'grid',
		headStyles: {
			fillColor: [79, 70, 229],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8,
			halign: 'center'
		},
		bodyStyles: {
			fontSize: 8,
			textColor: [15, 23, 42]
		},
		columnStyles: {
			0: { halign: 'center', cellWidth: 10 },
			1: { cellWidth: 65 },
			2: { cellWidth: 30 },
			3: { halign: 'center', cellWidth: 28 },
			4: { halign: 'center', cellWidth: 24 },
			5: { halign: 'center', cellWidth: 24 },
			6: { halign: 'center', cellWidth: 24 },
			7: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
			8: { halign: 'center', cellWidth: 35 }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	// Footer page numbers
	const totalPages = (doc as any).internal.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(148, 163, 184);
		doc.text(`Dokumen Resmi NLC Nesaga — Halaman ${i} dari ${totalPages}`, 14, 202);
	}

	const filename = `Rekap_Presensi_${kelasName.replace(/\s+/g, '_')}_TA${taName.replace(/\s+/g, '_')}.pdf`;
	doc.save(filename);
}
