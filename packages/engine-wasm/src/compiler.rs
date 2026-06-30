use std::collections::HashMap;
use std::sync::RwLock;

use typst::foundations::Bytes;
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt};
use wasm_bindgen::prelude::*;

use crate::exports::ExportFormat;
use crate::types::{CompileFormat, CompileOptions, CompileOutput};

#[derive(Clone)]
pub(crate) enum FileEntry {
    Source(Source),
    Bytes(Bytes),
}

#[wasm_bindgen]
pub struct TypstCompiler {
    pub(crate) host_id: u32,
    pub(crate) library: LazyHash<Library>,
    pub(crate) fonts: Vec<Font>,
    pub(crate) font_book: LazyHash<FontBook>,
    pub(crate) files: RwLock<HashMap<FileId, FileEntry>>,
    pub(crate) main_id: Option<FileId>,
}

#[wasm_bindgen]
impl TypstCompiler {
    #[wasm_bindgen(constructor)]
    pub fn new(host_id: u32) -> Self {
        let fonts = Vec::new();
        let font_book = FontBook::from_fonts(&fonts);
        Self {
            host_id,
            library: LazyHash::new(Library::default()),
            fonts,
            font_book: LazyHash::new(font_book),
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
        let id = file_id(path)?;
        let source = Source::new(id, text.to_string());
        self.files
            .write()
            .map_err(lock_write_files)?
            .insert(id, FileEntry::Source(source));
        Ok(())
    }

    pub fn add_file(&mut self, path: &str, data: &[u8]) -> Result<(), String> {
        let id = file_id(path)?;
        let bytes = Bytes::new(data.to_vec());
        self.files
            .write()
            .map_err(lock_write_files)?
            .insert(id, FileEntry::Bytes(bytes));
        Ok(())
    }

    pub fn set_main(&mut self, path: &str) -> Result<(), String> {
        let id = file_id(path)?;
        self.main_id = Some(id);
        Ok(())
    }

    pub fn compile(&mut self, options: CompileOptions) -> Result<CompileOutput, String> {
        if let Some(main) = options.main.as_ref() {
            self.set_main(main)?;
        }

        if self.main_id.is_none() {
            return Err("Main file not set".to_string());
        }

        self.configure_library(&options);

        match options.format {
            CompileFormat::Pdf => self.compile_paged(options, ExportFormat::Pdf),
            CompileFormat::Png => self.compile_paged(options, ExportFormat::Png),
            CompileFormat::Svg => self.compile_paged(options, ExportFormat::Svg),
            CompileFormat::Html => self.compile_html(),
            CompileFormat::Bundle => self.compile_bundle(),
        }
    }

    pub fn remove_file(&mut self, path: &str) -> Result<(), String> {
        let id = file_id(path)?;
        self.files.write().map_err(lock_write_files)?.remove(&id);
        Ok(())
    }

    pub fn clear_files(&mut self) -> Result<(), String> {
        self.files.write().map_err(lock_write_files)?.clear();
        Ok(())
    }

    pub fn list_files(&self) -> Result<Vec<String>, String> {
        let mut paths: Vec<String> = self
            .files
            .read()
            .map_err(lock_read_files)?
            .keys()
            .map(|id| id.vpath().get_without_slash().to_string())
            .collect();
        paths.sort();
        Ok(paths)
    }

    pub fn has_file(&self, path: &str) -> Result<bool, String> {
        let id = file_id(path)?;
        Ok(self
            .files
            .read()
            .map_err(lock_read_files)?
            .contains_key(&id))
    }
}

fn file_id(path: &str) -> Result<FileId, String> {
    let path = VirtualPath::new(path).map_err(|err| err.to_string())?;
    Ok(RootedPath::new(VirtualRoot::Project, path).intern())
}

impl Default for TypstCompiler {
    fn default() -> Self {
        Self::new(0)
    }
}

pub(crate) fn lock_read_files<T>(_: T) -> String {
    "Failed to acquire read lock on files".to_string()
}

pub(crate) fn lock_write_files<T>(_: T) -> String {
    "Failed to acquire write lock on files".to_string()
}
