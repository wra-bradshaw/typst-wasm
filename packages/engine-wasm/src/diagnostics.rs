use serde::{Deserialize, Serialize};
use tsify::Tsify;
use typst::diag::{Severity, SourceDiagnostic, Warned};
use typst::{World, WorldExt};

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct WasmDiagnostic {
    pub message: String,
    pub severity: String,
    pub file: Option<String>,
    pub line: Option<usize>,
    pub column: Option<usize>,
    pub start: Option<usize>,
    pub end: Option<usize>,
    pub formatted: String,
    pub hints: Vec<String>,
    pub trace: Vec<String>,
}

impl WasmDiagnostic {
    fn from_source_diagnostic(diag: &SourceDiagnostic, world: &dyn World) -> Self {
        let mut line = None;
        let mut column = None;
        let mut start = None;
        let mut end = None;
        let mut file = None;

        if let Some(span) = diag.span.id() {
            if let Some(source) = world.source(span).ok()
                && let Some(range) = world.range(diag.span)
            {
                start = Some(range.start);
                end = Some(range.end);
                line = Some(source.lines().byte_to_line(range.start).unwrap_or(0) + 1);
                column = Some(source.lines().byte_to_column(range.start).unwrap_or(0) + 1);
            }
            file = Some(span.vpath().get_with_slash().to_string());
        }

        let severity = match diag.severity {
            Severity::Error => "error",
            Severity::Warning => "warning",
        };

        let hints: Vec<String> = diag.hints.iter().map(|h| h.v.to_string()).collect();

        let trace: Vec<String> = diag
            .trace
            .iter()
            .filter_map(|t| {
                let span = t.span;
                if let Some(file_id) = span.id()
                    && let Some(source) = world.source(file_id).ok()
                    && let Some(range) = world.range(span)
                {
                    let line_num = source.lines().byte_to_line(range.start).unwrap_or(0) + 1;
                    let file_name = file_id.vpath().get_with_slash().to_string();
                    return Some(format!("{} ({}:{})", t.v, file_name, line_num));
                }
                None
            })
            .collect();

        let formatted = format_single_diagnostic(world, diag);

        Self {
            message: diag.message.to_string(),
            severity: severity.to_string(),
            file,
            line,
            column,
            start,
            end,
            formatted,
            hints,
            trace,
        }
    }
}

pub fn format_diagnostics<T>(
    world: &dyn World,
    result: &Warned<Result<T, typst::ecow::EcoVec<SourceDiagnostic>>>,
) -> Vec<WasmDiagnostic> {
    let mut diagnostics = Vec::new();

    for warning in &result.warnings {
        diagnostics.push(WasmDiagnostic::from_source_diagnostic(warning, world));
    }

    if let Err(errors) = &result.output {
        for error in errors {
            diagnostics.push(WasmDiagnostic::from_source_diagnostic(error, world));
        }
    }

    diagnostics
}

fn format_single_diagnostic(world: &dyn World, diag: &SourceDiagnostic) -> String {
    let severity = match diag.severity {
        Severity::Error => "ERROR",
        Severity::Warning => "WARNING",
    };

    let mut lines = vec![format!("{}: {}", severity, diag.message)];

    if let Some((file, line_num, col, source_text, highlight_len)) = extract_location(world, diag) {
        lines.push(format!("  --> {}:{}:{}", file, line_num, col));
        lines.push("   |".to_string());
        lines.push(format!("{:>3} | {}", line_num, source_text));

        let padding = " ".repeat(3 + 3 + col.saturating_sub(1));
        let underline = "^".repeat(highlight_len.max(1));
        lines.push(format!("{}| {}{}", "   ", padding, underline));

        lines.push("   |".to_string());
    }

    for hint in &diag.hints {
        lines.push(format!("   = hint: {}", hint.v));
    }

    if !diag.trace.is_empty() {
        lines.push("   = trace:".to_string());
        for (i, trace) in diag.trace.iter().enumerate() {
            let span = trace.span;
            if let Some((file, line)) = span_to_location(world, span) {
                lines.push(format!("       {}. {} ({}:{})", i + 1, trace.v, file, line));
            }
        }
    }

    lines.join("\n")
}

fn extract_location(
    world: &dyn World,
    diag: &SourceDiagnostic,
) -> Option<(String, usize, usize, String, usize)> {
    let file_id = diag.span.id()?;
    let source = world.source(file_id).ok()?;
    let range = world.range(diag.span)?;

    let line_idx = source.lines().byte_to_line(range.start)?;
    let line_num = line_idx + 1;
    let col = source.lines().byte_to_column(range.start)? + 1;
    let file = file_id.vpath().get_with_slash().to_string();

    let line_range = source.lines().line_to_range(line_idx)?;
    let line_text = source.text().get(line_range)?;

    let display_text = line_text.replace('\t', "    ");
    let tab_before = line_text[..col.saturating_sub(1)].matches('\t').count();
    let visual_col = col + (tab_before * 3);

    let len = range.end.saturating_sub(range.start);

    Some((file, line_num, visual_col, display_text, len))
}

fn span_to_location(world: &dyn World, span: typst::syntax::Span) -> Option<(String, usize)> {
    let file_id = span.id()?;
    let source = world.source(file_id).ok()?;
    let range = world.range(span)?;
    let line = source.lines().byte_to_line(range.start)? + 1;
    let file = file_id.vpath().get_with_slash().to_string();
    Some((file, line))
}
