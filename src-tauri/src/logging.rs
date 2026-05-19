use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::Manager;
use csv::{ReaderBuilder, WriterBuilder};

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
    let mut rdr = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());
    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        if let Some(first) = record.get(0) {
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

    let mut file = OpenOptions::new()
        .append(true)
        .open(&path)
        .map_err(|e| format!("Log file locked: {}", e))?;
    file.write_all(row.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;

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

    // Parse existing CSV with proper quoting support
    let mut rdr = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());

    let headers = rdr.headers()
        .map_err(|e| format!("CSV header error: {}", e))?
        .clone();

    // Write output to buffer
    let mut wtr_bytes: Vec<u8> = Vec::new();
    {
        let mut wtr = WriterBuilder::new()
            .from_writer(&mut wtr_bytes);

        wtr.write_record(&headers)
            .map_err(|e| format!("CSV write error: {}", e))?;

        let mut updated = false;
        for result in rdr.records() {
            let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
            let first = record.get(0).unwrap_or("");
            if first.trim() == id_str {
                let effective_name = if name.is_empty() {
                    record.get(3).unwrap_or("").to_string()
                } else {
                    name.clone()
                };
                let new_record: Vec<String> = vec![
                    first.to_string(),
                    record.get(1).unwrap_or("").to_string(),
                    record.get(2).unwrap_or("").to_string(),
                    effective_name,
                    record.get(4).unwrap_or("").to_string(),
                    record.get(5).unwrap_or("").to_string(),
                    end_time.clone(),
                    status.clone(),
                    record.get(8).unwrap_or("0").to_string(),
                ];
                wtr.write_record(&new_record)
                    .map_err(|e| format!("CSV write error: {}", e))?;
                updated = true;
            } else {
                wtr.write_record(&record)
                    .map_err(|e| format!("CSV write error: {}", e))?;
            }
        }

        if !updated {
            return Err(format!("Log row with id {} not found", id));
        }
    } // wtr is dropped here, flushing to wtr_bytes

    fs::write(&path, &wtr_bytes)
        .map_err(|e| format!("Log file locked: {}", e))?;

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

// ===========================================================================
//  UNIT TESTS
// ===========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use csv::{ReaderBuilder, WriterBuilder};

    // --- csv_escape tests ---

    #[test]
    fn test_csv_escape_no_special_chars() {
        assert_eq!(csv_escape("hello"), "hello");
        assert_eq!(csv_escape("simple text"), "simple text");
    }

    #[test]
    fn test_csv_escape_with_comma() {
        assert_eq!(csv_escape("hello, world"), "\"hello, world\"");
    }

    #[test]
    fn test_csv_escape_with_quote() {
        // Inner quotes get doubled, whole field wrapped in quotes
        assert_eq!(csv_escape("say \"hello\""), "\"say \"\"hello\"\"\"");
    }

    #[test]
    fn test_csv_escape_with_newline() {
        assert_eq!(csv_escape("line1\nline2"), "\"line1\nline2\"");
    }

    #[test]
    fn test_csv_escape_empty_string() {
        assert_eq!(csv_escape(""), "");
    }

    // --- CSV round-trip tests (verify fix for quoted-comma parsing) ---

    #[test]
    fn test_read_csv_with_quoted_commas() {
        // A field containing a comma must survive a write/read round-trip
        let csv_data = "id,date,type,name\n1,2024-01-01,pomo,\"Task, with commas\"\n";
        let mut rdr = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv_data.as_bytes());

        let records: Vec<_> = rdr.records().collect();
        assert_eq!(records.len(), 1);
        let record = records[0].as_ref().unwrap();
        assert_eq!(record.get(0).unwrap(), "1");
        // The comma inside the quoted field must be preserved
        assert_eq!(record.get(3).unwrap(), "Task, with commas");
    }

    #[test]
    fn test_write_then_read_round_trip() {
        // Write a row with csv_escape, then read back with csv::Reader
        let name_with_comma = "Buy milk, eggs, bread";
        let row = format!(
            "{},{},{},{},{},{},{},{},{}\n",
            42,
            csv_escape("2024-05-19"),
            csv_escape("todo"),
            csv_escape(name_with_comma),
            csv_escape(""),
            csv_escape("14:00"),
            csv_escape(""),
            csv_escape("pending"),
            0u32,
        );

        let mut rdr = ReaderBuilder::new()
            .has_headers(false)
            .from_reader(row.as_bytes());

        let records: Vec<_> = rdr.records().collect();
        assert_eq!(records.len(), 1);
        let record = records[0].as_ref().unwrap();
        // The name field (index 3, 0-based) should contain the full string with commas
        assert_eq!(record.get(3).unwrap(), name_with_comma);
    }

    // --- get_next_log_id logic test ---

    #[test]
    fn test_get_next_log_id_logic() {
        let csv_data = concat!(
            "id,date,type,name\n",
            "1,2024-01-01,pomo,Task1\n",
            "5,2024-01-02,pomo,Task2\n",
            "3,2024-01-03,todo,Task3\n",
        );
        let mut rdr = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv_data.as_bytes());

        let mut max_id: u32 = 0;
        for result in rdr.records() {
            let record = result.unwrap();
            if let Some(first) = record.get(0) {
                if let Ok(id) = first.trim().parse::<u32>() {
                    if id > max_id {
                        max_id = id;
                    }
                }
            }
        }
        // Highest id is 5, so next should be 6
        assert_eq!(max_id + 1, 6);
    }

    #[test]
    fn test_get_next_log_id_empty_csv() {
        // Only headers, no data rows -> next id should be 1
        let csv_data = "id,date,type,name\n";
        let mut rdr = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv_data.as_bytes());

        let mut max_id: u32 = 0;
        for result in rdr.records() {
            let record = result.unwrap();
            if let Some(first) = record.get(0) {
                if let Ok(id) = first.trim().parse::<u32>() {
                    if id > max_id {
                        max_id = id;
                    }
                }
            }
        }
        assert_eq!(max_id + 1, 1);
    }

    // --- update_log logic test ---

    #[test]
    fn test_update_log_modifies_target_row() {
        let csv_data = concat!(
            "id,date,type,name,duration,start_time,end_time,status,pause_count\n",
            "1,2024-05-19,pomo,Focus,25,10:00,10:25,done,0\n",
            "2,2024-05-19,pomo,DeepWork,25,10:30,,running,0\n",
        );

        let mut rdr = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv_data.as_bytes());
        let headers = rdr.headers().unwrap().clone();

        let mut wtr_bytes: Vec<u8> = Vec::new();
        {
            let mut wtr = WriterBuilder::new().from_writer(&mut wtr_bytes);
            wtr.write_record(&headers).unwrap();

            for result in rdr.records() {
                let record = result.unwrap();
                let first = record.get(0).unwrap();
                if first.trim() == "2" {
                    let new_record: Vec<String> = vec![
                        first.to_string(),
                        record.get(1).unwrap_or("").to_string(),
                        record.get(2).unwrap_or("").to_string(),
                        record.get(3).unwrap_or("").to_string(),
                        record.get(4).unwrap_or("").to_string(),
                        record.get(5).unwrap_or("").to_string(),
                        "10:55".to_string(),       // new end_time
                        "done".to_string(),         // new status
                        record.get(8).unwrap_or("0").to_string(),
                    ];
                    wtr.write_record(&new_record).unwrap();
                } else {
                    wtr.write_record(&record).unwrap();
                }
            }
        }

        let output = String::from_utf8(wtr_bytes).unwrap();
        // Row 2 should now have end_time=10:55 and status=done
        assert!(output.contains("10:55"), "missing updated end_time");
        assert!(output.contains("done"), "missing updated status");
        // Row 1 should still have its original end_time
        assert!(output.contains("10:25"), "original row 1 was altered");
    }
}
