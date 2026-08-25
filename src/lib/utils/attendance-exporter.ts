import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GuruAttendanceDetailViewData } from '$lib/server/services/guru-attendance-recap.service';

/**
 * Export Rekap Presensi to Excel (.xls) file with full HTML styling,
 * preserved background colors, Indigo brand headers, and colored status badges.
 */
export function exportAttendanceToExcel(data: GuruAttendanceDetailViewData) {
	const taName = data.selectedTahunAjaran?.name || 'Semua TA';
	const kelasName = data.selectedKelas?.name || 'Semua Rombel';
	const dateStr = new Date().toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const htmlContent = `
		<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
		<head>
			<meta charset="utf-8">
			<!--[if gte mso 9]>
			<xml>
				<x:ExcelWorkbook>
					<x:ExcelWorksheets>
						<x:ExcelWorksheet>
							<x:Name>Rekap Presensi</x:Name>
							<x:WorksheetOptions>
								<x:DisplayGridlines/>
							</x:WorksheetOptions>
						</x:ExcelWorksheet>
					</x:ExcelWorksheets>
				</x:ExcelWorkbook>
			</xml>
			<![endif]-->
			<style>
				body { font-family: Arial, sans-serif; font-size: 11pt; }
				table { border-collapse: collapse; width: 100%; }
				td, th { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: middle; }
				.title-banner { background-color: #3730a3; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; height: 40px; }
				.subtitle-banner { background-color: #4f46e5; color: #ffffff; font-size: 12pt; font-weight: bold; text-align: center; height: 30px; }
				.section-header { background-color: #e0e7ff; color: #3730a3; font-size: 11pt; font-weight: bold; }
				.label-cell { background-color: #f8fafc; font-weight: bold; color: #475569; }
				.val-cell { background-color: #ffffff; color: #0f172a; font-weight: bold; }
				.val-green { background-color: #dcfce7; color: #15803d; font-weight: bold; }
				.val-amber { background-color: #fef3c7; color: #b45309; font-weight: bold; }
				.val-red { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
				.th-header { background-color: #3730a3; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #312e81; }
				.td-center { text-align: center; }
				.td-right { text-align: right; }
				.badge-green { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
				.badge-amber { background-color: #fef3c7; color: #b45309; font-weight: bold; text-align: center; }
				.badge-red { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
			</style>
		</head>
		<body>
			<table>
				<tr>
					<td colspan="9" class="title-banner">NESAGA LEARNING COMMUNITY (NLC)</td>
				</tr>
				<tr>
					<td colspan="9" class="subtitle-banner">LAPORAN REKAPITULASI PRESENSI SISWA</td>
				</tr>
				<tr><td colspan="9" style="height: 10px; border: none;"></td></tr>

				<tr>
					<td colspan="9" class="section-header">INFORMASI KELAS & METRIK UTAMA PRESENSI</td>
				</tr>
				<tr>
					<td colspan="2" class="label-cell">Periode:</td>
					<td colspan="2" class="val-cell">${taName}</td>
					<td colspan="2" class="label-cell">Rombel Kelas:</td>
					<td colspan="3" class="val-cell">${kelasName}</td>
				</tr>
				<tr>
					<td colspan="2" class="label-cell">Total Pertemuan:</td>
					<td colspan="2" class="val-cell">${data.summary.totalSessionsCount} Sesi</td>
					<td colspan="2" class="label-cell">Total Siswa Terdaftar:</td>
					<td colspan="3" class="val-cell">${data.summary.totalStudentsCount} Siswa</td>
				</tr>
				<tr>
					<td colspan="2" class="label-cell">Kehadiran Overall:</td>
					<td colspan="2" class="val-green">${data.summary.overallAttendanceRate}%</td>
					<td colspan="2" class="label-cell">Tingkat Izin / Sakit:</td>
					<td colspan="3" class="val-amber">${data.summary.excusedRate}%</td>
				</tr>
				<tr>
					<td colspan="2" class="label-cell">Tingkat Alpha:</td>
					<td colspan="2" class="val-red">${data.summary.alphaRate}%</td>
					<td colspan="2" class="label-cell">Tanggal Cetak Laporan:</td>
					<td colspan="3" class="val-cell">${dateStr}</td>
				</tr>
				<tr><td colspan="9" style="height: 12px; border: none;"></td></tr>

				<thead>
					<tr>
						<th class="th-header" style="width: 50px;">No</th>
						<th class="th-header" style="width: 220px; text-align: left;">Nama Siswa</th>
						<th class="th-header" style="width: 140px;">NISN</th>
						<th class="th-header" style="width: 130px;">Total Pertemuan</th>
						<th class="th-header" style="width: 100px;">Total Hadir</th>
						<th class="th-header" style="width: 100px;">Total Izin</th>
						<th class="th-header" style="width: 100px;">Total Alpha</th>
						<th class="th-header" style="width: 120px;">% Kehadiran</th>
						<th class="th-header" style="width: 150px;">Status Risiko</th>
					</tr>
				</thead>
				<tbody>
					${data.students
						.map((st, idx) => {
							const isEven = idx % 2 === 0;
							const rowBg = isEven ? '#ffffff' : '#f8fafc';
							let statusText = 'Baik';
							let badgeClass = 'badge-green';

							if (st.attendanceRate < 50) {
								statusText = 'Perhatian Khusus';
								badgeClass = 'badge-red';
							} else if (st.attendanceRate < 80) {
								statusText = 'Cukup';
								badgeClass = 'badge-amber';
							}

							return `
								<tr style="background-color: ${rowBg};">
									<td class="td-center" style="color: #64748b;">${idx + 1}</td>
									<td style="font-weight: bold; color: #0f172a;">${st.fullName}</td>
									<td class="td-center" style="font-family: monospace; color: #475569;">${st.nisn || '-'}</td>
									<td class="td-center">${data.summary.totalSessionsCount}</td>
									<td class="td-center" style="font-weight: bold; color: #15803d;">${st.totalHadir}</td>
									<td class="td-center" style="font-weight: bold; color: #b45309;">${st.totalExcused}</td>
									<td class="td-center" style="color: #94a3b8;">${st.totalAlpha}</td>
									<td class="td-right" style="font-weight: bold; color: #0f172a;">${st.attendanceRate}%</td>
									<td class="${badgeClass}">${statusText}</td>
								</tr>
							`;
						})
						.join('')}
				</tbody>
			</table>
		</body>
		</html>
	`;

	const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `Rekap_Presensi_${kelasName.replace(/\s+/g, '_')}_TA${taName.replace(/\s+/g, '_')}.xls`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
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
	doc.text(`Periode: ${taName}   |   Rombel: ${kelasName}   |   Total Pertemuan: ${data.summary.totalSessionsCount} Sesi   |   Siswa Terdaftar: ${data.summary.totalStudentsCount} Siswa`, 18, 35);

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
