use std::collections::HashMap;

use typst::foundations::Bytes;
use typst::syntax::{FileId, Source};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;

use crate::dependencies::DependencyTrace;

#[derive(Clone)]
pub enum FileEntry {
    Source {
        source: Source,
        origin: Option<FileOrigin>,
    },

    Bytes {
        bytes: Bytes,
        origin: Option<FileOrigin>,
    },
}

#[derive(Clone, Debug)]
pub struct FileOrigin {
    pub kind: ResourceKind,
    pub requested_path: String,
    pub resolved_path: Option<String>,
    pub media_type: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ResourceKind {
    Project,
    Package,
    Url,
}

pub struct CompilerState {
    pub fonts: Vec<Font>,
    pub font_book: LazyHash<FontBook>,
    pub files: HashMap<FileId, FileEntry>,
    pub fetched_files: HashMap<FileId, FileEntry>,
    pub main_id: Option<FileId>,
    pub dependencies: DependencyTrace,
}

impl CompilerState {
    pub fn new() -> Self {
        Self {
            fonts: Vec::new(),
            font_book: LazyHash::new(FontBook::new()),
            files: HashMap::new(),
            fetched_files: HashMap::new(),
            main_id: None,
            dependencies: DependencyTrace::default(),
        }
    }
}
