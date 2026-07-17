use std::collections::HashMap;
use std::sync::Mutex;

use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, Source, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};

use crate::dependencies::DependencyTrace;
use crate::state::FileEntry;

pub struct CompileRuntime {
    pub fetched_files: HashMap<FileId, FileEntry>,
    pub dependencies: DependencyTrace,
}

pub struct CompileWorld {
    library: LazyHash<Library>,
    font_book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    main: FileId,
    explicit_files: HashMap<FileId, FileEntry>,
    runtime: Mutex<CompileRuntime>,
}

impl CompileWorld {
    pub fn new(
        library: LazyHash<Library>,
        font_book: LazyHash<FontBook>,
        fonts: Vec<Font>,
        main: FileId,
        explicit_files: HashMap<FileId, FileEntry>,
    ) -> Self {
        Self {
            library,
            font_book,
            fonts,
            main,
            explicit_files,
            runtime: Mutex::new(CompileRuntime {
                fetched_files: HashMap::new(),
                dependencies: DependencyTrace::default(),
            }),
        }
    }

    pub fn into_runtime(self) -> CompileRuntime {
        self.runtime
            .into_inner()
            .expect("compile runtime mutex poisoned")
    }

    pub fn dependencies(&self) -> DependencyTrace {
        self.runtime
            .lock()
            .expect("compile runtime mutex poisoned")
            .dependencies
            .clone()
    }
}

impl World for CompileWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.font_book
    }

    fn main(&self) -> FileId {
        self.main
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        loaders::load_source(self, id)
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        loaders::load_file(self, id)
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, offset: Option<Duration>) -> Option<Datetime> {
        date::host_today(offset)
    }
}

mod loaders {
    use super::*;

    use crate::state::{FileEntry, FileOrigin, ResourceKind};
    use crate::typst::engine::host;
    use crate::typst::engine::types::{FetchError, FetchRequest, FileKind};

    pub fn load_source(world: &CompileWorld, id: FileId) -> FileResult<Source> {
        if let Some(entry) = world.explicit_files.get(&id) {
            return entry_to_source(id, entry);
        }

        if let Some(entry) = cached_entry(world, id) {
            return entry_to_source(id, &entry);
        }

        let entry = fetch_from_host(id)?;

        cache_entry(world, id, entry.clone());

        entry_to_source(id, &entry)
    }

    pub fn load_file(world: &CompileWorld, id: FileId) -> FileResult<Bytes> {
        if let Some(entry) = world.explicit_files.get(&id) {
            return entry_to_bytes(entry);
        }

        if let Some(entry) = cached_entry(world, id) {
            return entry_to_bytes(&entry);
        }

        let entry = fetch_from_host(id)?;

        cache_entry(world, id, entry.clone());

        entry_to_bytes(&entry)
    }

    fn cached_entry(world: &CompileWorld, id: FileId) -> Option<FileEntry> {
        let mut runtime = world
            .runtime
            .lock()
            .expect("compile runtime mutex poisoned");

        let entry = runtime.fetched_files.get(&id)?.clone();

        // Cached dependencies must still be recorded on every compile.
        runtime.dependencies.record_entry(&entry);

        Some(entry)
    }

    fn cache_entry(world: &CompileWorld, id: FileId, entry: FileEntry) {
        let mut runtime = world
            .runtime
            .lock()
            .expect("compile runtime mutex poisoned");

        runtime.dependencies.record_entry(&entry);
        runtime.fetched_files.insert(id, entry);
    }

    fn fetch_from_host(id: FileId) -> FileResult<FileEntry> {
        let requested_path = crate::paths::file_id_path(id);

        let kind = classify_file_kind(id);

        let request = FetchRequest {
            path: requested_path.clone(),
            kind,
        };

        // Do not hold world.runtime's mutex during this call.
        // Under JSPI, this import may suspend.
        let fetched = host::fetch(&request).map_err(map_fetch_error)?;

        let origin = FileOrigin {
            kind: map_resource_kind(kind),
            requested_path,
            resolved_path: fetched.resolved_path,
            media_type: fetched.media_type,
        };

        Ok(FileEntry::Bytes {
            bytes: Bytes::new(fetched.data),
            origin: Some(origin),
        })
    }

    fn classify_file_kind(id: FileId) -> FileKind {
        match id.root() {
            VirtualRoot::Package(_) => FileKind::Package,
            _ => FileKind::Project,
        }
    }

    fn map_resource_kind(kind: FileKind) -> ResourceKind {
        match kind {
            FileKind::Project => ResourceKind::Project,
            FileKind::Package => ResourceKind::Package,
            FileKind::Url => ResourceKind::Url,
        }
    }

    fn map_fetch_error(error: FetchError) -> FileError {
        match error {
            FetchError::NotFound => FileError::Other(Some("resource not found".into())),

            FetchError::Denied => FileError::Other(Some("resource access denied".into())),

            FetchError::Timeout => FileError::Other(Some("resource fetch timed out".into())),

            FetchError::Unavailable => FileError::Other(Some("resource loader unavailable".into())),

            FetchError::Other(message) => FileError::Other(Some(message.into())),
        }
    }

    fn entry_to_source(id: FileId, entry: &FileEntry) -> FileResult<Source> {
        match entry {
            FileEntry::Source { source, .. } => Ok(source.clone()),

            FileEntry::Bytes { bytes, .. } => {
                let text = std::str::from_utf8(bytes.as_slice())
                    .map_err(|_| FileError::Other(Some("source file is not valid UTF-8".into())))?;

                Ok(Source::new(id, text.to_owned()))
            }
        }
    }

    fn entry_to_bytes(entry: &FileEntry) -> FileResult<Bytes> {
        match entry {
            FileEntry::Bytes { bytes, .. } => Ok(bytes.clone()),

            FileEntry::Source { source, .. } => Ok(Bytes::from_string(source.text().to_owned())),
        }
    }
}

mod date {
    use super::*;

    pub fn host_today(offset: Option<Duration>) -> Option<Datetime> {
        let seconds = offset
            .map(|duration| duration.seconds())
            .and_then(|seconds| {
                if seconds.is_finite() && seconds.fract() == 0.0 {
                    Some(seconds as i64)
                } else {
                    None
                }
            });

        let date = crate::typst::engine::host::today(seconds)?;

        let year = i32::try_from(date.year).ok()?;

        Datetime::from_ymd(year, date.month, date.day)
    }
}
