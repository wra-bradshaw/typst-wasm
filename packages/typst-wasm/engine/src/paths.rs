use std::path::{Component, Path};

use typst::syntax::{FileId, RootedPath, VirtualPath, VirtualRoot};

use crate::exports::typst::engine::api::OperationError;

pub fn project_file_id(input: &str) -> Result<FileId, OperationError> {
    let normalized = normalize_project_path(input)?;

    let virtual_path =
        VirtualPath::new(normalized).map_err(|err| OperationError::InvalidPath(err.to_string()))?;

    Ok(FileId::new(RootedPath::new(
        VirtualRoot::Project,
        virtual_path,
    )))
}

pub fn normalize_project_path(input: &str) -> Result<String, OperationError> {
    if input.trim().is_empty() {
        return Err(OperationError::InvalidPath("path cannot be empty".into()));
    }

    let path = Path::new(input);

    if path.is_absolute() {
        return Err(OperationError::InvalidPath(
            "absolute paths are not allowed".into(),
        ));
    }

    let mut parts = Vec::new();

    for component in path.components() {
        match component {
            Component::Normal(part) => {
                let part = part
                    .to_str()
                    .ok_or_else(|| OperationError::InvalidPath("path is not valid UTF-8".into()))?;

                parts.push(part);
            }

            Component::CurDir => {}

            Component::ParentDir => {
                if parts.pop().is_none() {
                    return Err(OperationError::InvalidPath(
                        "path escapes the project root".into(),
                    ));
                }
            }

            Component::RootDir | Component::Prefix(_) => {
                return Err(OperationError::InvalidPath("invalid project path".into()));
            }
        }
    }

    if parts.is_empty() {
        return Err(OperationError::InvalidPath("path cannot be empty".into()));
    }

    Ok(parts.join("/"))
}

pub fn file_id_path(id: FileId) -> String {
    let path = id.vpath().get_without_slash().to_string();

    match id.root() {
        VirtualRoot::Project => path,
        VirtualRoot::Package(package) => format!("{package}/{path}"),
    }
}
