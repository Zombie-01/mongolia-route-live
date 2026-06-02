import { jsPDF } from "jspdf";

type PdfField = { label: string; value: string; type?: "text" | "image" | "section"; alt?: string };

type UserInfoPdfProps = {
  title: string;
  filename: string;
  lines: PdfField[];
  notes?: string;
};

async function fetchDataUrl(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
}

async function getImageDimensions(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function downloadUserInfoPdf({ title, filename, lines, notes }: UserInfoPdfProps) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const left = 40;
  const contentWidth = 520;
  let y = 60;

  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(title, left, y);

  y += 28;
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(left, y, left + contentWidth, y);
  y += 18;

  const labelWidth = 140;
  const valueWidth = contentWidth - labelWidth;

  for (const line of lines) {
    if (line.type === "section") {
      y += 12;
      if (y > 730) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(line.label, left, y);
      y += 18;
      doc.setDrawColor(220);
      doc.setLineWidth(0.5);
      doc.line(left, y, left + contentWidth, y);
      y += 16;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      continue;
    }

    if (line.type === "image") {
      if (!line.value) continue;
      y += 6;
      if (y > 730) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.setFont("helvetica", "bold");
      doc.text(line.label, left, y);
      y += 14;
      const dataUrl = await fetchDataUrl(line.value);
      if (dataUrl) {
        try {
          const dims = await getImageDimensions(dataUrl);
          const maxW = 240;
          const maxH = 180;
          const ratio = Math.min(maxW / dims.width, maxH / dims.height, 1);
          const imgW = dims.width * ratio;
          const imgH = dims.height * ratio;
          if (y + imgH > 760) {
            doc.addPage();
            y = 60;
          }
          doc.addImage(dataUrl, left, y, imgW, imgH);
          y += imgH + 16;
        } catch (e) {
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text("(Зураг байрлуулах боломжгүй)", left, y);
          y += 16;
        }
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("(Зураг авах боломжгүй)", left, y);
        y += 16;
      }
      continue;
    }

    const label = `${line.label}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, left, y);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(line.value || "-", valueWidth);
    doc.text(split, left + labelWidth, y);
    y += Math.max(20, split.length * 14);
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
  }

  if (notes) {
    y += 10;
    if (y > 730) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(notes, contentWidth);
    doc.text(split, left, y);
  }

  doc.save(filename);
}
