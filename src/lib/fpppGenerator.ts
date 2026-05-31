import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

// Helper to convert date
const parseFirestoreDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  if (typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  if (dateField.seconds) {
    return new Date(dateField.seconds * 1000);
  }
  return new Date(dateField);
};

// Safe date formatter to prevent RangeError: Invalid time value
const safeFormatDate = (dateField: any, pattern: string, options?: any): string => {
  if (!dateField) return '';
  try {
    const d = parseFirestoreDate(dateField);
    if (isNaN(d.getTime())) return '';
    return format(d, pattern, options);
  } catch (err) {
    console.error("Error formatting date:", err);
    return '';
  }
};

// Helper Indonesian spelling words (Terbilang)
function kekata(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return '';
  if (n < 0) return 'minus ' + kekata(-n);
  if (n === 0) return '';
  
  let string = '';
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  if (n < 12) {
    string = satuan[n];
  } else if (n < 20) {
    string = kekata(n - 10) + ' belas';
  } else if (n < 100) {
    string = kekata(Math.floor(n / 10)) + ' puluh ' + kekata(n % 10);
  } else if (n < 200) {
    string = 'seratus ' + kekata(n - 100);
  } else if (n < 1000) {
    string = kekata(Math.floor(n / 100)) + ' ratus ' + kekata(n % 100);
  } else if (n < 2000) {
    string = 'seribu ' + kekata(n - 1000);
  } else if (n < 1000000) {
    string = kekata(Math.floor(n / 1000)) + ' ribu ' + kekata(n % 1000);
  } else if (n < 1000000000) {
    string = kekata(Math.floor(n / 1000000)) + ' juta ' + kekata(n % 1000000);
  } else if (n < 1000000000000) {
    string = kekata(Math.floor(n / 1000000000)) + ' milyar ' + kekata(n % 1000000000);
  } else if (n < 1000000000000000) {
    string = kekata(Math.floor(n / 1000000000000)) + ' triliun ' + kekata(n % 1000000000000);
  }
  
  return string.replace(/\s+/g, ' ').trim();
}

export function terbilang(n: number): string {
  const nominal = isNaN(n) ? 0 : Math.floor(n);
  if (nominal === 0) return 'Nol Rupiah';
  const hasil = kekata(nominal);
  return (hasil.charAt(0).toUpperCase() + hasil.slice(1)) + ' Rupiah';
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // 5 seconds load timeout for extreme resilience
    const timer = setTimeout(() => {
      reject(new Error("Image load timeout"));
    }, 5000);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timer);
      reject(e);
    };
    img.src = url;
  });
};

