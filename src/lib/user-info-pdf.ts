import { jsPDF } from "jspdf";

type PdfField = { label: string; value: string; type?: "text" | "image"; alt?: string };

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

export async function downloadUserInfoPdf({ title, filename, lines, notes }: UserInfoPdfProps) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const left = 40;
  let y = 60;

  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(title, left, y);

  y += 26;
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);

  // Render text fields first in clean two-column style
  const textLines = lines.filter((l) => l.type !== "image");
  for (const line of textLines) {
    const label = `${line.label}: `;
    doc.setFont(undefined, "bold");
    doc.text(label, left, y);
    doc.setFont(undefined, "normal");
    const split = doc.splitTextToSize(line.value || "", 460);
    // position value slightly to the right of label
    const valueX = left + doc.getTextWidth(label) + 6;
    doc.text(split, valueX, y);
    y += Math.max(14, split.length * 14);
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
  }

  // Render images after text fields
  const imageLines = lines.filter((l) => l.type === "image" && l.value);
  if (imageLines.length > 0) {
    y += 8;
    for (const img of imageLines) {
      if (!img.value) continue;
      // small caption
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.setFont(undefined, "bold");
      doc.text(img.label, left, y);
      y += 12;
      const dataUrl = await fetchDataUrl(img.value);
      if (dataUrl) {
        // estimate fit: max width 220, max height 160
        const maxW = 220;
        const maxH = 160;
        // Add image; jsPDF accepts dataURL directly
        try {
          // place image and scale
          doc.addImage(dataUrl, left, y, maxW, maxH);
          y += maxH + 10;
        } catch (e) {
          // fallback: print URL text
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          const split = doc.splitTextToSize(img.value, 520);
          doc.text(split, left, y);
          y += split.length * 12 + 6;
        }
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("(Зураг авах боломжгүй)", left, y);
        y += 16;
      }

      if (y > 740) {
        doc.addPage();
        y = 60;
      }
    }
  }

  if (notes) {
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, "normal");
    const split = doc.splitTextToSize(notes, 520);
    doc.text(split, left, y);
  }

  doc.save(filename);
}
