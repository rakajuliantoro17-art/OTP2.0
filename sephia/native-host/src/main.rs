use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};
use std::time::{Duration, Instant};

const MAX_REQUEST_BYTES: usize = 4096;
const MAX_RESPONSE_BYTES: usize = 1024 * 1024;
const MIN_REQUEST_INTERVAL: Duration = Duration::from_secs(2);
const APPROVED_ACTION: &str = "synthesize-approved-announcement";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    version: u8,
    action: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
struct ErrorResponse {
    version: u8,
    ok: bool,
    code: &'static str,
}

impl ErrorResponse {
    fn new(code: &'static str) -> Self {
        Self {
            version: 1,
            ok: false,
            code,
        }
    }
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
    if request.version != 1 || request.action != APPROVED_ACTION {
        return Err(());
    }
    Ok(request)
}

fn handle_request(
    request: Result<Request, ()>,
    last_request: &mut Option<Instant>,
) -> ErrorResponse {
    if request.is_err() {
        return ErrorResponse::new("INVALID_REQUEST");
    }
    let now = Instant::now();
    if last_request.is_some_and(|last| now.duration_since(last) < MIN_REQUEST_INTERVAL) {
        return ErrorResponse::new("RATE_LIMITED");
    }
    *last_request = Some(now);

    // Deliberately fail closed until the audited in-memory Laras runtime is
    // integrated. Never write WAV files or call an HTTP sidecar from this host.
    ErrorResponse::new("ENGINE_UNAVAILABLE")
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

fn write_frame<W: Write>(writer: &mut W, response: &ErrorResponse) -> io::Result<()> {
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
}

fn load_expected_origin() -> io::Result<String> {
    let executable = std::env::current_exe()?;
    let directory = executable.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "native host directory is unavailable",
        )
    })?;
    let config_path = directory.join("sephia-host-config.json");
    let config_text = std::fs::read_to_string(config_path)?;
    let config: HostConfig = serde_json::from_str(&config_text)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    Ok(config.extension_origin)
}

fn run() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let actual_origin = args.get(1).map(String::as_str).unwrap_or("");
    let expected_origin = load_expected_origin()?;
    if !validate_origin(actual_origin, &expected_origin) {
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

    loop {
        let payload = match read_frame(&mut input)? {
            Some(payload) => payload,
            None => return Ok(()),
        };
        let request = parse_request(&payload);
        let response = handle_request(request, &mut last_request);
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
        let response = ErrorResponse::new("ENGINE_UNAVAILABLE");
        let mut output = Vec::new();
        write_frame(&mut output, &response).unwrap();
        let mut input = Cursor::new(output);
        let payload = read_frame(&mut input).unwrap().unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&payload).unwrap();
        assert_eq!(parsed["version"], 1);
        assert_eq!(parsed["ok"], false);
        assert_eq!(parsed["code"], response.code);
    }

    #[test]
    fn engine_unavailable_is_explicit_and_fail_closed() {
        let mut last = None;
        let request =
            parse_request(br#"{"version":1,"action":"synthesize-approved-announcement"}"#);
        let response = handle_request(request, &mut last);
        assert_eq!(response, ErrorResponse::new("ENGINE_UNAVAILABLE"));
    }
}
