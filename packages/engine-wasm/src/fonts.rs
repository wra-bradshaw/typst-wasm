use typst::foundations::Bytes;
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;

use crate::exports::typst::engine::api::OperationError;
use crate::state::CompilerState;

pub fn add_font(state: &mut CompilerState, data: Vec<u8>) -> Result<String, OperationError> {
    let bytes = Bytes::new(data);

    let fonts = Font::iter(bytes).collect::<Vec<_>>();

    let first = fonts.first().ok_or(OperationError::FontParseFailed)?;

    let family = first.info().family.to_string();

    state.fonts.extend(fonts);
    state.font_book = build_font_book(&state.fonts);

    Ok(family)
}

fn build_font_book(fonts: &[Font]) -> LazyHash<FontBook> {
    let mut book = FontBook::new();

    for font in fonts {
        book.push(font.info().clone());
    }

    LazyHash::new(book)
}
