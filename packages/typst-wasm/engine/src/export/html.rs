use typst_html::HtmlDocument;

use crate::exports::typst::engine::api::CompileFailure;
use crate::typst::engine::types::{CompileOptions, CompilePayload};

pub fn export(
    document: &HtmlDocument,
    options: &CompileOptions,
) -> Result<CompilePayload, CompileFailure> {
    let _ = options;

    let html_opts = typst_html::HtmlOptions { pretty: false };

    let html_str = typst_html::html(document, &html_opts)
        .map_err(|diags| super::diags_to_failure(diags, "HTML export failed"))?;

    Ok(CompilePayload::Html(html_str))
}
