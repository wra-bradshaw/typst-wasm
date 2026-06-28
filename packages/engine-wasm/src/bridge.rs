#[link(wasm_import_module = "bridge")]
unsafe extern "C" {
    fn host_fetch(path_ptr: *const u8, path_len: u32, result_len_ptr: *mut u32) -> *mut u8;
}

pub struct ResourceBridge;

impl ResourceBridge {
    pub fn request_file(path: &str) -> Result<Vec<u8>, String> {
        let bytes = path.as_bytes();
        let mut result_len: u32 = 0;

        let result_ptr = unsafe {
            host_fetch(
                bytes.as_ptr(),
                bytes.len() as u32,
                &mut result_len as *mut u32,
            )
        };

        if result_ptr.is_null() && result_len == 0 {
            return Err(format!("Host fetch failed for path: {}", path));
        }

        if result_ptr.is_null() {
            return Err(format!(
                "Host fetch returned null pointer for path: {}",
                path
            ));
        }

        let data =
            unsafe { Vec::from_raw_parts(result_ptr, result_len as usize, result_len as usize) };
        Ok(data)
    }
}
