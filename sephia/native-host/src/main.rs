use serde::Deserialize;
use std::io::{self, Read, Write};
use std::time::{Duration, Instant};

#[cfg(feature = "inference")]
mod inference;

const MAX_REQUEST_BYTES: usize = 4096;
const MAX_RESPONSE_BYTES: usize = 1024 * 1024;
const MIN_REQUEST_INTERVAL: Duration = Duration::from_secs(2);
const APPROVED_ACTION: &str = "synthesize-approved-announcement";
const APPROVED_WAKE_ACTION: &str = "synthesize-approved-wake-acknowledgement";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    version: u8,
    action: String,
}

fn validate_origin(actual: &str, expected: &str) -> bool {
    let Some(extension_id) = expected
        .strip_prefix("chrome-extension://")
        .and_then(|value| value.strip_suffix('/'))
    else {
        return false;
    };

    extension_id.len() == 32
        && extension_id
            .bytes()
            .all(|byte| (b'a'..=b'p').contains(&byte))
        && actual == expected
}

fn parse_request(bytes: &[u8]) -> Result<Request, ()> {
    if bytes.is_empty() || bytes.len() > MAX_REQUEST_BYTES {
        return Err(());
    }
    let request: Request = serde_json::from_slice(bytes).map_err(|_| ())?;
    if request.version != 1 ||
        !matches!(request.action.as_str(), APPROVED_ACTION | APPROVED_WAKE_ACTION) {
        return Err(());
    }
    Ok(request)
}

fn handle_request(
    request: Result<Request, ()>,
    last_request: &mut Option<Instant>,
    runtime: &mut Runtime,
) -> serde_json::Value {
    let request = match request {
        Ok(request) => request,
        Err(()) => return error_response("INVALID_REQUEST"),
    };
    let now = Instant::now();
    if last_request.is_some_and(|last| now.duration_since(last) < MIN_REQUEST_INTERVAL) {
        return error_response("RATE_LIMITED");
    }
    *last_request = Some(now);

    runtime.synthesize(&request.action).unwrap_or_else(error_response)
}

fn read_frame<R: Read>(reader: &mut R) -> io::Result<Option<Vec<u8>>> {
    let mut header = [0_u8; 4];
    match reader.read(&mut header[..1])? {
        0 => return Ok(None),
        1 => {}
        _ => unreachable!(),
    }
    reader.read_exact(&mut header[1..])?;
    let length = u32::from_ne_bytes(header) as usize;
    if length == 0 || length > MAX_REQUEST_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid native message length",
        ));
    }
    let mut payload = vec![0_u8; length];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

fn write_frame<W: Write>(writer: &mut W, response: &serde_json::Value) -> io::Result<()> {
    let payload = serde_json::to_vec(response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if payload.len() > MAX_RESPONSE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "native response exceeds Chrome limit",
        ));
    }
    let length = u32::try_from(payload.len())
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    writer.write_all(&length.to_ne_bytes())?;
    writer.write_all(&payload)?;
    writer.flush()
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct HostConfig {
    extension_origin: String,
    model_dir: Option<String>,
    voice_reference_wav: Option<String>,
    voice_reference_sha256: Option<String>,
    voice_consent_evidence_path: Option<String>,
    model_license_evidence_path: Option<String>,
    runtime_sha256: Option<String>,
    runtime_dlls: Option<Vec<RuntimeDll>>,
    threads: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RuntimeDll {
    file_name: String,
    sha256: String,
}

struct Runtime {
    #[cfg(feature = "inference")]
    engine: Option<inference::LocalNeuralEngine>,
}

impl Runtime {
    fn new(config: &HostConfig) -> Self {
        #[cfg(feature = "inference")]
        {
            let engine = match inference::LocalNeuralEngine::load(config) {
                Ok(engine) => Some(engine),
                Err(error) => {
                    eprintln!("SEPHIA local inference is not ready: {error}");
                    None
                }
            };
            Self { engine }
        }
        #[cfg(not(feature = "inference"))]
        {
            let _ = config;
            Self {}
        }
    }

    fn is_ready(&self) -> bool {
        #[cfg(feature = "inference")]
        {
            return self.engine.is_some();
        }
        #[cfg(not(feature = "inference"))]
        {
            false
        }
    }

    fn synthesize(&mut self, action: &str) -> Result<serde_json::Value, &'static str> {
        #[cfg(feature = "inference")]
        {
            let engine = self.engine.as_mut().ok_or("ENGINE_UNAVAILABLE")?;
            let response = engine.synthesize(action)?;
            return serde_json::to_value(response).map_err(|_| "SYNTHESIS_FAILED");
        }
        #[cfg(not(feature = "inference"))]
        {
            let _ = action;
            Err("ENGINE_UNAVAILABLE")
        }
    }
}

fn error_response(code: &'static str) -> serde_json::Value {
    serde_json::json!({ "version": 1, "ok": false, "code": code })
}

