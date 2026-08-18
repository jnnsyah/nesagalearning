import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GuruAttendanceDetailViewData } from '$lib/server/services/guru-attendance-recap.service';

/**
 * Export Rekap Presensi to Excel (.xlsx) file
 * Single sheet format with rich inline styling, Indigo brand banners,
 * color-coded badges, and clear key-value metadata layout.
 */
export function exportAttendanceToExcel(data: GuruAttendanceDetailViewData) {
	const taName = data.selectedTahunAjaran?.name || 'Semua TA';
	const kelasName = data.selectedKelas?.name || 'Semua Rombel';
	const dateStr = new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	// Create temporary HTML table element for rich styled Excel export
	const container = document.createElement('div');
	container.innerHTML = `
		<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt;">
			<!-- Title Banner -->
			<tr>
				<td colspan="9" style="background-color: #3730a3; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 12px; border: 1px solid #3730a3;">
					NESAGA LEARNING COMMUNITY (NLC)
				</td>
			</tr>
			<tr>
				<td colspan="9" style="background-color: #4f46e5; color: #ffffff; font-size: 12pt; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #4f46e5;">
					LAPORAN REKAPITULASI PRESENSI SISWA
				</td>
			</tr>
			<tr><td colspan="9" style="height: 10px;"></td></tr>

			<!-- Metadata Section Header -->
			<tr>
				<td colspan="9" style="background-color: #e0e7ff; color: #3730a3; font-size: 11pt; font-weight: bold; padding: 8px 12px; border: 1px solid #c7d2fe;">
					INFORMASI KELAS & METRIK UTAMA PRESENSI
				</td>
			</tr>

			<!-- Metadata Key-Value Rows -->
			<tr>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Tahun Ajaran:</td>
				<td colspan="2" style="background-color: #ffffff; color: #0f172a; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1;">${taName}</td>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Rombel Kelas:</td>
				<td colspan="3" style="background-color: #ffffff; color: #0f172a; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1;">${kelasName}</td>
			</tr>
			<tr>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Total Pertemuan:</td>
				<td colspan="2" style="background-color: #ffffff; color: #0f172a; padding: 6px 10px; border: 1px solid #cbd5e1;">${data.summary.totalSessionsCount} Sesi</td>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Total Siswa Terdaftar:</td>
				<td colspan="3" style="background-color: #ffffff; color: #0f172a; padding: 6px 10px; border: 1px solid #cbd5e1;">${data.summary.totalStudentsCount} Siswa</td>
			</tr>
			<tr>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Kehadiran Overall:</td>
				<td colspan="2" style="background-color: #dcfce7; color: #15803d; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1;">${data.summary.overallAttendanceRate}%</td>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Tingkat Izin / Sakit:</td>
				<td colspan="3" style="background-color: #fef3c7; color: #b45309; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1;">${data.summary.excusedRate}%</td>
			</tr>
			<tr>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Tingkat Alpha:</td>
				<td colspan="2" style="background-color: #fee2e2; color: #b91c1c; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1;">${data.summary.alphaRate}%</td>
				<td colspan="2" style="background-color: #f8fafc; font-weight: bold; color: #475569; padding: 6px 10px; border: 1px solid #cbd5e1;">Tanggal Cetak Laporan:</td>
				<td colspan="3" style="background-color: #ffffff; color: #0f172a; padding: 6px 10px; border: 1px solid #cbd5e1;">${dateStr}</td>
			</tr>
			<tr><td colspan="9" style="height: 12px;"></td></tr>

			<!-- Table Headers -->
			<thead>
				<tr style="background-color: #3730a3; color: #ffffff; font-weight: bold; text-align: center;">
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 50px;">No</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; text-align: left; width: 220px;">Nama Siswa</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 140px;">NISN</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 130px;">Total Pertemuan</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 100px;">Total Hadir</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 100px;">Total Izin</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 100px;">Total Alpha</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 120px;">% Kehadiran</th>
					<th style="background-color: #3730a3; color: #ffffff; font-size: 11pt; padding: 10px; border: 1px solid #312e81; width: 150px;">Status Risiko</th>
				</tr>
			</thead>
			<tbody>
				${data.students
					.map((st, idx) => {
						const isEven = idx % 2 === 0;
						const rowBg = isEven ? '#ffffff' : '#f8fafc';
						let statusText = 'Baik';
						let statusBg = '#dcfce7';
						let statusFg = '#15803d';

						if (st.attendanceRate < 50) {
							statusText = 'Perhatian Khusus';
							statusBg = '#fee2e2';
							statusFg = '#b91c1c';
						} else if (st.attendanceRate < 80) {
							statusText = 'Cukup';
							statusBg = '#fef3c7';
							statusFg = '#b45309';
						}

						return `
						<tr style="background-color: ${rowBg};">
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
							<td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${st.fullName}</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${st.nisn || '-'}</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; color: #0f172a;">${data.summary.totalSessionsCount}</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #15803d;">${st.totalHadir}</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #b45309;">${st.totalExcused}</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; color: #94a3b8;">${st.totalAlpha}</td>
							<td style="text-align: right; padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${st.attendanceRate}%</td>
							<td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; background-color: ${statusBg}; color: ${statusFg}; font-weight: bold;">${statusText}</td>
						</tr>
					`;
					})
					.join('')}
			</tbody>
		</table>
	`;

	const tableEl = container.querySelector('table');
	if (!tableEl) return;

	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.table_to_sheet(tableEl, { raw: true });

	// Set column widths
	ws['!cols'] = [
		{ wch: 6 },  // A: No
		{ wch: 32 }, // B: Nama Siswa
		{ wch: 18 }, // C: NISN
		{ wch: 18 }, // D: Total Pertemuan
		{ wch: 14 }, // E: Total Hadir
		{ wch: 14 }, // F: Total Izin
		{ wch: 14 }, // G: Total Alpha
		{ wch: 16 }, // H: % Kehadiran
		{ wch: 22 }  // I: Status Risiko
	];

	XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');

	// Trigger file download
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
