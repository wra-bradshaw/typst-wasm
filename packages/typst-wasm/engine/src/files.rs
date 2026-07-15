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

    // An explicit file overrides a previously fetched file.
    state.fetched_files.remove(&id);

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

    state.fetched_files.remove(&id);

    Ok(())
}

pub fn set_main(state: &mut CompilerState, path: String) -> Result<(), OperationError> {
    let id = project_file_id(&path)?;

    // Deliberately do not require the file to exist yet.
    state.main_id = Some(id);

    Ok(())
}

pub fn remove_file(state: &mut CompilerState, path: String) -> Result<bool, OperationError> {
    let id = project_file_id(&path)?;

    let existed = state.files.remove(&id).is_some();

    // Also invalidate any host-cached copy.
    state.fetched_files.remove(&id);

    if state.main_id == Some(id) {
        state.main_id = None;
    }

    Ok(existed)
}

pub fn clear_files(state: &mut CompilerState) {
    state.files.clear();
    state.fetched_files.clear();
    state.main_id = None;
    state.dependencies.clear();

    // Fonts deliberately remain installed.
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
    let id = project_file_id(&path)?;
    Ok(state.files.contains_key(&id))
}
