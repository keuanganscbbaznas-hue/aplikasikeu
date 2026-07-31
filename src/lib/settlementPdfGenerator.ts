import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SCB_LOGO_BASE64, BAZNAS_LOGO_BASE64 } from './logos';
import { SettlementReport } from '../types';

export async function generateSettlementPDF(settlement: SettlementReport) {
  const toastId = toast.loading("Menyiapkan PDF Laporan Settlement Otomatis...");

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont("helvetica", "normal");

    // Margins: Left = 15mm, Right = 195mm (Width = 180mm)
    let y = 15;

    // 1. HEADER LOGOS & TITLE
    try {
      doc.addImage(SCB_LOGO_BASE64, 'PNG', 15, y, 18, 17);
    } catch (e) {
      console.warn("SCB Logo error", e);
    }

    try {
      doc.addImage(BAZNAS_LOGO_BASE64, 'PNG', 177, y, 18, 17);
    } catch (e) {
      console.warn("Baznas Logo error", e);
    }

    // Title Center
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("LAPORAN SETTLEMENT & REALISASI ANGGARAN", 105, y + 6, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("CENDEKIA BAZNAS - MONETA FINANCIAL SYSTEM", 105, y + 11, { align: "center" });

    y += 20;

    // Line separator
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.6);
    doc.line(15, y, 195, y);
    y += 5;

    // 2. METADATA BOX
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, y, 180, 28, 'F');
    doc.rect(15, y, 180, 28, 'S');

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);

    // Left Column
    doc.text("Judul Settlement :", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(settlement.title || "-", 48, y + 6);

    doc.setFont("helvetica", "bold");
    doc.text("PIC Pengaju :", 18, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`${settlement.picName || "-"} (${settlement.divisi || "-"})`, 48, y + 12);

    doc.setFont("helvetica", "bold");
    doc.text("No. Dokumen :", 18, y + 18);
    doc.setFont("helvetica", "normal");
    doc.text(settlement.settlementNo || "-", 48, y + 18);

    doc.setFont("helvetica", "bold");
    doc.text("Tanggal :", 18, y + 24);
    doc.setFont("helvetica", "normal");
    doc.text(settlement.tanggalSettlement || format(new Date(), 'dd/MM/yyyy'), 48, y + 24);

    // Right Column
    doc.setFont("helvetica", "bold");
    doc.text("Sumber Rekening :", 115, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(settlement.sumberRekening || "-", 148, y + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Uang Muka Awal :", 115, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(`Rp ${settlement.nominalUangMuka.toLocaleString('id-ID')}`, 148, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Total Realisasi :", 115, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text(`Rp ${settlement.totalRealisasi.toLocaleString('id-ID')}`, 148, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Status Selisih :", 115, y + 24);
    doc.setFont("helvetica", "bold");

    if (settlement.statusBalance === 'sisa') {
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`Sisa (Pengembalian): Rp ${settlement.selisihDana.toLocaleString('id-ID')}`, 148, y + 24);
    } else if (settlement.statusBalance === 'kurang') {
      doc.setTextColor(225, 29, 72); // rose
      doc.text(`Kurang (Reimburse): Rp ${Math.abs(settlement.selisihDana).toLocaleString('id-ID')}`, 148, y + 24);
    } else {
      doc.setTextColor(100, 116, 139); // slate
      doc.text("Nihil (Pas 100%)", 148, y + 24);
    }

    doc.setTextColor(0, 0, 0);
    y += 33;

    // 3. RINCIAN TABEL BERDASARKAN KATEGORI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RINCIAN PENGELUARAN PER KATEGORI ANGGARAN", 15, y);
    y += 4;

    // Filter out categories with 0 items or 0 total amount
    const activeCategories = (settlement.categories || []).filter(
      cat => cat.items && cat.items.length > 0 && cat.categoryTotal > 0
    );

    if (activeCategories.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 10, 'F');
      doc.rect(15, y, 180, 10, 'S');
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("Tidak ada rincian kategori pengeluaran yang digunakan.", 105, y + 6, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 12;
    } else {
      activeCategories.forEach((cat, cIdx) => {
        if (y > 250) {
          doc.addPage();
          y = 15;
        }

        // Category Header Box (Kode budget tidak ditampilkan sesuai instruksi)
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(15, y, 180, 7, 'F');
        doc.rect(15, y, 180, 7, 'S');

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        const catTitle = `${cIdx + 1}. ${cat.categoryName.toUpperCase()}`;
        doc.text(catTitle, 18, y + 5);

        doc.text(`Subtotal: Rp ${cat.categoryTotal.toLocaleString('id-ID')}`, 192, y + 5, { align: 'right' });
        y += 7;

        // Table Header
        doc.setFillColor(226, 232, 240); // slate-200
        doc.rect(15, y, 180, 6, 'F');
        doc.rect(15, y, 180, 6, 'S');

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("No", 18, y + 4.5);
        doc.text("Uraian / Keterangan Item", 28, y + 4.5);
        doc.text("Vol/Qty", 110, y + 4.5, { align: 'center' });
        doc.text("Satuan", 128, y + 4.5, { align: 'center' });
        doc.text("Harga Satuan (Rp)", 158, y + 4.5, { align: 'right' });
        doc.text("Total (Rp)", 192, y + 4.5, { align: 'right' });
        y += 6;

        // Table Rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);

        cat.items.forEach((item, itemIdx) => {
          if (y > 265) {
            doc.addPage();
            y = 15;
          }

          doc.rect(15, y, 180, 6, 'S');
          doc.text((itemIdx + 1).toString(), 18, y + 4.5);

          // Truncate long descriptions
          let descStr = item.description || '-';
          if (descStr.length > 52) descStr = descStr.substring(0, 49) + '...';
          doc.text(descStr, 28, y + 4.5);

          doc.text((item.qty || 1).toString(), 110, y + 4.5, { align: 'center' });
          doc.text(item.unit || "Buah", 128, y + 4.5, { align: 'center' });
          doc.text((item.unitPrice || 0).toLocaleString('id-ID'), 158, y + 4.5, { align: 'right' });
          doc.text((item.totalAmount || 0).toLocaleString('id-ID'), 192, y + 4.5, { align: 'right' });

          y += 6;
        });

        y += 3; // space after category
      });
    }

    // 4. SUMMARY BOX
    if (y > 230) {
      doc.addPage();
      y = 15;
    }

    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 20, 'F');
    doc.rect(15, y, 180, 20, 'S');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("REKAPITULASI AKHIR SETTLEMENT:", 18, y + 6);

    doc.setFontSize(8.5);
    doc.text(`Total Pencairan Uang Muka : Rp ${settlement.nominalUangMuka.toLocaleString('id-ID')}`, 18, y + 12);
    doc.text(`Total Realisasi Pengeluaran: Rp ${settlement.totalRealisasi.toLocaleString('id-ID')}`, 18, y + 17);

    doc.setFontSize(9.5);
    if (settlement.statusBalance === 'sisa') {
      doc.setTextColor(16, 185, 129);
      doc.text(`SISA DANA DIKEMBALIKAN: Rp ${settlement.selisihDana.toLocaleString('id-ID')}`, 115, y + 12);
    } else if (settlement.statusBalance === 'kurang') {
      doc.setTextColor(225, 29, 72);
      doc.text(`KURANG DANA (REIMBURSE): Rp ${Math.abs(settlement.selisihDana).toLocaleString('id-ID')}`, 115, y + 12);
    } else {
      doc.setTextColor(71, 85, 105);
      doc.text("STATUS: PAS / NIHIL (0)", 115, y + 12);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.text("*Dokumen ini disah-kan secara elektronik dalam aplikasi MONETA SCB.", 115, y + 17);

    y += 26;

    // 5. SIGNATURE SECTION
    if (y > 230) {
      doc.addPage();
      y = 15;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const sigColWidth = 55;
    const col1X = 15;
    const col2X = 77.5;
    const col3X = 140;

    // Col 1: PIC
    doc.text("Yang Membuat,", col1X + sigColWidth / 2, y, { align: "center" });
    doc.text("PIC Pengaju", col1X + sigColWidth / 2, y + 4, { align: "center" });

    if (settlement.signatures?.pic?.signature) {
      try {
        doc.addImage(settlement.signatures.pic.signature, 'PNG', col1X + 10, y + 6, 35, 18);
      } catch (e) {}
    } else {
      doc.line(col1X + 10, y + 22, col1X + 45, y + 22);
    }
    doc.setFont("helvetica", "bold");
    doc.text(settlement.picName || "PIC Pengaju", col1X + sigColWidth / 2, y + 28, { align: "center" });

    // Col 2: Head Dept
    doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", col2X + sigColWidth / 2, y, { align: "center" });
    doc.text("Kepala Divisi / Subdivisi", col2X + sigColWidth / 2, y + 4, { align: "center" });

    if (settlement.signatures?.headDept?.signature) {
      try {
        doc.addImage(settlement.signatures.headDept.signature, 'PNG', col2X + 10, y + 6, 35, 18);
      } catch (e) {}
    } else {
      doc.line(col2X + 10, y + 22, col2X + 45, y + 22);
    }
    doc.setFont("helvetica", "bold");
    doc.text(settlement.signatures?.headDept?.name || "Kepala Divisi", col2X + sigColWidth / 2, y + 28, { align: "center" });

    // Col 3: Verifikator Keuangan
    doc.setFont("helvetica", "normal");
    doc.text("Verifikasi Keuangan,", col3X + sigColWidth / 2, y, { align: "center" });
    doc.text("Tim Keuangan SCB", col3X + sigColWidth / 2, y + 4, { align: "center" });

    if (settlement.signatures?.verifikator?.signature) {
      try {
        doc.addImage(settlement.signatures.verifikator.signature, 'PNG', col3X + 10, y + 6, 35, 18);
      } catch (e) {}
    } else {
      doc.line(col3X + 10, y + 22, col3X + 45, y + 22);
    }
    doc.setFont("helvetica", "bold");
    doc.text(settlement.signatures?.verifikator?.name || "Keuangan SCB", col3X + sigColWidth / 2, y + 28, { align: "center" });

    // Save PDF
    const filename = `Laporan_Settlement_${(settlement.settlementNo || '01').replace(/[/\\?%*:|"<>]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(filename);

    toast.success("PDF Laporan Settlement berhasil diunduh!", { id: toastId });
  } catch (error: any) {
    console.error("PDF Settlement Error:", error);
    toast.error(`Gagal membuat PDF: ${error.message || 'Error'}`, { id: toastId });
  }
}
