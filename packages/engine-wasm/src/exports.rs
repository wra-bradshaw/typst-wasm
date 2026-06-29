use typst::diag::{SourceDiagnostic, Warned};
use typst::foundations::{Dict, Str, Value};
use typst::layout::PageRanges;
use typst::utils::LazyHash;
use typst::{Library, LibraryExt};
use typst_html::{HtmlDocument, HtmlOptions};
use typst_layout::{Page, PagedDocument};
use typst_render::RenderOptions;
use typst_svg::SvgOptions;

use crate::compiler::TypstCompiler;
use crate::diagnostics::{WasmDiagnostic, format_diagnostics};
use crate::types::{BundleFile, CompileOptions, CompileOutput, PageOutput};

pub(crate) enum ExportFormat {
    Pdf,
    Png,
    Svg,
}

impl TypstCompiler {
    pub(crate) fn configure_library(&mut self, options: &CompileOptions) {
        let mut builder = Library::builder();

        if let Some(inputs) = options.inputs.as_ref() {
            let mut dict = Dict::new();
            for (key, value) in inputs {
                dict.insert(
                    Str::from(key.as_str()),
                    Value::Str(Str::from(value.as_str())),
                );
            }
            builder = builder.with_inputs(dict);
        }

        self.library = LazyHash::new(builder.build());
    }

    pub(crate) fn compile_paged(
        &self,
        options: CompileOptions,
        format: ExportFormat,
    ) -> Result<CompileOutput, String> {
        let result: Warned<Result<PagedDocument, _>> = typst::compile(self);
        let diagnostics = format_diagnostics(self, &result);

        match result.output {
            Ok(document) => match format {
                ExportFormat::Pdf => self.export_pdf(&document, options, diagnostics),
                ExportFormat::Png => self.export_png(&document, options, diagnostics),
                ExportFormat::Svg => self.export_svg(&document, options, diagnostics),
            },
            Err(_) => Ok(CompileOutput::failed(format.name(), diagnostics)),
        }
    }

    pub(crate) fn compile_html(&self) -> Result<CompileOutput, String> {
        let result: Warned<Result<HtmlDocument, _>> = typst::compile(self);
        let diagnostics = format_diagnostics(self, &result);

        match result.output {
            Ok(document) => Ok(CompileOutput {
                success: true,
                format: "html".to_string(),
                output_text: Some(html(&document)?),
                output_bytes: None,
                pages: Vec::new(),
                files: Vec::new(),
                diagnostics,
                internal_error: None,
                deps: None,
                timings: None,
            }),
            Err(_) => Ok(CompileOutput::failed("html", diagnostics)),
        }
    }

    pub(crate) fn compile_bundle(&self) -> Result<CompileOutput, String> {
        let result: Warned<Result<HtmlDocument, _>> = typst::compile(self);
        let diagnostics = format_diagnostics(self, &result);

        match result.output {
            Ok(document) => Ok(CompileOutput {
                success: true,
                format: "bundle".to_string(),
                output_text: None,
                output_bytes: None,
                pages: Vec::new(),
                files: vec![BundleFile {
                    path: "index.html".to_string(),
                    data: html(&document)?.into_bytes(),
                    media_type: Some("text/html; charset=utf-8".to_string()),
                }],
                diagnostics,
                internal_error: None,
                deps: None,
                timings: None,
            }),
            Err(_) => Ok(CompileOutput::failed("bundle", diagnostics)),
        }
    }

    fn export_pdf(
        &self,
        document: &PagedDocument,
        options: CompileOptions,
        diagnostics: Vec<WasmDiagnostic>,
    ) -> Result<CompileOutput, String> {
        let pdf_options = typst_pdf::PdfOptions {
            page_ranges: parse_page_ranges(options.pages.as_deref()),
            standards: parse_pdf_standards(options.pdf_standards.as_deref())?,
            ..Default::default()
        };
        let bytes = typst_pdf::pdf(document, &pdf_options).map_err(format_export_errors)?;

        Ok(CompileOutput {
            success: true,
            format: "pdf".to_string(),
            output_text: None,
            output_bytes: Some(bytes),
            pages: Vec::new(),
            files: Vec::new(),
            diagnostics,
            internal_error: None,
            deps: None,
            timings: None,
        })
    }

