import { jsPDF } from "jspdf";

type PdfField = { label: string; value: string };

type UserInfoPdfProps = {
  title: string;
  filename: string;
  lines: PdfField[];
  notes?: string;
};

export function downloadUserInfoPdf({ title, filename, lines, notes }: UserInfoPdfProps) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const left = 40;
  let y = 60;

  doc.setFontSize(18);
  doc.text(title, left, y);

  y += 30;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("PDF-д агуулагдах мэдээлэл:", left, y);

  y += 20;

  lines.forEach((line) => {
    const text = `${line.label}: ${line.value}`;
    const split = doc.splitTextToSize(text, 520);
    doc.text(split, left, y);
    y += split.length * 14;
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
  });

  if (notes) {
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const split = doc.splitTextToSize(notes, 520);
    doc.text(split, left, y);
  }

  doc.save(filename);
}
