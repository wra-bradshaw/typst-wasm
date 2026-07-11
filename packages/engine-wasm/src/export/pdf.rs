use typst_layout::PagedDocument;
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};

use crate::exports::typst::engine::api::CompileFailure;
use crate::typst::engine::types::{CompileOptions, CompilePayload, PdfStandard as WitStandard};

pub fn export(
    document: &PagedDocument,
    options: &CompileOptions,
) -> Result<CompilePayload, CompileFailure> {
    let pdf_options = bundle_pdf_options(options)?;
    let bytes = typst_pdf::pdf(document, &pdf_options)
        .map_err(|diags| super::diags_to_failure(diags, "PDF export failed"))?;
    Ok(CompilePayload::Pdf(bytes))
}

pub fn bundle_pdf_options(options: &CompileOptions) -> Result<PdfOptions, CompileFailure> {
    let standards = options
        .pdf_standards
        .as_ref()
        .map(|list| {
            let pdf_standards: Vec<PdfStandard> =
                list.iter().filter_map(map_wit_standard).collect();
            PdfStandards::new(&pdf_standards).unwrap_or_default()
        })
        .unwrap_or_default();

    let page_ranges = options
        .pages
        .as_deref()
        .map(parse_page_ranges)
        .transpose()?;

    let tagged = page_ranges.is_none();

    Ok(PdfOptions {
        ident: typst::foundations::Smart::Auto,
        creator: typst::foundations::Smart::Auto,
        timestamp: None,
        page_ranges,
        standards,
        tagged,
        pretty: false,
    })
}

fn map_wit_standard(std: &WitStandard) -> Option<PdfStandard> {
    match std {
        WitStandard::V17 => Some(PdfStandard::V_1_7),
        WitStandard::A2b => Some(PdfStandard::A_2b),
        WitStandard::A3b => Some(PdfStandard::A_3b),
    }
}

fn parse_page_ranges(input: &str) -> Result<typst::layout::PageRanges, CompileFailure> {
    use std::num::NonZeroUsize;

    let ranges = crate::export::parse_page_ranges(input)?
        .into_iter()
        .map(|range| match range {
            crate::export::PageRange::Exact(page) => {
                let page = NonZeroUsize::new(page).expect("validated page number");
                Some(page)..=Some(page)
            }
            crate::export::PageRange::From(page) => {
                Some(NonZeroUsize::new(page).expect("validated page number"))..=None
            }
            crate::export::PageRange::To(page) => {
                None..=Some(NonZeroUsize::new(page).expect("validated page number"))
            }
            crate::export::PageRange::Between(start, end) => {
                Some(NonZeroUsize::new(start).expect("validated page number"))
                    ..=Some(NonZeroUsize::new(end).expect("validated page number"))
            }
        })
        .collect();

    Ok(typst::layout::PageRanges::new(ranges))
}
