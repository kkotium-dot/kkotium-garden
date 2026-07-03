// src/lib/studio/detail-assemble.ts
// ============================================================================
// SF-4a / SF-3b (#55 / #181 / #46 / #184) — PURE 860px detail-page assembly.
//
// Path (A) HTML assembly (SF4_DETAIL_EXPORT_SPEC §2, recommended #189): the board
// combines the assigned images (detail_images order) + the section copy text into
// a Naver-style 860px detailContent preview. The image/text HTML pattern mirrors
// the publish-time builder (api/naver/register/route.ts buildDetailContent):
// centered blocks, <img style="max-width:860px;width:100%">, text with <br/>.
//
// PERSISTENCE (SF-3b, zero new field): section copy is flattened to plain text and
// stored in the existing Product.description column (which the publish builder
// renders as the detailContent text block). detail_images stays a FLAT string[] of
// URLs (#184). The 860px HTML itself is DERIVED (preview only) — publish rebuilds
// it, so nothing new is stored. Publish-independent (#46).
//
// Korean literals are display copy (isolated here, #3-1). English comments only.
// ============================================================================

export interface AssembleSection {
  key: string;
  label: string;
  images: string[]; // assigned image URLs, in order
  copy: string;     // section copy text (headline + body, operator-editable)
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Plain-text copy for the Product.description column (SF-3b persistence). Sections
 * are joined in order, blank ones omitted (#82 — never emit empty blocks). This is
 * the text the publish builder renders (escaped, \n -> <br/>) inside detailContent.
 */
export function buildDetailCopyText(sections: { copy: string }[]): string {
  return sections
    .map((s) => s.copy.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

/**
 * PURE 860px preview HTML. Per section, in order: copy block (if any) then the
 * section's images. Returns '' when there is nothing to show.
 */
export function buildDetailPreviewHtml(sections: AssembleSection[]): string {
  const blocks: string[] = [];
  for (const s of sections) {
    const copy = s.copy.trim();
    if (copy) {
      blocks.push(
        `<div style="padding:14px 16px;font-size:14px;line-height:1.8;color:#333;text-align:center;">${esc(copy).replace(/\n/g, '<br/>')}</div>`,
      );
    }
    for (const url of s.images) {
      blocks.push(
        `<div style="text-align:center;"><img src="${esc(url)}" style="max-width:860px;width:100%;display:block;margin:0 auto;" alt="${esc(s.label)}"/></div>`,
      );
    }
  }
  return blocks.length ? blocks.join('\n') : '';
}