const loadBase64Image = async (url: string): Promise<string> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error("Network response was not ok");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export async function generateFPPP(submission: any | null, isEmpty: boolean = false, config?: any) {
  const toastId = toast.loading(isEmpty ? "Menyiapkan template FPPP kosong..." : "Menyiapkan formulir FPPP signed...");
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set default font
    doc.setFont("helvetica", "normal");
    
    // Outer borders of entire layout
    // Margins: Left=15, Right=195 (width=180), Top=10, Bottom=260
    
    // Helper to draw vertical text in side bar column
    const drawSidebarText = (text: string, startY: number, height: number) => {
      doc.saveGraphicsState();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59); // slate-800
      
      // Compute the exact vertical center of the sidebar box
      const centerY = startY + (height / 2);
      
      // X = 21.0 is the exact horizontal center of the sidebar column (which spans from X=15 to X=27)
      // Angle 90 rotates the text to run vertically bottom-to-top
      // align: 'center' centers the text along its own line length
      // baseline: 'middle' centers the character heights horizontally inside the 12mm-wide column
      doc.text(text, 21.0, centerY, { angle: 90, align: 'center', baseline: 'middle' });
      doc.restoreGraphicsState();
    };

    // 1. HEADER SECTION (with Logos and Form Name)
    // X=15 to 195 (width=180), Y=10 to 26 (height=16)
    
    // Load & draw SCB Logo (left)
    if (!config?.hideScbLogo) {
      try {
        const scbBase64 = await loadBase64Image("/api/logo/scb");
        doc.addImage(scbBase64, 'PNG', 18, 11.5, 14, 13);
      } catch (e) {
        console.warn("Retrying main SCB Logo URL direct load:", e);
        try {
          const scbBase64 = await loadBase64Image("https://neoschool.oss-ap-southeast-5.aliyuncs.com/scb/core/organizations/scb-logo-1710220971.png");
          doc.addImage(scbBase64, 'PNG', 18, 11.5, 14, 13);
        } catch (err2) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(16, 124, 65); // emerald green
          doc.text("SCB", 25, 19, { align: "center" });
        }
      }
    }
    
    // Center Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(config?.fpppTitleOverride || "FORMULIR PERMOHONAN PERSETUJUAN PEMBAYARAN", 105, 19.5, { align: "center" });
    
    // Load & draw BAZNAS Logo (right)
    if (!config?.hideBaznasLogo) {
      try {
        const baznasBase64 = await loadBase64Image("/api/logo/baznas");
        doc.addImage(baznasBase64, 'PNG', 177, 11, 16, 14);
      } catch (e) {
        console.warn("Retrying main BAZNAS Logo URL direct load:", e);
        try {
          const baznasBase64 = await loadBase64Image("https://baznas.go.id/assets/images/logo_baznas_mobile.png");
          doc.addImage(baznasBase64, 'PNG', 177, 11, 16, 14);
        } catch (err2) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(180, 140, 20); // gold
          doc.text("BAZNAS", 185, 19, { align: "center" });
        }
      }
    }

    // Restore drawing text color
    doc.setTextColor(15, 23, 42);

    // 2. PENGAJUAN SECTION
    // Y = 28 to 50 (height=22)
    doc.rect(15, 28, 180, 22);
    doc.line(27, 28, 27, 50);
    drawSidebarText("Pengajuan", 28, 22);
    
    // Inner rows for Pengajuan
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Tanggal", 29, 35);
    doc.text("Divisi", 29, 43);
    doc.text(":", 44, 35);
    doc.text(":", 44, 43);
    
    // Draw input boxes for value
    doc.rect(47, 31, 55, 6);
    doc.rect(47, 39, 55, 6);
    
    const submitDateStr = (!isEmpty && submission?.createdAt) 
      ? safeFormatDate(submission.createdAt, 'dd MMMM yyyy', { locale: id })
      : '';
    const submitDivisiStr = (!isEmpty && submission?.sumberRekening) ? `Divisi Keuangan ${submission.sumberRekening}` : '';
    
    doc.setFont("helvetica", "bold");
    doc.text(submitDateStr, 49, 35);
    doc.text(submitDivisiStr, 49, 43);
    doc.setFont("helvetica", "normal");

    // Heuristic checkboxes for right side of Pengajuan
    const isUangMuka = !isEmpty && submission?.type === 'uang_muka';
    const submissionTitleLower = (submission?.title || '').toLowerCase();
    const submissionDescLower = (submission?.description || '').toLowerCase();
    
    const isRutin = !isEmpty && (submissionTitleLower.includes('rutin') || submissionDescLower.includes('rutin'));
    const isAset = !isEmpty && (submissionTitleLower.includes('aset') || submissionDescLower.includes('aset') || submissionTitleLower.includes('beli') || submissionDescLower.includes('beli'));
    const isNonRutin = !isEmpty && !isUangMuka && !isRutin && !isAset;

    // Checklist boxes
    const drawCheckbox = (x: number, y: number, checked: boolean, label: string) => {
      doc.rect(x, y, 4, 4);
      if (checked) {
        doc.setFont("helvetica", "bold");
        doc.text("X", x + 1, y + 3.2);
        doc.setFont("helvetica", "normal");
      }
      doc.text(label, x + 6, y + 3.2);
    };
    
    drawCheckbox(110, 31, isRutin, "Biaya Rutin");
    drawCheckbox(110, 39, isNonRutin, "Biaya Non Rutin");
    drawCheckbox(150, 31, isUangMuka, "Uang Muka");
    drawCheckbox(150, 39, isAset, "Pembelian Aset");

    // 3. INFORMASI FORM SECTION
    // Y = 50 to 114 (height=64)
    doc.rect(15, 50, 180, 64);
    doc.line(27, 50, 27, 114);
    drawSidebarText("Informasi Form", 50, 64);
    
    // Rows
    doc.text("Jenis Pembayaran", 29, 56);
    doc.text(":", 60, 56);
    
    const isTunai = !isEmpty && (submission?.sumberRekening?.toLowerCase().includes('tunai') || submissionTitleLower.includes('tunai') || submissionDescLower.includes('tunai'));
    const isTransfer = !isEmpty && !isTunai;
    
    drawCheckbox(65, 53, isTransfer, "Transfer");
    drawCheckbox(115, 53, isTunai, "Tunai");
    
    doc.text("Nama Bank", 29, 63);
    doc.text(":", 60, 63);
    doc.rect(65, 59.5, 125, 5.5);
    
    doc.text("Nama Rekening", 29, 70);
    doc.text(":", 60, 70);
    doc.rect(65, 66.5, 125, 5.5);
    
    doc.text("Nomor Rekening Tujuan", 29, 77);
    doc.text(":", 60, 77);
    doc.rect(65, 73.5, 125, 5.5);
    
    doc.text("Jumlah", 29, 84);
    doc.text(":", 60, 84);
    doc.rect(65, 80.5, 125, 5.5);
    
    doc.text("Terbilang", 29, 91);
    doc.text(":", 60, 91);
    doc.rect(65, 87.5, 123, 5.5);
    
    doc.text("Untuk Pembayaran", 29, 98);
    doc.text(":", 60, 98);
    doc.rect(65, 94.5, 123, 14);

    if (!isEmpty && submission) {
      doc.setFont("helvetica", "bold");
      
      // Parse Bank account info if found or default to "Transfer Bank" if transfer
      let bankName = config?.bankName || "BANK SYARIAH INDONESIA (BSI)";
      let norek = "-";
      let atasNama = submission.picName || "Bendahara SCB";
      
      if (submission.sumberRekening) {
        if (submission.sumberRekening.includes('SMA')) {
          atasNama = "SCB SMA BANTUAN BAZNAS";
        } else {
          atasNama = "SCB SMP BANTUAN BAZNAS";
        }
      }

      doc.text(bankName, 67, 63.5);
      doc.text(atasNama, 67, 70.5);
      doc.text(norek, 67, 77.5);
      
      const amountVal = isNaN(Number(submission.amount)) ? 0 : Number(submission.amount);
      const formattedAmount = `Rp ${amountVal.toLocaleString('id-ID')},-`;
      doc.text(formattedAmount, 67, 84.5);
      
      const textTerbilang = terbilang(amountVal);
      doc.setFontSize(8);
      const splitTerbilang = doc.splitTextToSize(textTerbilang, 120);
      doc.text(splitTerbilang, 67, 91);
      
      doc.setFontSize(9);
      const splitFor = doc.splitTextToSize(submission.title || '', 120);
      doc.text(splitFor, 67, 98.5);
      
      doc.setFont("helvetica", "normal");
    }

    // 4. DETAIL LAMPIRAN SECTION
    // Y = 114 to 152 (height=38)
    doc.rect(15, 114, 180, 38);
    doc.line(27, 114, 27, 152);
    drawSidebarText("Detail Lampiran", 114, 38);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Dokumen Pendukung / Lampiran : *)", 29, 119);
    doc.setFont("helvetica", "normal");
    
    // Attachments heuristic lists
    const matchDesc = (regex: RegExp) => !isEmpty && submission && (regex.test(submissionTitleLower) || regex.test(submissionDescLower));
    
    const isInvoice = matchDesc(/invoice|faktur|tagihan/);
    const isFakturPajak = matchDesc(/pajak|tax|pph|ppn/);
    const isKwitansi = true; // default checklist is typical
    const isProposal = matchDesc(/proposal|kegiatan|acara/);
    const isMemo = matchDesc(/memo|nota dinas|nodin/);
    const isPerdin = matchDesc(/perdin|perjalanan dinas|transport/);
    const isPenawaran = matchDesc(/penawaran|quotation|vendor/);
    const isFPBJ = matchDesc(/fpbj|pengadaan/);
    const isGoodsRec = matchDesc(/penerimaan|sj|surat jalan|bast/);
    const isSwitchAnggaran = matchDesc(/switch|geser|revisi/);

    // Column offsets
    // Col A: X=29, Col B=68, Col C=107
    drawCheckbox(29, 122, isInvoice, "Invoice");
    drawCheckbox(29, 128, isFakturPajak, "Faktur Pajak");
    drawCheckbox(29, 134, isKwitansi, "Kwitansi");
    drawCheckbox(29, 140, isProposal, "Proposal Kegiatan");
    
    drawCheckbox(68, 122, isMemo, "Internal Memo");
    drawCheckbox(68, 128, isPerdin, "Form Perdin");
    drawCheckbox(68, 134, isPenawaran, "Form Penawaran");
    drawCheckbox(68, 140, isFPBJ, "FPBJ");
    
    drawCheckbox(107, 122, isGoodsRec, "Bukti Terima Barang");
    drawCheckbox(107, 128, isSwitchAnggaran, "Switch Anggaran");
    drawCheckbox(107, 134, false, ".............................");
    drawCheckbox(107, 140, false, ".............................");

    // Right Budget Box inside Detail Lampiran
    // Bounds X=148 to 192 (width 44), Y=116 to 148 (height 32)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(148, 116, 44, 32, "FD");
    
    const isBudgeted = !isEmpty && submission?.kodeBudget;
    drawCheckbox(150, 118, !!isBudgeted, "Budgeted");
    drawCheckbox(172, 118, !isBudgeted && !isEmpty, "Non-Budgeted");
    
    doc.setFontSize(8);
    doc.text("Kode Budget", 150, 127);
    doc.text("Nama Budget", 150, 134);
    doc.text("Saldo Budget", 150, 141);
    
    doc.text(":", 169, 127);
    doc.text(":", 169, 134);
    doc.text(":", 169, 141);

    if (!isEmpty && submission) {
      doc.setFont("helvetica", "bold");
      doc.text(submission.kodeBudget || "-", 171, 127);
      doc.text(config?.budgetName || "Anggaran SCB BAZNAS", 171, 134);
      doc.text(config?.budgetSaldo || "Sesuai RKAT", 171, 141);
      doc.setFont("helvetica", "normal");
    }

    // 5. KOLOM PEMOHON SECTION
    // Y = 152 to 184 (height=32)
    doc.rect(15, 152, 180, 32);
    doc.line(27, 152, 27, 184);
    drawSidebarText("Kolom Pemohon", 152, 32);
    
    // Table structure inside Kolom Pemohon
    doc.line(105, 152, 105, 184); // Split Kolom Pemohon & Catatan
    doc.line(27, 158, 105, 158);  // Horizontal line under headers
    doc.line(66, 152, 66, 184);   // Split Dibuat oleh & Disetujui oleh
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Dibuat oleh,", 46.5, 156, { align: 'center' });
    doc.text("Disetujui oleh,", 85.5, 156, { align: 'center' });
    
    doc.text("Catatan :", 107, 156);
    doc.setFont("helvetica", "normal");

    doc.setFontSize(8);
    
    // Left side: PIC Name
    const creatorName = (!isEmpty && submission?.picName) ? submission.picName : "Nama PIC";
    doc.text(creatorName, 46.5, 178, { align: 'center' });
    if (creatorName) doc.line(32, 179, 61, 179);
    
    // Right side: Head Dept
    const headDeptVal = (!isEmpty && config?.headDeptName) ? config.headDeptName : "Ust Siswadi";
    doc.text(headDeptVal, 85.5, 178, { align: 'center' });
    doc.line(71, 179, 100, 179);

    // Fill in the notes/description in Notes section
    if (!isEmpty && submission) {
      const splitNote = doc.splitTextToSize(submission.description || "Tidak ada catatan.", 84);
      doc.text(splitNote, 107, 161);

      // Draw standard digital stamp for Created by
      doc.saveGraphicsState();
      doc.setFont("courier", "bolditalic");
      doc.setFontSize(6.5);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.rect(34, 160, 26, 10);
      doc.text("MONETA SYSTEM", 35, 164);
      doc.text("DIGITALLY SIGNED", 35, 168);
      doc.restoreGraphicsState();
    }

    // 6. PERSETUJUAN PROSES PEMBAYARAN SECTION
    // Y = 184 to 238 (height=54)
    doc.rect(15, 184, 180, 54);
    doc.line(27, 184, 27, 238);
    drawSidebarText("Persetujuan Proses Pembayaran", 184, 54);
    
    // Structure
    doc.line(66, 184, 66, 238); // Vertical divider
    doc.line(27, 190, 195, 190); // Headers divider
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Persetujuan", 46.5, 188, { align: 'center' });
    doc.text("Catatan", 120, 188, { align: 'center' });
    
    // Rows division
    doc.line(27, 205, 195, 205); // Row 1 divider (Verifikator)
    doc.line(27, 220, 195, 220); // Row 2 divider (Manager Operasional)

    // Label names for rows
    doc.setFont("helvetica", "bold");
    doc.text("Verifikator", 46.5, 199, { align: 'center' });
    doc.text("Manager Operasional", 46.5, 214, { align: 'center' });
    doc.text("Kepala SCB", 46.5, 229, { align: 'center' });
    doc.setFont("helvetica", "normal");

    // Signatures injection
    if (!isEmpty) {
      // 1A. Verifikator (Akuntan SCB) signature
      const akuntanSignData = config?.useDefaultAkuntanSign ? config?.akuntanDefaultSign : null;
      if (akuntanSignData) {
        try {
          doc.addImage(akuntanSignData, 'PNG', 75, 192, 32, 11);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Ttd digital: ${config?.verifikatorName || "Akuntan SCB"}`, 115, 196);
          doc.setFont("helvetica", "normal");
          const signDate = safeFormatDate(new Date(), 'dd/MM/yyyy HH:mm');
          doc.text(`Waktu: ${signDate}`, 115, 200);
        } catch (err) {
          console.error("Error drawing Akuntan verifikator signature:", err);
          doc.text(`Verified (${config?.verifikatorName || "Akuntan SCB"})`, 75, 198);
        }
      }

      // 1B. Manager Operasional signature
      const roniSignData = (submission?.signatures?.roni?.signature) || (config?.useDefaultRoniSign ? config?.roniDefaultSign : null);
      if (roniSignData) {
        try {
          doc.addImage(roniSignData, 'PNG', 75, 207, 32, 11);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Otorisasi digital: ${config?.managerName || "M. Roni"}`, 115, 212);
          doc.setFont("helvetica", "normal");
          const roniDate = (submission?.signatures?.roni?.timestamp)
            ? safeFormatDate(submission.signatures.roni.timestamp, 'dd/MM/yyyy HH:mm')
            : safeFormatDate(new Date(), 'dd/MM/yyyy HH:mm');
          doc.text(`Waktu: ${roniDate}`, 115, 216);
        } catch (err) {
          console.error("Error drawing Roni manager signature:", err);
          doc.text(`Approved (${config?.managerName || "M. Roni"})`, 75, 214);
        }
      }

      // 2. Kepala SCB signature
      const kamalSignData = (submission?.signatures?.kamal?.signature) || (config?.useDefaultKamalSign ? config?.kamalDefaultSign : null);
      if (kamalSignData) {
        try {
          doc.addImage(kamalSignData, 'PNG', 75, 222, 32, 11);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Disetujui: ${config?.kepalaName || "Ahmad Kamal"} (Kepala)`, 115, 227);
          doc.setFont("helvetica", "normal");
          const kamalDate = (submission?.signatures?.kamal?.timestamp)
            ? safeFormatDate(submission.signatures.kamal.timestamp, 'dd/MM/yyyy HH:mm')
            : safeFormatDate(new Date(), 'dd/MM/yyyy HH:mm');
          doc.text(`Waktu: ${kamalDate}`, 115, 231);
        } catch (err) {
          console.error("Error drawing Kamal signature:", err);
          doc.text(`Approved (${config?.kepalaName || "Ahmad Kamal"})`, 75, 229);
        }
      }
    }

    // 7. PEMBAYARAN SECTION
    // Y = 238 to 260 (height=22)
    doc.rect(15, 238, 180, 22);
    doc.line(27, 238, 27, 260);
    drawSidebarText("Pembayaran", 238, 22);
    
    doc.line(105, 238, 105, 260); // Split left / right
    
    // Left: No. Dokumen and Tanggal Bayar
    doc.setFontSize(9);
    doc.text("No. Dokumen", 29, 246);
    doc.text("Tanggal Bayar", 29, 254);
    doc.text(":", 51, 246);
    doc.text(":", 51, 254);
    
    doc.rect(54, 242.5, 47, 5);
    doc.rect(54, 250.5, 47, 5);

    const documentNo = (!isEmpty && submission?.noDokumen) ? submission.noDokumen : "";
    
    // Find the date of the "Sudah di transfer" stage for Tanggal Transaksi
    const docTferStage = (!isEmpty && submission?.history) ? submission.history.find((h: any) => h.stage && h.stage.toLowerCase().includes("sudah di transfer")) : null;
    
    let payDateStr = "";
    if (docTferStage && docTferStage.timestamp) {
        payDateStr = safeFormatDate(docTferStage.timestamp, 'dd MMMM yyyy', { locale: id });
    } else if (!isEmpty && submission?.bookedAt) {
        payDateStr = safeFormatDate(submission.bookedAt, 'dd MMMM yyyy', { locale: id });
    } else if (!isEmpty && submission?.updatedAt) {
        payDateStr = safeFormatDate(submission.updatedAt, 'dd MMMM yyyy', { locale: id });
    }

    doc.setFont("helvetica", "bold");
    doc.text(documentNo, 56, 246);
    doc.text(payDateStr, 56, 254);
    doc.setFont("helvetica", "normal");

    // Right: Kasir Box
    doc.line(105, 245, 195, 245); // Line separating Kasir header from sign block
    doc.text("Kasir", 150, 243, { align: 'center' });
    
    // Custom logic to always stamp Kasir section if it's already transferred or booked
    const kasirSignData = config?.kasirDefaultSign;
    const hasBeenTransferred = docTferStage || submission?.isBooked || (!isEmpty && config?.useDefaultKasirSign);
    
    if (hasBeenTransferred) {
        if (kasirSignData && config?.useDefaultKasirSign && !isEmpty) {
            try {
              doc.addImage(kasirSignData, 'PNG', 135, 246, 30, 9);
            } catch (err) {
              console.error("Error drawing Kasir signature:", err);
            }
        }
        
        // Red color for stamp
        doc.saveGraphicsState();
        doc.setDrawColor(220, 38, 38);
        doc.setTextColor(220, 38, 38);
        doc.setLineWidth(0.5);
        doc.rect(135, 246, 30, 8);
        doc.setFontSize(10);
        doc.setFont("courier", "bold");
        doc.text("LUNAS", 150, 251.5, { align: "center" });
        doc.restoreGraphicsState();

        // Print name underneath
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Nur Asiah", 150, 258, { align: 'center' });
        doc.setFont("helvetica", "normal");
    } else {
      doc.setFontSize(7);
      doc.text("(Tanda tangan Kasir di sini)", 150, 253, { align: 'center' });
    }

    // Footer note Y = 264
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.text("*) Disusun Sesuai Urutan Lampiran", 15, 266);
    
    // Save/export triggering filename
    const cleanTitle = (submission?.title || submission?.id || 'Doc').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = isEmpty 
      ? "Template_FPPP_Kosong_SCB.pdf" 
      : `FPPP_Pengajuan_${cleanTitle}.pdf`;
    
    doc.save(filename);
    toast.success("Dokumen FPPP berhasil diunduh!", { id: toastId });
  } catch (error: any) {
    console.error("Critical fail inside FPPP Generator:", error);
    toast.error("Gagal mengunduh FPPP: " + (error?.message || "Kesalahan Tidak Diketahui"), { id: toastId });
  }
}

