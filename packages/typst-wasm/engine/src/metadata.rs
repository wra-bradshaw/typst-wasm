use typst::foundations::{Output, Repr};
use typst::introspection::MetadataElem;
use typst::model::Document;

use crate::typst::engine::types::{CustomMetadata, DocumentMetadata};

pub fn extract_document_metadata(document: &(impl Document + Output)) -> Option<DocumentMetadata> {
    let info = document.info();

    let custom = document
        .introspector()
        .query_labelled()
        .into_iter()
        .filter(|content| content.is::<MetadataElem>())
        .filter_map(|content| {
            let value = content.field_by_name("value").ok()?;
            let value = serde_json::to_value(&value)
                .unwrap_or_else(|_| serde_json::Value::String(value.repr().to_string()));

            Some(encode_custom_value(
                content.label().map(|label| label.resolve().to_string()),
                &value,
            ))
        })
        .collect();

    Some(DocumentMetadata {
        title: info.title.as_ref().map(|s| s.to_string()),
        author: info.author.iter().map(|s| s.to_string()).collect(),
        description: info.description.as_ref().map(|s| s.to_string()),
        keywords: info.keywords.iter().map(|s| s.to_string()).collect(),
        custom,
    })
}

pub fn encode_custom_value(label: Option<String>, value: &serde_json::Value) -> CustomMetadata {
    let value_json = serde_json::to_string(value).unwrap_or_else(|_| "null".to_owned());

    CustomMetadata { label, value_json }
}
