use js_sys::Date;
use typst::diag::{FileError, FileResult, eco_format};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, Source, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};
use wasm_bindgen::prelude::JsValue;

use crate::bridge::ResourceBridge;
use crate::compiler::{FileEntry, TypstCompiler, lock_read_files, lock_write_files};

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
        let entry = self
            .files
            .read()
            .map_err(|err| FileError::Other(Some(eco_format!("{}", lock_read_files(err)))))?
            .get(&id)
            .cloned();

        let Some(entry) = entry else {
            let bytes = self.file(id)?;
            let text = std::str::from_utf8(&bytes).map_err(|_| FileError::InvalidUtf8)?;
            return Ok(Source::new(id, text.to_string()));
        };

        match entry {
            FileEntry::Source(source) => Ok(source),
            FileEntry::Bytes(bytes) => {
                let text = std::str::from_utf8(&bytes).map_err(|_| FileError::InvalidUtf8)?;
                Ok(Source::new(id, text.to_string()))
            }
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        if let Some(entry) = self
            .files
            .read()
            .map_err(|err| FileError::Other(Some(eco_format!("{}", lock_read_files(err)))))?
            .get(&id)
        {
            return match entry {
                FileEntry::Source(source) => Ok(Bytes::new(source.text().as_bytes().to_vec())),
                FileEntry::Bytes(bytes) => Ok(bytes.clone()),
            };
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
                    .map_err(|err| {
                        FileError::Other(Some(eco_format!("{}", lock_write_files(err))))
                    })?
                    .insert(id, FileEntry::Bytes(bytes.clone()));
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
