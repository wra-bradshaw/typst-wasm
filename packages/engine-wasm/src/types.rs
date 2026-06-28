use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::diagnostics::WasmDiagnostic;

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CompileOptions {
    pub format: Option<String>,
    pub main: Option<String>,
    pub root: Option<String>,
    pub inputs: Option<HashMap<String, String>>,
    pub features: Option<Vec<String>>,
    pub creation_timestamp: Option<i64>,
    pub jobs: Option<u32>,
    pub diagnostic_format: Option<String>,
    pub pages: Option<String>,
    pub pdf_standards: Option<Vec<String>>,
    pub pdf_tags: Option<bool>,
    pub ppi: Option<f32>,
    pub deps: Option<bool>,
    pub deps_format: Option<String>,
    pub timings: Option<bool>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PageOutput {
    pub page: usize,
    pub output_text: Option<String>,
    pub output_bytes: Option<Vec<u8>>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BundleFile {
    pub path: String,
    pub data: Vec<u8>,
    pub media_type: Option<String>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DependencyInfo {
    pub files: Vec<String>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CompileOutput {
    pub success: bool,
    pub format: String,
    pub output_text: Option<String>,
    pub output_bytes: Option<Vec<u8>>,
    pub pages: Vec<PageOutput>,
    pub files: Vec<BundleFile>,
    pub diagnostics: Vec<WasmDiagnostic>,
    pub internal_error: Option<String>,
    pub deps: Option<DependencyInfo>,
    pub timings: Option<String>,
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
            deps: None,
            timings: None,
        }
    }
}