fn load_config() -> io::Result<HostConfig> {
    let executable = std::env::current_exe()?;
    let directory = executable.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "native host directory is unavailable",
        )
    })?;
    let config_path = directory.join("sephia-host-config.json");
    let config_text = std::fs::read_to_string(config_path)?;
    serde_json::from_str(&config_text)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn run() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let actual_origin = args.get(1).map(String::as_str).unwrap_or("");
    let config = load_config()?;
    if !validate_origin(actual_origin, &config.extension_origin) {
        eprintln!("SEPHIA native host rejected an unpaired extension origin.");
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "extension origin is not allowlisted",
        ));
    }

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut input = stdin.lock();
    let mut output = stdout.lock();
    let mut last_request = None;
    let mut runtime = Runtime::new(&config);
    let ready = if runtime.is_ready() {
        serde_json::json!({ "version": 1, "ok": true, "status": "ready" })
    } else {
        error_response("ENGINE_UNAVAILABLE")
    };
    write_frame(&mut output, &ready)?;
    if !runtime.is_ready() {
        return Ok(());
    }

    loop {
        let payload = match read_frame(&mut input)? {
            Some(payload) => payload,
            None => return Ok(()),
        };
        let request = parse_request(&payload);
        let response = handle_request(request, &mut last_request, &mut runtime);
        write_frame(&mut output, &response)?;
    }
}

fn main() {
    if let Err(error) = run() {
        eprintln!("SEPHIA native host stopped: {error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn accepts_only_the_exact_extension_origin() {
        let origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/";
        assert!(validate_origin(origin, origin));
        assert!(!validate_origin("chrome-extension://attacker/", origin));
        assert!(!validate_origin(
            "chrome-extension://qrstuvwxyzabcdefghijklmnop/",
            "chrome-extension://qrstuvwxyzabcdefghijklmnop/"
        ));
        assert!(!validate_origin(origin, ""));
        assert!(!validate_origin("https://example.com/", origin));
    }

    #[test]
    fn request_schema_rejects_arbitrary_text_and_unknown_properties() {
        let valid = br#"{"version":1,"action":"synthesize-approved-announcement"}"#;
        assert!(parse_request(valid).is_ok());

        let wake_ack = br#"{"version":1,"action":"synthesize-approved-wake-acknowledgement"}"#;
        assert!(parse_request(wake_ack).is_ok());

        let with_text =
            br#"{"version":1,"action":"synthesize-approved-announcement","text":"hello"}"#;
        assert!(parse_request(with_text).is_err());

        let with_identity =
            br#"{"version":1,"action":"synthesize-approved-announcement","studentName":"A"}"#;
        assert!(parse_request(with_identity).is_err());

        let wrong_action = br#"{"version":1,"action":"read-student-record"}"#;
        assert!(parse_request(wrong_action).is_err());
    }

    #[test]
    fn rejects_oversized_and_empty_payloads() {
        assert!(parse_request(&[]).is_err());
        assert!(parse_request(&vec![b'x'; MAX_REQUEST_BYTES + 1]).is_err());
    }

    #[test]
    fn native_message_frame_round_trips_without_text_logging() {
        let response = error_response("ENGINE_UNAVAILABLE");
        let mut output = Vec::new();
        write_frame(&mut output, &response).unwrap();
        let mut input = Cursor::new(output);
        let payload = read_frame(&mut input).unwrap().unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&payload).unwrap();
        assert_eq!(parsed["version"], 1);
        assert_eq!(parsed["ok"], false);
        assert_eq!(parsed["code"], response["code"]);
    }

    #[test]
    fn engine_unavailable_is_explicit_and_fail_closed() {
        let mut last = None;
        let request =
            parse_request(br#"{"version":1,"action":"synthesize-approved-announcement"}"#);
        let config = HostConfig {
            extension_origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop/".to_string(),
            model_dir: None,
            voice_reference_wav: None,
            voice_reference_sha256: None,
            voice_consent_evidence_path: None,
            model_license_evidence_path: None,
            runtime_sha256: None,
            runtime_dlls: None,
            threads: None,
        };
        let mut runtime = Runtime::new(&config);
        let response = handle_request(request, &mut last, &mut runtime);
        assert_eq!(response["code"], "ENGINE_UNAVAILABLE");
    }

    #[test]
    fn rate_limit_rejects_a_second_request_in_the_same_window() {
        let mut last = None;
        let payload = br#"{"version":1,"action":"synthesize-approved-announcement"}"#;
        let config = HostConfig {
            extension_origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop/".to_string(),
            model_dir: None,
            voice_reference_wav: None,
            voice_reference_sha256: None,
            voice_consent_evidence_path: None,
            model_license_evidence_path: None,
            runtime_sha256: None,
            runtime_dlls: None,
            threads: None,
        };
        let mut runtime = Runtime::new(&config);
        let first = handle_request(parse_request(payload), &mut last, &mut runtime);
        let second = handle_request(parse_request(payload), &mut last, &mut runtime);
        assert_eq!(first["code"], "ENGINE_UNAVAILABLE");
        assert_eq!(second["code"], "RATE_LIMITED");
    }
}
