use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::Manager;

const LOG_FILENAME: &str = "lumina_log.csv";
const CSV_HEADER: &str = "id,date,type,name,duration,start_time,end_time,status,pause_count\n";

/// Get the path to the log CSV file, ensuring the parent directory exists.
fn log_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create log directory: {}", e))?;

    Ok(data_dir.join(LOG_FILENAME))
}

/// Ensure the log file exists with headers. Returns the path.
fn ensure_log_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = log_file_path(app)?;
    if !path.exists() {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|e| format!("Failed to create log file: {}", e))?;
        file.write_all(CSV_HEADER.as_bytes())
            .map_err(|e| format!("Failed to write CSV header: {}", e))?;
    }
    Ok(path)
}

/// Initialize the log file — creates it with headers if it doesn't exist.
#[tauri::command]
pub fn init_logs(app: tauri::AppHandle) -> Result<String, String> {
    let path = ensure_log_file(&app)?;
    Ok(format!("Log file ready at {}", path.display()))
}

/// Check whether the log CSV can be written to (not locked by another app).
#[tauri::command]
pub fn check_log_writable(app: tauri::AppHandle) -> Result<bool, String> {
    let path = ensure_log_file(&app)?;
    match OpenOptions::new().append(true).open(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Retry a write operation up to 5 times with backoff (handles Excel file locks).
fn retry_write<F, T, E>(mut action: F) -> Result<T, String>
where
    F: FnMut() -> Result<T, E>,
    E: std::fmt::Display,
{
    for attempt in 0..5 {
        match action() {
            Ok(val) => return Ok(val),
            Err(e) if attempt < 4 => {
                let _ = e; // file locked, will retry
                let ms = 150 * (attempt + 1);
                std::thread::sleep(std::time::Duration::from_millis(ms as u64));
            }
            Err(e) => return Err(format!("Failed after 5 retries: {}", e)),
        }
    }
    unreachable!()
}

/// Escape a string for CSV (wrap in quotes if contains comma, quote, or newline).
fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

/// Returns the next available log ID (max id in CSV + 1, or 1 if empty).
#[tauri::command]
pub fn get_next_log_id(app: tauri::AppHandle) -> Result<u32, String> {
    let path = ensure_log_file(&app)?;

    let mut content = String::new();
    OpenOptions::new()
        .read(true)
        .open(&path)
        .map_err(|e| format!("Failed to read log file: {}", e))?
        .read_to_string(&mut content)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    let mut max_id: u32 = 0;
    for line in content.lines().skip(1) {
        if let Some(first) = line.split(',').next() {
            if let Ok(id) = first.trim().parse::<u32>() {
                if id > max_id { max_id = id; }
            }
        }
    }

    Ok(max_id + 1)
}

/// Append a new row to the log CSV.
#[tauri::command]
pub fn append_log(
    app: tauri::AppHandle,
    id: u32,
    date: String,
    name: String,
    log_type: String,
    duration: String,
    start_time: String,
    end_time: String,
    status: String,
    pause_count: u32,
) -> Result<String, String> {
    let path = ensure_log_file(&app)?;

    let row = format!(
        "{},{},{},{},{},{},{},{},{}\n",
        id,
        csv_escape(&date),
        csv_escape(&log_type),
        csv_escape(&name),
        csv_escape(&duration),
        csv_escape(&start_time),
        csv_escape(&end_time),
        csv_escape(&status),
        pause_count,
    );

    retry_write(|| {
        let mut file = OpenOptions::new()
            .append(true)
            .open(&path)
            .map_err(|e| format!("Log file locked: {}", e))?;
        file.write_all(row.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))
    })?;

    Ok(format!("Log row {} appended", id))
}

/// Update an existing log row by ID — patches end_time and status in place.
#[tauri::command]
pub fn update_log(
    app: tauri::AppHandle,
    id: u32,
    end_time: String,
    status: String,
    name: String,          // empty = keep existing
) -> Result<String, String> {
    let path = ensure_log_file(&app)?;

    let mut content = String::new();
    OpenOptions::new()
        .read(true)
        .open(&path)
        .map_err(|e| format!("Failed to read log file: {}", e))?
        .read_to_string(&mut content)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    let id_str = id.to_string();
    let mut updated = false;
    let new_lines: Vec<String> = content
        .lines()
        .map(|line| {
            if let Some(first) = line.split(',').next() {
                if first.trim() == id_str {
                    let fields: Vec<&str> = line.split(',').collect();
                    let effective_name = if name.is_empty() {
                        fields.get(3).unwrap_or(&"").to_string()
                    } else {
                        csv_escape(&name)
                    };
                    let rebuilt = format!(
                        "{},{},{},{},{},{},{},{},{}",
                        fields.first().unwrap_or(&""),
                        fields.get(1).unwrap_or(&""),
                        fields.get(2).unwrap_or(&""),
                        effective_name,
                        fields.get(4).unwrap_or(&""),
                        fields.get(5).unwrap_or(&""),
                        csv_escape(&end_time),
                        csv_escape(&status),
                        fields.get(8).unwrap_or(&"0"),
                    );
                    updated = true;
                    return rebuilt;
                }
            }
            line.to_string()
        })
        .collect();

    if !updated {
        return Err(format!("Log row with id {} not found", id));
    }

    let output = new_lines.join("\n") + "\n";
    retry_write(|| {
        fs::write(&path, output.as_bytes())
            .map_err(|e| format!("Log file locked: {}", e))
    })?;

    Ok(format!("Log row {} updated", id))
}

/// Open the log file in the OS default application.
#[tauri::command]
pub fn open_logs(app: tauri::AppHandle) -> Result<String, String> {
    let path = ensure_log_file(&app)?;

    // Open the file with the default application
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open log file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open log file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open log file: {}", e))?;
    }

    Ok(format!("Opened {}", path.display()))
}
