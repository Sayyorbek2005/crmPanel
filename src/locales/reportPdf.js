// Canvas uses the browser's Unicode fonts so Russian and Uzbek text both render in PDF.
export function createReportPdf(lines) {
  const encoder = new TextEncoder();
  const objects = [null, null];
  const pageIds = [];
  for (let start = 0; start < lines.length; start += 34) {
    const canvas = document.createElement("canvas");
    canvas.width = 1190; canvas.height = 1684;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111827";
    lines.slice(start, start + 34).forEach((line, index) => {
      ctx.font = `${line.b ? "bold " : ""}${line.s * 2}px Arial, sans-serif`;
      ctx.fillText(line.t, 100, 100 + index * 40, 990);
    });
    const jpeg = Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.94).split(",")[1]), char => char.charCodeAt(0));
    const imageId = objects.push([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, encoder.encode("\nendstream"),
    ]);
    const commands = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    const contentId = objects.push(encoder.encode(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`));
    const pageId = objects.push(encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    pageIds.push(pageId);
  }
  objects[0] = encoder.encode("<< /Type /Catalog /Pages 2 0 R >>");
  objects[1] = encoder.encode(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const chunks = [encoder.encode("%PDF-1.4\n")], offsets = [];
  let length = chunks[0].length;
  const append = bytes => { chunks.push(bytes); length += bytes.length; };
  objects.forEach((object, index) => {
    offsets.push(length); append(encoder.encode(`${index + 1} 0 obj\n`));
    (Array.isArray(object) ? object : [object]).forEach(append);
    append(encoder.encode("\nendobj\n"));
  });
  const xref = length;
  append(encoder.encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => String(offset).padStart(10,"0") + " 00000 n \n").join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(chunks, { type: "application/pdf" });
}
