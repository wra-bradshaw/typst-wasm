use std::collections::HashMap;
use std::sync::RwLock;

use typst::Library;
use typst::foundations::Bytes;
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use wasm_bindgen::prelude::*;

use crate::exports::ExportFormat;
use crate::types::{CompileOptions, CompileOutput};

#[wasm_bindgen]
pub struct TypstCompiler {
    pub(crate) library: LazyHash<Library>,
    pub(crate) fonts: Vec<Font>,
    pub(crate) font_book: LazyHash<FontBook>,
    pub(crate) sources: RwLock<HashMap<FileId, Source>>,
    pub(crate) files: RwLock<HashMap<FileId, Bytes>>,
    pub(crate) main_id: Option<FileId>,
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

    pub fn compile(&mut self, options: CompileOptions) -> Result<CompileOutput, String> {
        if let Some(main) = options.main.as_ref() {
            self.set_main(main);
        }

        if self.main_id.is_none() {
            return Err("Main file not set".to_string());
        }

        self.configure_library(&options);

        match options.format.as_deref().unwrap_or("pdf") {
            "pdf" => self.compile_paged(options, ExportFormat::Pdf),
            "png" => self.compile_paged(options, ExportFormat::Png),
            "svg" => self.compile_paged(options, ExportFormat::Svg),
            "html" => self.compile_html(),
            "bundle" => self.compile_bundle(),
            other => Err(format!("Unsupported compile format: {}", other)),
        }
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
