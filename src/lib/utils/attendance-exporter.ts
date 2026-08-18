import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GuruAttendanceDetailViewData } from '$lib/server/services/guru-attendance-recap.service';

/**
 * Export Rekap Presensi to Excel (.xlsx) file
 * Single sheet format with Document Title & Header Information block, identical to PDF layout.
 */
export function exportAttendanceToExcel(data: GuruAttendanceDetailViewData) {
	const taName = data.selectedTahunAjaran?.name || 'Semua_TA';
	const kelasName = data.selectedKelas?.name || 'Semua_Kelas';
	const dateStr = new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const wb = XLSX.utils.book_new();

	// Build Single Sheet Rows
	const excelRows: (string | number)[][] = [
		['NESAGA LEARNING COMMUNITY (NLC)'],
		['LAPORAN REKAPITULASI PRESENSI SISWA'],
		[],
		[`Tahun Ajaran: ${taName}`, `Rombel: ${kelasName}`, `Tanggal Cetak: ${dateStr}`],
		[
			`Total Pertemuan: ${data.summary.totalSessionsCount} Sesi`,
			`Total Siswa Terdaftar: ${data.summary.totalStudentsCount} Siswa`
		],
		[
			`Kehadiran Overall: ${data.summary.overallAttendanceRate}%`,
			`Izin / Sakit: ${data.summary.excusedRate}%`,
			`Alpha: ${data.summary.alphaRate}%`
		],
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

	// Column Widths
	ws['!cols'] = [
		{ wch: 6 },  // No
		{ wch: 32 }, // Nama Siswa
		{ wch: 18 }, // NISN
		{ wch: 18 }, // Total Pertemuan
		{ wch: 14 }, // Total Hadir
		{ wch: 14 }, // Total Izin
		{ wch: 14 }, // Total Alpha
		{ wch: 16 }, // % Kehadiran
		{ wch: 20 }  // Status Risiko
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

	// Table Data (No username column, no Rombel column, added Total Pertemuan column)
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
