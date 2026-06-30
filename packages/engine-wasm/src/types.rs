use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::diagnostics::WasmDiagnostic;

#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum CompileFormat {
    Pdf,
    Png,
    Svg,
    Html,
    Bundle,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CompileOptions {
    pub format: CompileFormat,
    pub main: Option<String>,
    pub inputs: Option<HashMap<String, String>>,
    pub pages: Option<String>,
    pub pdf_standards: Option<Vec<String>>,
    pub ppi: Option<f32>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PageOutput {
    pub page: usize,
    pub output_text: Option<String>,
    #[tsify(type = "Uint8Array | null")]
    pub output_bytes: Option<Vec<u8>>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BundleFile {
    pub path: String,
    #[tsify(type = "Uint8Array")]
    pub data: Vec<u8>,
    pub media_type: Option<String>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CompileOutput {
    pub success: bool,
    pub format: String,
    pub output_text: Option<String>,
    #[tsify(type = "Uint8Array | null")]
    pub output_bytes: Option<Vec<u8>>,
    pub pages: Vec<PageOutput>,
    pub files: Vec<BundleFile>,
    pub diagnostics: Vec<WasmDiagnostic>,
    pub internal_error: Option<String>,
}

impl CompileOutput {
    pub(crate) fn failed(format: &str, diagnostics: Vec<WasmDiagnostic>) -> Self {
        Self {
            success: false,
            format: format.to_string(),
            output_text: None,
            output_bytes: None,
            pages: Vec::new(),
            files: Vec::new(),
            diagnostics,
            internal_error: None,
        }
    }

    pub(crate) fn pdf(bytes: Vec<u8>, diagnostics: Vec<WasmDiagnostic>) -> Self {
        Self {
            success: true,
            format: "pdf".to_string(),
            output_text: None,
            output_bytes: Some(bytes),
            pages: Vec::new(),
            files: Vec::new(),
            diagnostics,
            internal_error: None,
        }
    }

    pub(crate) fn pages(
        format: &str,
        pages: Vec<PageOutput>,
        diagnostics: Vec<WasmDiagnostic>,
    ) -> Self {
        Self {
            success: true,
            format: format.to_string(),
            output_text: None,
            output_bytes: None,
            pages,
            files: Vec::new(),
            diagnostics,
            internal_error: None,
        }
    }

    pub(crate) fn html(output: String, diagnostics: Vec<WasmDiagnostic>) -> Self {
        Self {
            success: true,
            format: "html".to_string(),
            output_text: Some(output),
            output_bytes: None,
            pages: Vec::new(),
            files: Vec::new(),
            diagnostics,
            internal_error: None,
        }
    }

    pub(crate) fn bundle(files: Vec<BundleFile>, diagnostics: Vec<WasmDiagnostic>) -> Self {
        Self {
            success: true,
            format: "bundle".to_string(),
            output_text: None,
            output_bytes: None,
            pages: Vec::new(),
            files,
            diagnostics,
            internal_error: None,
        }
    }
}
