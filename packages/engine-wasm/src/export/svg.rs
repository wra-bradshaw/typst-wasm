use typst_layout::PagedDocument;
use typst_svg::SvgOptions;

use crate::exports::typst::engine::api::CompileFailure;
use crate::typst::engine::types::{CompileOptions, CompilePayload, TextPage};

pub fn export(
    document: &PagedDocument,
    options: &CompileOptions,
) -> Result<CompilePayload, CompileFailure> {
    let opts = SvgOptions {
        render_bleed: false,
        pretty: false,
    };

    let pages = super::selected_pages(document, options)?;

    let svg_pages: Vec<TextPage> = pages
        .iter()
        .map(|page| TextPage {
            page: page.number as u32,
            data: typst_svg::svg(page, &opts),
        })
        .collect();

    Ok(CompilePayload::Svg(svg_pages))
}
