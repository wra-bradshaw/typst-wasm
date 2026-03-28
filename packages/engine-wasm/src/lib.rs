use std::collections::HashMap;
use std::sync::RwLock;

use js_sys::Date;
use serde::{Deserialize, Serialize};
use tsify::Tsify;
use typst::diag::{FileError, FileResult, Severity, SourceDiagnostic, Warned, eco_format};
use typst::foundations::{Bytes, Datetime};
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};
use wasm_bindgen::prelude::*;

#[link(wasm_import_module = "bridge")]
unsafe extern "C" {
    fn host_fetch(path_ptr: *const u8, path_len: u32, result_len_ptr: *mut u32) -> *mut u8;
}

pub struct ResourceBridge;

impl ResourceBridge {
    pub fn request_file(path: &str) -> Result<Vec<u8>, String> {
        let bytes = path.as_bytes();
        let mut result_len: u32 = 0;

        let result_ptr = unsafe {
            host_fetch(
                bytes.as_ptr(),
                bytes.len() as u32,
                &mut result_len as *mut u32,
            )
        };

        if result_ptr.is_null() && result_len == 0 {
            return Err(format!("Host fetch failed for path: {}", path));
        }

        if result_ptr.is_null() {
            return Err(format!(
                "Host fetch returned null pointer for path: {}",
                path
            ));
        }

        let data = unsafe {
            Vec::from_raw_parts(result_ptr, result_len as usize, result_len as usize)
        };
        Ok(data)
    }
}

#[wasm_bindgen]
pub struct TypstCompiler {
    library: LazyHash<Library>,
    fonts: Vec<Font>,
    font_book: LazyHash<FontBook>,
    sources: RwLock<HashMap<FileId, Source>>,
    files: RwLock<HashMap<FileId, Bytes>>,
    main_id: Option<FileId>,
}

#[wasm_bindgen]
impl TypstCompiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let fonts = Vec::new();
        let font_book = FontBook::from_fonts(&fonts);
        Self {
            library: LazyHash::new(Library::default()),
            fonts,
            font_book: LazyHash::new(font_book),
            sources: RwLock::new(HashMap::new()),
            files: RwLock::new(HashMap::new()),
            main_id: None,
        }
    }

    pub fn add_font(&mut self, data: &[u8]) -> Result<String, String> {
        let bytes = Bytes::new(data.to_vec());
        if let Some(font) = Font::iter(bytes).next() {
            let name = font.info().family.clone();
            self.fonts.push(font);
            self.font_book = LazyHash::new(FontBook::from_fonts(&self.fonts));
            Ok(name)
        } else {
            Err("Failed to parse font".to_string())
        }
    }

    pub fn add_source(&mut self, path: &str, text: &str) -> Result<(), String> {
        let id = FileId::new(None, VirtualPath::new(path));
        let source = Source::new(id, text.to_string());
        self.files
            .write()
            .map_err(|_| "Failed to acquire write lock on files".to_string())?
            .remove(&id);
        self.sources
            .write()
            .map_err(|_| "Failed to acquire write lock on sources".to_string())?
            .insert(id, source);
        Ok(())
    }

    pub fn add_file(&mut self, path: &str, data: &[u8]) -> Result<(), String> {
        let id = FileId::new(None, VirtualPath::new(path));
        let bytes = Bytes::new(data.to_vec());
        self.sources
            .write()
            .map_err(|_| "Failed to acquire write lock on sources".to_string())?
            .remove(&id);
        self.files
            .write()
            .map_err(|_| "Failed to acquire write lock on files".to_string())?
            .insert(id, bytes);
        Ok(())
    }

    pub fn set_main(&mut self, path: &str) {
        let id = FileId::new(None, VirtualPath::new(path));
        self.main_id = Some(id);
    }

    pub fn compile(&mut self) -> Result<CompileOutput, String> {
        if self.main_id.is_none() {
            return Err("Main file not set".to_string());
        }

        let result = typst::compile(self);
        let diagnostics = format_diagnostics(self, &result);
        let success = result.output.is_ok();

        let output = match result.output {
            Ok(document) => {
                let svg = typst_svg::svg_merged(&document, Default::default());
                CompileOutput {
                    success,
                    svg: Some(svg),
                    diagnostics,
                    internal_error: None,
                }
            }
            Err(_) => CompileOutput {
                success,
                svg: None,
                diagnostics,
                internal_error: None,
            },
        };

        Ok(output)
    }

    pub fn remove_file(&mut self, path: &str) -> Result<(), String> {
        let id = FileId::new(None, VirtualPath::new(path));
        self.sources
            .write()
            .map_err(|_| "Failed to acquire write lock on sources".to_string())?
            .remove(&id);
        self.files
            .write()
            .map_err(|_| "Failed to acquire write lock on files".to_string())?
            .remove(&id);
        Ok(())
    }

    pub fn clear_files(&mut self) -> Result<(), String> {
        self.sources
            .write()
            .map_err(|_| "Failed to acquire write lock on sources".to_string())?
            .clear();
        self.files
            .write()
            .map_err(|_| "Failed to acquire write lock on files".to_string())?
            .clear();
        Ok(())
    }

    pub fn list_files(&self) -> Result<Vec<String>, String> {
        let sources = self
            .sources
            .read()
            .map_err(|_| "Failed to acquire read lock on sources".to_string())?;
        let files = self
            .files
            .read()
            .map_err(|_| "Failed to acquire read lock on files".to_string())?;

        let mut paths: Vec<String> = sources
            .keys()
            .chain(files.keys())
            .filter_map(|id| id.vpath().as_rootless_path().to_str())
            .map(|s| s.to_string())
            .collect();
        paths.sort();
        paths.dedup();
        Ok(paths)
    }

    pub fn has_file(&self, path: &str) -> Result<bool, String> {
        let id = FileId::new(None, VirtualPath::new(path));
        Ok(self
            .sources
            .read()
            .map_err(|_| "Failed to acquire read lock on sources".to_string())?
            .contains_key(&id)
            || self
                .files
                .read()
                .map_err(|_| "Failed to acquire read lock on files".to_string())?
                .contains_key(&id))
    }
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CompileOutput {
    pub success: bool,
    pub svg: Option<String>,
    pub diagnostics: Vec<WasmDiagnostic>,
    pub internal_error: Option<String>,
}

