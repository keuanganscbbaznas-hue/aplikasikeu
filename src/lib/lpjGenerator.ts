import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { SCB_LOGO_BASE64, BAZNAS_LOGO_BASE64 } from './logos';

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

// Safe date formatter
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

export async function generateLPJPDF(submission: any, config?: any) {
  const toastId = toast.loading("Menyiapkan dokumen LPJ (Form Fund Submission)...");
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set default font
    doc.setFont("helvetica", "normal");
    
    // Margins: Left=15, Right=195, Top=15
    
    // ----------------- 1. HEADER SECTION -----------------
    
    // Top-Left Box: No. Doc / Date
    doc.rect(15, 15, 45, 18);
    doc.line(37.5, 15, 37.5, 33); // Vertical divide
    doc.line(15, 21, 60, 21); // Horizontal divide
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("No. Doc", 26.25, 19, { align: "center" });
    doc.text("Date", 48.75, 19, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    const noDocLaporanStr = submission.noDokumenLaporan || '-';
    doc.setFontSize(noDocLaporanStr.length > 15 ? 5.5 : noDocLaporanStr.length > 10 ? 6.5 : 7.5);
    doc.text(noDocLaporanStr, 26.25, 27, { align: "center" });
    
    // Find transition timestamp for "Pencatatan Transaksi dan Penomeran Dokumen Laporan"
    let dateLaporanVal = null;
    if (submission.history && Array.isArray(submission.history)) {
      const targetHistory = submission.history.find((h: any) => 
        h.stage === "Pencatatan Transaksi dan Penomeran Dokumen Laporan" &&
        (h.status === 'approved' || h.status === 'submitted')
      );
      if (targetHistory && targetHistory.timestamp) {
        dateLaporanVal = targetHistory.timestamp;
      }
    }
    const payDateVal = dateLaporanVal || submission.bookedAt || submission.updatedAt || null;
    const dateBoxStr = payDateVal ? safeFormatDate(payDateVal, 'dd/MM/yy') : safeFormatDate(new Date(), 'dd/MM/yy');
    doc.text(dateBoxStr, 48.75, 27, { align: "center" });
    
    // SCB Logo (left of title)
    try {
      doc.addImage(SCB_LOGO_BASE64, 'PNG', 69, 14, 16, 15);
    } catch (err) {
      console.warn("SCB Logo failed to load:", err);
    }
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("FORM FUND SUBMISSION", 121, 23, { align: "center" });
    
    // BAZNAS Logo (right)
    try {
      doc.addImage(BAZNAS_LOGO_BASE64, 'PNG', 169, 13, 16, 15);
    } catch (e) {
      console.warn("Baznas Logo failed to load:", e);
    }
    
    // Restore styling
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    // Horizontal separator
    doc.setFontSize(8);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(15, 35, 195, 35);
    doc.setLineWidth(0.25);
    
    // ----------------- 2. CONTENT FIELDS SECTION -----------------
    
    let currentY = 42;
    const lineSpacing = 8.5;
    
    // PIC penanggungjawab
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PIC", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("penanggungjawab", 22, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(submission.picName || submission.submittedByName || '-', 58, currentY);
    
    // Right side box structure: No. Uang Muka and Date UM
    // Width = 65 (X=130 to 195), Height = 12
    doc.rect(130, 38, 65, 12);
    doc.line(130, 44, 195, 44); // Horizontal divisor
    doc.line(160, 38, 160, 50); // Vertical divisor
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("No. Uang Muka", 145, 42.2, { align: "center" });
    doc.text("Date UM", 145, 48.2, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    const umNoStr = submission.noDokumen || '-';
    // Trim if too long
    const umNoStrDisplay = umNoStr.length > 20 ? umNoStr.substring(0, 19) + '..' : umNoStr;
    doc.setFontSize(umNoStr.length > 15 ? 6.5 : 7.5);
    doc.text(umNoStrDisplay, 177.5, 42.2, { align: "center" });
    
    // Parse date from document number if it follows a format like UM.XX.190526
    let parsedUmDateStr = null;
    const umNoCleaned = umNoStr.trim();
    // Check if it ends with dots containing 6 digits (ddmmyy) e.g. UM.01.190526
    const dateMatch = umNoCleaned.match(/\.(\d{2})(\d{2})(\d{2})$/);
    if (dateMatch) {
      const d = dateMatch[1];
      const m = dateMatch[2];
      const yStr = dateMatch[3];
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        parsedUmDateStr = `${d}/${m}/20${yStr}`;
      }
    }
    // Backup: check if there are 6 digits at the absolute end of the string
    if (!parsedUmDateStr) {
      const endDigitsMatch = umNoCleaned.match(/(\d{2})(\d{2})(\d{2})$/);
      if (endDigitsMatch) {
        const d = endDigitsMatch[1];
        const m = endDigitsMatch[2];
        const yStr = endDigitsMatch[3];
        const dayNum = parseInt(d, 10);
        const monthNum = parseInt(m, 10);
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          parsedUmDateStr = `${d}/${m}/20${yStr}`;
        }
      }
    }
    
    const umDateStr = parsedUmDateStr || (submission.createdAt ? safeFormatDate(submission.createdAt, 'dd/MM/yyyy') : '-');
    doc.setFontSize(7.5);
    doc.text(umDateStr, 177.5, 48.2, { align: "center" });
    
    currentY += lineSpacing;
    
    // Division bagian
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Division", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("bagian", 28, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(submission.divisi || '-', 58, currentY);
    
    // Dot lines for fields (replicating exact lines shown in standard templates)
    doc.setDrawColor(200, 200, 200);
    doc.line(58, currentY + 1.2, 125, currentY + 1.2);
    
    currentY += lineSpacing;
    
    // Fund req permohonan dana
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Fund req", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("permohonan dana", 30, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    doc.text("Rp.", 58, currentY);
    
    doc.setFont("helvetica", "normal");
    const amountVal = isNaN(Number(submission.amount)) ? 0 : Number(submission.amount);
    const amountFormatted = `${amountVal.toLocaleString('id-ID')},-`;
    doc.text(amountFormatted, 65, currentY);
    doc.line(58, currentY + 1.2, 195, currentY + 1.2);
    
    currentY += lineSpacing;
    
    // Use penggunaan dana
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Use", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("penggunaan dana", 22, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    doc.text("Rp.", 58, currentY);
    
    doc.setFont("helvetica", "normal");
    // If there is nominal permohonan laporan (the LPJ used fund amount), display it:
    const usedFundVal = submission.nominalPermohonanLaporan !== undefined 
      ? Number(submission.nominalPermohonanLaporan) 
      : (submission.amount - (submission.sisaDana || 0));
    
    const usedFundFormatted = `${usedFundVal.toLocaleString('id-ID')},-`;
    doc.text(usedFundFormatted, 65, currentY);
    
    // Also append the text usage description right next to it or offset
    const pengDanaText = submission.penggunaanDana ? `  (${submission.penggunaanDana})` : '';
    doc.setFontSize(8);
    doc.text(pengDanaText.length > 70 ? pengDanaText.substring(0, 68) + '...' : pengDanaText, 105, currentY);
    doc.setFontSize(10);
    doc.line(58, currentY + 1.2, 195, currentY + 1.2);
    
    currentY += lineSpacing;
    
    // Balancing sisa
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Balancing", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("sisa", 31, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    doc.text("Rp.", 58, currentY);
    
    doc.setFont("helvetica", "normal");
    const sisaDanaVal = Number(submission.sisaDana) || 0;
    const sisaDanaFormatted = `${sisaDanaVal.toLocaleString('id-ID')},-`;
    doc.text(sisaDanaFormatted, 65, currentY);
    doc.line(58, currentY + 1.2, 195, currentY + 1.2);
    
    currentY += lineSpacing;
    
    // Allocation peruntukan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Allocation", 15, currentY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("peruntukan", 32, currentY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(":", 55, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.text(submission.alokasiPeruntukan || '-', 58, currentY);
    doc.line(58, currentY + 1.2, 195, currentY + 1.2);
    
    // Double lines / Thick line separator for notes
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(15, 103, 195, 103);
    doc.setLineWidth(0.25);
    
    // ----------------- 3. NOTES BOX SECTION -----------------
    
    // Rectangle frame W=180, H=32, X=15, Y=108
    doc.rect(15, 108, 180, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Notes", 17, 113);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("catatan", 26, 113);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const mainComment = submission.description || '';
    const splitNotes = doc.splitTextToSize(mainComment, 174);
    doc.text(splitNotes, 17, 118);
    
    // ----------------- 4. FOOTER & SIGNATURE SECTION -----------------
    
    // 4 SIGNATURE BOXES: PIC, Head Dept, Verifikator, Cashier
    // Spacing starting from W=30 for each, GAP = 4.
    // X Positions: 63, 97, 131, 165. Width = 30. Height = 34.
    const sigX = [63, 97, 131, 165];
    const boxW = 30;
    const boxH = 34;
    const sigY = 146;
    
    const sigHeaders = ["PIC", "Head Dept", "Verifikator", "Cashier"];
    
    sigX.forEach((x, index) => {
      // Draw outer box
      doc.rect(x, sigY, boxW, boxH);
      
      // Header dividing line
      doc.line(x, sigY + 6, x + boxW, sigY + 6);
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(sigHeaders[index], x + (boxW / 2), sigY + 4.2, { align: "center" });
      
      // Footer dividing line
      doc.line(x, sigY + boxH - 6, x + boxW, sigY + boxH - 6);
    });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    
    // 1. PIC Sign
    const creatorName = submission.picName || submission.submittedByName || "-";
    const creatorNameTrim = creatorName.length > 18 ? creatorName.substring(0, 16) + '..' : creatorName;
    doc.text(creatorNameTrim, sigX[0] + (boxW / 2), sigY + boxH - 2, { align: "center" });
    
    if (submission.signatures?.pic?.signature) {
      try {
        doc.addImage(submission.signatures.pic.signature, 'PNG', sigX[0] + 3, sigY + 8, boxW - 6, boxH - 16);
      } catch (err) {
        console.warn("Error rendering PIC Signature:", err);
      }
    } else {
      // Print digital stamps
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text("Signed via", sigX[0] + (boxW / 2), sigY + 16, { align: "center" });
      doc.text("DIGITAL PORTAL", sigX[0] + (boxW / 2), sigY + 20, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    }
    
    // 2. Head Dept Sign
    let hdName = "Helmi Nursirwan";
    if (submission.divisi === 'Akademik/Kesiswaan') hdName = "Siswadi Dinianto";
    else if (submission.divisi === 'Operasional') hdName = "Mohamad Roni";
    
    const hdNameTrim = hdName.length > 18 ? hdName.substring(0, 16) + '..' : hdName;
    doc.text(hdNameTrim, sigX[1] + (boxW / 2), sigY + boxH - 2, { align: "center" });
    
    let headDeptSignData = submission.signatures?.headDept?.signature || null;
    if (!headDeptSignData && config) {
      if (submission.divisi === 'Asrama' && config.useDefaultAsramaSign) {
        headDeptSignData = config.asramaDefaultSign || null;
      } else if (submission.divisi === 'Akademik/Kesiswaan' && config.useDefaultAkademikSign) {
        headDeptSignData = config.akademikDefaultSign || null;
      } else if (submission.divisi === 'Operasional' && config.useDefaultOperasionalSign) {
        headDeptSignData = config.operasionalDefaultSign || null;
      }
    }
    
    if (headDeptSignData) {
      try {
        doc.addImage(headDeptSignData, 'PNG', sigX[1] + 3, sigY + 8, boxW - 6, boxH - 16);
      } catch (err) {
        console.warn("Error rendering Head Dept Signature:", err);
      }
    }
    
    // 3. Verifikator Sign (Akuntan)
    let accName = submission.signatures?.verifikator?.name || config?.verifikatorName || "Keuangan SCB";
    const accNameTrim = accName.length > 18 ? accName.substring(0, 16) + '..' : accName;
    doc.text(accNameTrim, sigX[2] + (boxW / 2), sigY + boxH - 2, { align: "center" });
    
    let accSignData = submission.signatures?.verifikator?.signature || null;
    if (!accSignData && config?.useDefaultAkuntanSign) {
      accSignData = config.akuntanDefaultSign || null;
    }
    
    // Or if transferred anyway, we can stamp as verified
    const isReadyForStamp = submission.isBooked || submission.currentStageIndex >= 4;
    if (accSignData) {
      try {
        doc.addImage(accSignData, 'PNG', sigX[2] + 3, sigY + 8, boxW - 6, boxH - 16);
      } catch (err) {
        console.warn("Error rendering Verifikator Signature:", err);
      }
    } else if (isReadyForStamp) {
      doc.saveGraphicsState();
      doc.setDrawColor(16, 185, 129);
      doc.setTextColor(16, 185, 129);
      doc.rect(sigX[2] + 4, sigY + 10, boxW - 8, 10);
      doc.setFontSize(6);
      doc.setFont("courier", "bold");
      doc.text("VERIFIED", sigX[2] + (boxW / 2), sigY + 16, { align: "center" });
      doc.restoreGraphicsState();
    }
    
    // 4. Cashier Sign
    let cashName = "Nur Asiah";
    doc.text(cashName, sigX[3] + (boxW / 2), sigY + boxH - 2, { align: "center" });
    
    const isTransferred = submission.isBooked || submission.currentStageIndex >= 4;
    const kasirSignData = config?.kasirDefaultSign;
    
    if (isTransferred) {
      if (kasirSignData && config?.useDefaultKasirSign) {
        try {
          doc.addImage(kasirSignData, 'PNG', sigX[3] + 3, sigY + 8, boxW - 6, boxH - 16);
        } catch (err) {
          console.warn("Error rendering Kasir Signature:", err);
        }
      }
      
      // Draw dynamic cherry-red "LUNAS" (PAID) ink stamp that cuts/overlaps to the right boundary of Cashier box
      doc.saveGraphicsState();
      doc.setDrawColor(220, 38, 38);
      doc.setTextColor(220, 38, 38);
      doc.setLineWidth(0.65);
      
      // Stamp location intersects the Cashier box's right boundary (X is 165 to 195)
      const stampX = sigX[3] + 11; 
      const stampY = sigY + 7;     
      const stampW = 28;
      const stampH = 13.5;
      
      // Double rectangular border stamp
      doc.rect(stampX, stampY, stampW, stampH);
      doc.rect(stampX + 0.6, stampY + 0.6, stampW - 1.2, stampH - 1.2);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text("LUNAS", stampX + (stampW / 2), stampY + 9.5, { align: "center" });
      
      doc.setFontSize(5.2);
      doc.text("KASIR BAZNAS SCB", stampX + (stampW / 2), stampY + 4.2, { align: "center" });
      
      doc.restoreGraphicsState();
    }
    
    // ----------------- EXPORT FILE -----------------
    const cleanId = (submission.id || 'doc').substring(0, 8);
    const filename = `LPJ_FundSubmission_${cleanId}.pdf`;
    doc.save(filename);
    
    toast.success("Dokumen LPJ berhasil diunduh!", { id: toastId });
  } catch (error: any) {
    console.error("Critical fail inside LPJ PDF Generator:", error);
    toast.error("Gagal mengunduh LPJ: " + (error?.message || "Kesalahan Tidak Diketahui"), { id: toastId });
  }
}
