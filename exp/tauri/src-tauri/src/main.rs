// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn launch_engine() -> Result<(), String> {
    std::process::Command::new("../../senars-engine")
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_engine])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}