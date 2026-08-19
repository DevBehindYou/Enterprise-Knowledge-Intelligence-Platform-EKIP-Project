import JSZip from 'jszip';

/**
 * Extracts visible text from a .pptx file.
 *
 * @param {Buffer} buffer - The .pptx file content as a Buffer.
 *
 * A .pptx is a zip archive of XML parts; slide text lives in
 * `ppt/slides/slideN.xml` inside `<a:t>...</a:t>` runs. This avoids pulling in
 * a full DOCX/OOXML-object-model library for what is, for RAG purposes, a
 * simple "give me the text" job — a lightweight regex-based extraction over
 * the run elements is sufficient and keeps the dependency footprint small.
 * Speaker notes (`ppt/notesSlides/`) are intentionally excluded — only
 * on-slide text is indexed, matching what a reader of the deck would see.
 */
export async function extractPptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml/)[1]);
      const numB = Number(b.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('No slides found — is this a valid .pptx file?');
  }

  const slideTexts = [];
  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('string');
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
    slideTexts.push(runs.join(' '));
  }

  return {
    text: slideTexts.map((t, i) => `[Slide ${i + 1}]\n${t}`).join('\n\n'),
    pageCount: slideFiles.length,
  };
}

function decodeXmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
