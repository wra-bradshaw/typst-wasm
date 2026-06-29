use js_sys::Date;
use typst::diag::{FileError, FileResult, eco_format};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, Source, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};
use wasm_bindgen::prelude::JsValue;

use crate::bridge::ResourceBridge;
use crate::compiler::TypstCompiler;

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

        let path = if let VirtualRoot::Package(package) = id.root() {
            format!(
                "@{}/{}:{}/{}",
                package.namespace,
                package.name,
                package.version,
                id.vpath().get_without_slash()
            )
        } else {
            id.vpath().get_without_slash().to_string()
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

    fn today(&self, offset: Option<Duration>) -> Option<Datetime> {
        let date = Date::new_0();

        let (year, month, day) = if let Some(offset) = offset {
            let offset_ms = offset.seconds() * 1000.0;
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
