use typst::foundations::Bytes;
use typst::syntax::Source;

use crate::exports::typst::engine::api::OperationError;
use crate::paths::{file_id_path, project_file_id};
use crate::state::{CompilerState, FileEntry};

pub fn add_file(
    state: &mut CompilerState,
    path: String,
    data: Vec<u8>,
) -> Result<(), OperationError> {
    let id = project_file_id(&path)?;
    state.files.insert(
        id,
        FileEntry::Bytes {
            bytes: Bytes::new(data),
            origin: None,
        },
    );
    Ok(())
}

pub fn add_source(
    state: &mut CompilerState,
    path: String,
    text: String,
) -> Result<(), OperationError> {
    let id = project_file_id(&path)?;
    state.files.insert(
        id,
        FileEntry::Source {
            source: Source::new(id, text),
            origin: None,
        },
    );
    Ok(())
}

pub fn set_main(state: &mut CompilerState, path: String) -> Result<(), OperationError> {
    state.main_id = Some(project_file_id(&path)?);
    Ok(())
}

pub fn remove_file(state: &mut CompilerState, path: String) -> Result<bool, OperationError> {
    let id = project_file_id(&path)?;
    let existed = state.files.remove(&id).is_some();
    if state.main_id == Some(id) {
        state.main_id = None;
    }
    Ok(existed)
}

pub fn clear_files(state: &mut CompilerState) {
    state.files.clear();
    state.main_id = None;
}

pub fn list_files(state: &CompilerState) -> Vec<String> {
    let mut files = state
        .files
        .keys()
        .copied()
        .map(file_id_path)
        .collect::<Vec<_>>();
    files.sort();
    files
}

pub fn has_file(state: &CompilerState, path: String) -> Result<bool, OperationError> {
    Ok(state.files.contains_key(&project_file_id(&path)?))
}
