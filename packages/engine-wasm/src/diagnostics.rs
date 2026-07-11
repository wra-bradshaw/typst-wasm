use typst::diag::{Severity, SourceDiagnostic};
use typst::syntax::DiagSpanKind;
use typst::{World, WorldExt};

use crate::exports::typst::engine::api::{CompileFailure, OperationError};
use crate::typst::engine::types::{Diagnostic, DiagnosticSeverity};
use crate::world::CompileWorld;

pub fn simple_compile_failure(message: impl Into<String>) -> CompileFailure {
    let message = message.into();

    CompileFailure {
        diagnostics: vec![Diagnostic {
            message: message.clone(),
            severity: DiagnosticSeverity::Error,
            file: None,
            line: None,
            column: None,
            start: None,
            end: None,
            formatted: format!("error: {message}"),
            hints: Vec::new(),
            trace: Vec::new(),
        }],
        dependencies: Vec::new(),
        message: Some(message),
    }
}

pub fn operation_compile_failure(error: OperationError) -> CompileFailure {
    simple_compile_failure(match error {
        OperationError::InvalidPath(message) => message,
        OperationError::FontParseFailed => "failed to parse font".into(),
        OperationError::Other(message) => message,
    })
}

pub fn convert_typst_diagnostic(
    world: &CompileWorld,
    diagnostic: &SourceDiagnostic,
    severity: DiagnosticSeverity,
) -> Diagnostic {
    let file = file_for_span(world, diagnostic);
    let (line, column) = line_column_for_span(world, diagnostic);
    let (start, end) = range_for_span(world, diagnostic);

    let formatted = format!("{}", diagnostic.message);

    let hints = diagnostic.hints.iter().map(|h| h.v.to_string()).collect();

    let trace = diagnostic.trace.iter().map(|t| t.v.to_string()).collect();

    Diagnostic {
        message: diagnostic.message.to_string(),
        severity,
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

fn file_for_span(_world: &CompileWorld, diagnostic: &SourceDiagnostic) -> Option<String> {
    match diagnostic.span.get() {
        DiagSpanKind::Detached => None,
        DiagSpanKind::Number { id, .. } | DiagSpanKind::Range { id, .. } => {
            Some(crate::paths::file_id_path(id))
        }
    }
}

fn line_column_for_span(
    world: &CompileWorld,
    diagnostic: &SourceDiagnostic,
) -> (Option<u32>, Option<u32>) {
    let range = match world.range(diagnostic.span) {
        Some(r) => r,
        None => return (None, None),
    };

    let id = match diagnostic.span.get() {
        DiagSpanKind::Detached => return (None, None),
        DiagSpanKind::Number { id, .. } | DiagSpanKind::Range { id, .. } => id,
    };

    let source = match world.source(id) {
        Ok(s) => s,
        Err(_) => return (None, None),
    };

    let (line, col) = match source.lines().byte_to_line_column(range.start) {
        Some(v) => v,
        None => return (None, None),
    };

    (Some(line as u32 + 1), Some(col as u32 + 1))
}

fn range_for_span(
    world: &CompileWorld,
    diagnostic: &SourceDiagnostic,
) -> (Option<u32>, Option<u32>) {
    let range = match world.range(diagnostic.span) {
        Some(r) => r,
        None => return (None, None),
    };

    (Some(range.start as u32), Some(range.end as u32))
}

pub fn convert_severity(severity: Severity) -> DiagnosticSeverity {
    match severity {
        Severity::Error => DiagnosticSeverity::Error,
        Severity::Warning => DiagnosticSeverity::Warning,
    }
}