    fn export_png(
        &self,
        document: &PagedDocument,
        options: CompileOptions,
        diagnostics: Vec<WasmDiagnostic>,
    ) -> Result<CompileOutput, String> {
        let pixel_per_pt = options.ppi.unwrap_or(144.0) / 72.0;
        let render_options = RenderOptions {
            pixel_per_pt: typst::utils::Scalar::new(pixel_per_pt.into()),
            ..Default::default()
        };
        let pages = selected_pages(document, options.pages.as_deref())
            .into_iter()
            .map(|(page_number, page)| {
                let data = typst_render::render(page, &render_options)
                    .encode_png()
                    .map_err(|err| err.to_string())?;
                Ok(PageOutput {
                    page: page_number,
                    output_text: None,
                    output_bytes: Some(data),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;

        Ok(CompileOutput {
            success: true,
            format: "png".to_string(),
            output_text: None,
            output_bytes: None,
            pages,
            files: Vec::new(),
            diagnostics,
            internal_error: None,
            deps: None,
            timings: None,
        })
    }

    fn export_svg(
        &self,
        document: &PagedDocument,
        options: CompileOptions,
        diagnostics: Vec<WasmDiagnostic>,
    ) -> Result<CompileOutput, String> {
        let svg_options = SvgOptions::default();
        let pages = selected_pages(document, options.pages.as_deref())
            .into_iter()
            .map(|(page_number, page)| PageOutput {
                page: page_number,
                output_text: Some(typst_svg::svg(page, &svg_options)),
                output_bytes: None,
            })
            .collect();

        Ok(CompileOutput {
            success: true,
            format: "svg".to_string(),
            output_text: None,
            output_bytes: None,
            pages,
            files: Vec::new(),
            diagnostics,
            internal_error: None,
            deps: None,
            timings: None,
        })
    }
}

impl ExportFormat {
    fn name(&self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Png => "png",
            Self::Svg => "svg",
        }
    }
}

fn html(document: &HtmlDocument) -> Result<String, String> {
    typst_html::html(document, &HtmlOptions::default()).map_err(format_export_errors)
}

fn format_export_errors(errors: impl IntoIterator<Item = SourceDiagnostic>) -> String {
    errors
        .into_iter()
        .map(|error| error.message.to_string())
        .collect::<Vec<_>>()
        .join("\n")
}

fn parse_pdf_standards(standards: Option<&[String]>) -> Result<typst_pdf::PdfStandards, String> {
    let Some(standards) = standards else {
        return Ok(Default::default());
    };

    let parsed = standards
        .iter()
        .map(|standard| match standard.as_str() {
            "1.7" => Ok(typst_pdf::PdfStandard::V_1_7),
            "a-2b" | "A-2b" | "A-2B" => Ok(typst_pdf::PdfStandard::A_2b),
            "a-3b" | "A-3b" | "A-3B" => Ok(typst_pdf::PdfStandard::A_3b),
            other => Err(format!("Unsupported PDF standard: {}", other)),
        })
        .collect::<Result<Vec<_>, _>>()?;

    typst_pdf::PdfStandards::new(&parsed).map_err(|err| err.message().to_string())
}

fn parse_page_ranges(pages: Option<&str>) -> Option<PageRanges> {
    let pages = pages?;
    let mut ranges = Vec::new();

    for part in pages
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
    {
        let (start, end) = if let Some((start, end)) = part.split_once('-') {
            (parse_page_bound(start), parse_page_bound(end))
        } else {
            let page = parse_page_bound(part);
            (page, page)
        };
        ranges.push(start..=end);
    }

    Some(PageRanges::new(ranges))
}

fn parse_page_bound(value: &str) -> Option<std::num::NonZeroUsize> {
    if value.is_empty() {
        return None;
    }

    value.parse::<std::num::NonZeroUsize>().ok()
}

fn selected_pages<'a>(document: &'a PagedDocument, pages: Option<&str>) -> Vec<(usize, &'a Page)> {
    let ranges = parse_page_ranges(pages);

    document
        .pages()
        .iter()
        .enumerate()
        .filter_map(|(index, page)| {
            let page_number = index + 1;
            let include = ranges
                .as_ref()
                .map(|ranges| ranges.includes_page_index(index))
                .unwrap_or(true);
            include.then_some((page_number, page))
        })
        .collect()
}