impl World for TypstCompiler {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.font_book
    }

    fn main(&self) -> FileId {
        self.main_id
            .expect("main() called before set_main() - this is a bug in the compiler usage")
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if let Some(source) = self
            .sources
            .read()
            .map_err(|_| {
                FileError::Other(Some(eco_format!("Failed to acquire read lock on sources")))
            })?
            .get(&id)
        {
            return Ok(source.clone());
        }

        let bytes = self.file(id)?;
        let text = std::str::from_utf8(&bytes).map_err(|_| FileError::InvalidUtf8)?;
        let source = Source::new(id, text.to_string());

        self.sources
            .write()
            .map_err(|_| {
                FileError::Other(Some(eco_format!("Failed to acquire write lock on sources")))
            })?
            .insert(id, source.clone());
        Ok(source)
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        if let Some(bytes) = self
            .files
            .read()
            .map_err(|_| {
                FileError::Other(Some(eco_format!("Failed to acquire read lock on files")))
            })?
            .get(&id)
        {
            return Ok(bytes.clone());
        }

        let path = if let Some(package) = id.package() {
            format!(
                "@{}/{}:{}/{}",
                package.namespace,
                package.name,
                package.version,
                id.vpath().as_rootless_path().to_string_lossy()
            )
        } else {
            id.vpath().as_rootless_path().to_string_lossy().to_string()
        };

        match ResourceBridge::request_file(&path) {
            Ok(data) => {
                let bytes = Bytes::new(data);
                self.files
                    .write()
                    .map_err(|_| {
                        FileError::Other(Some(eco_format!("Failed to acquire write lock on files")))
                    })?
                    .insert(id, bytes.clone());
                Ok(bytes)
            }
            Err(e) => Err(FileError::Other(Some(eco_format!("{}", e)))),
        }
    }

    fn font(&self, id: usize) -> Option<Font> {
        self.fonts.get(id).cloned()
    }

    /// Returns the current date.
    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        let date = Date::new_0();

        let (year, month, day) = if let Some(offset) = offset {
            let offset_ms = (offset as f64) * 60.0 * 60.0 * 1000.0;
            let time = date.get_time() + offset_ms;
            let date = Date::new(&JsValue::from_f64(time));
            (
                date.get_utc_full_year() as i32,
                (date.get_utc_month() + 1) as u8,
                date.get_utc_date() as u8,
            )
        } else {
            (
                date.get_full_year() as i32,
                (date.get_month() + 1) as u8,
                date.get_date() as u8,
            )
        };

        Datetime::from_ymd(year, month, day)
    }
}

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
                && let Some(range) = source.range(diag.span)
            {
                start = Some(range.start);
                end = Some(range.end);
                line = Some(source.byte_to_line(range.start).unwrap_or(0) + 1);
                column = Some(source.byte_to_column(range.start).unwrap_or(0) + 1);
            }
            file = Some(span.vpath().as_rooted_path().display().to_string());
        }

        let severity = match diag.severity {
            Severity::Error => "error",
            Severity::Warning => "warning",
        };

        let hints: Vec<String> = diag.hints.iter().map(|h| h.to_string()).collect();

        let trace: Vec<String> = diag
            .trace
            .iter()
            .filter_map(|t| {
                let span = t.span;
                if let Some(file_id) = span.id()
                    && let Some(source) = world.source(file_id).ok()
                    && let Some(range) = source.range(span)
                {
                    let line_num = source.byte_to_line(range.start).unwrap_or(0) + 1;
                    let file_name = file_id.vpath().as_rooted_path().display().to_string();
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

/// Formats all diagnostics (warnings + errors) from a compilation result.
pub fn format_diagnostics<T>(
    world: &dyn World,
    result: &Warned<Result<T, typst::ecow::EcoVec<SourceDiagnostic>>>,
) -> Vec<WasmDiagnostic> {
    let mut diagnostics = Vec::new();

    // Warnings exist even when compilation succeeds
    for warning in &result.warnings {
        diagnostics.push(WasmDiagnostic::from_source_diagnostic(warning, world));
    }

    // Errors only if compilation failed
    if let Err(errors) = &result.output {
        for error in errors {
            diagnostics.push(WasmDiagnostic::from_source_diagnostic(error, world));
        }
    }

    diagnostics
}

/// Formats a single diagnostic into a human-readable string with caret underlines.
fn format_single_diagnostic(world: &dyn World, diag: &SourceDiagnostic) -> String {
    let severity = match diag.severity {
        Severity::Error => "ERROR",
        Severity::Warning => "WARNING",
    };

    let mut lines = vec![format!("{}: {}", severity, diag.message)];

    // Location and source snippet
    if let Some((file, line_num, col, source_text, highlight_len)) = extract_location(world, diag) {
        lines.push(format!("  --> {}:{}:{}", file, line_num, col));
        lines.push("   |".to_string());

        // Source line with line number (right-aligned to 3 digits)
        lines.push(format!("{:>3} | {}", line_num, source_text));

        // Caret underline pointing to the error
        let padding = " ".repeat(3 + 3 + col.saturating_sub(1)); // indent + "| " + column
        let underline = "^".repeat(highlight_len.max(1));
        lines.push(format!("{}| {}{}", "   ", padding, underline));

        lines.push("   |".to_string());
    }

    // Hints as structured notes
    for hint in &diag.hints {
        lines.push(format!("   = hint: {}", hint));
    }

    // Optional: include trace for function calls
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
    let range = source.range(diag.span)?;

    let line_idx = source.byte_to_line(range.start)?;
    let line_num = line_idx + 1;
    let col = source.byte_to_column(range.start)? + 1;
    let file = file_id.vpath().as_rooted_path().display().to_string();

    let line_range = source.line_to_range(line_idx)?;
    let line_text = source.get(line_range)?;

    // Convert tabs to 4 spaces so caret aligns correctly in browsers/terminals
    let display_text = line_text.replace('\t', "    ");
    let tab_before = line_text[..col.saturating_sub(1)].matches('\t').count();
    let visual_col = col + (tab_before * 3); // adjust for tab expansion

    let len = range.end.saturating_sub(range.start);

    Some((file, line_num, visual_col, display_text, len))
}

fn span_to_location(world: &dyn World, span: typst::syntax::Span) -> Option<(String, usize)> {
    let file_id = span.id()?;
    let source = world.source(file_id).ok()?;
    let range = source.range(span)?;
    let line = source.byte_to_line(range.start)? + 1;
    let file = file_id.vpath().as_rooted_path().display().to_string();
    Some((file, line))
}
