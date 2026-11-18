use base64::engine::general_purpose::STANDARD;
use base64::Engine as Base64Engine;
use laras::onnx::{wav, Engine as LarasEngine, Params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

use crate::HostConfig;

const APPROVED_PHRASE: &str = "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.";
const APPROVED_WAKE_ACK: &str = "Ya, Panitia. SEPHIA siap membantu.";
const SAMPLE_RATE: usize = 24_000;
const MAX_AUDIO_BYTES: usize = 700 * 1024;
const MAX_VOICE_REFERENCE_BYTES: u64 = 10 * 1024 * 1024;
const MIN_VOICE_REFERENCE_DURATION_MS: u64 = 1_000;
const MAX_VOICE_REFERENCE_DURATION_MS: u64 = 20_000;
const MIN_DURATION_MS: u64 = 250;
const MAX_DURATION_MS: u64 = 15_000;

const MODEL_PROVENANCE_JSON: &str =
    include_str!("../../docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelProvenance {
    model_bundle_bytes: u64,
    model_bundle_sha256: String,
    files: Vec<ModelFile>,
}

#[derive(Debug, Deserialize)]
struct ModelFile {
    path: String,
    bytes: u64,
    sha256: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuccessResponse {
    version: u8,
    ok: bool,
    format: &'static str,
    sample_rate: u32,
    channels: u8,
    duration_ms: u64,
    audio_base64: String,
}

pub struct LocalNeuralEngine {
    engine: LarasEngine,
}

fn sha256_file(path: &Path) -> anyhow::Result<String> {
    let bytes = fs::read(path)?;
    Ok(hex::encode(Sha256::digest(&bytes)))
}

fn is_sha256(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|b| b.is_ascii_hexdigit())
}

fn safe_local_path(value: &str) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(value);
    anyhow::ensure!(path.is_absolute(), "SEPHIA runtime paths must be absolute");
    let text = path.to_string_lossy();
    anyhow::ensure!(
        !text.starts_with("\\\\"),
        "UNC/network paths are not allowed"
    );
    Ok(path)
}

fn verify_model_bundle(model_dir: &Path) -> anyhow::Result<()> {
    let provenance: ModelProvenance = serde_json::from_str(MODEL_PROVENANCE_JSON)?;
    anyhow::ensure!(
        !provenance.files.is_empty(),
        "model provenance has no files"
    );

    let mut total_bytes = 0_u64;
    let mut canonical_files: Vec<&ModelFile> = provenance.files.iter().collect();
    for file in &provenance.files {
        anyhow::ensure!(
            !file.path.starts_with('/')
                && !file.path.contains('\\')
                && !file
                    .path
                    .split('/')
                    .any(|part| part == ".." || part.is_empty()),
            "unsafe model path in pinned provenance"
        );
        anyhow::ensure!(is_sha256(&file.sha256), "invalid pinned model SHA-256");
        let path = model_dir.join(&file.path);
        let metadata = fs::metadata(&path)?;
        anyhow::ensure!(metadata.is_file(), "model file is missing or not a file");
        anyhow::ensure!(
            metadata.len() == file.bytes,
            "model file byte size mismatch"
        );
        anyhow::ensure!(
            sha256_file(&path)? == file.sha256,
            "model file SHA-256 mismatch"
        );
        total_bytes = total_bytes
            .checked_add(file.bytes)
            .ok_or_else(|| anyhow::anyhow!("model bundle byte count overflow"))?;
    }

    anyhow::ensure!(
        total_bytes == provenance.model_bundle_bytes,
        "model bundle total size mismatch"
    );
    canonical_files.sort_by(|a, b| a.path.cmp(&b.path));
    let canonical = canonical_files
        .iter()
        .map(|file| format!("{}|{}|{}", file.path, file.bytes, file.sha256))
        .collect::<Vec<_>>()
        .join("\n");
    let digest = hex::encode(Sha256::digest(canonical.as_bytes()));
    anyhow::ensure!(
        digest == provenance.model_bundle_sha256,
        "pinned model bundle digest mismatch"
    );
    Ok(())
}

impl LocalNeuralEngine {
    pub fn load(config: &HostConfig) -> anyhow::Result<Self> {
        // Laras has optional diagnostic dump hooks. Scrub them before ONNX
        // Runtime can spawn worker threads; otherwise debug builds could write
        // PCM, voice embeddings, conditioning tensors, or latents to disk.
        for name in [
            "LARAS_DUMP_PCM",
            "LARAS_DUMP_VOICE",
            "LARAS_DUMP_TEMB",
            "LARAS_DUMP_COND",
            "LARAS_DUMP_FLOW0",
            "LARAS_DUMP_LATENTS",
            "LARAS_LATENTS_IN",
            "LARAS_TRACE",
        ] {
            // SAFETY: this runs during single-threaded native-host startup,
            // before ONNX Runtime or any inference worker threads are created.
            unsafe {
                std::env::remove_var(name);
            }
        }

        let model_dir = safe_local_path(
            config
                .model_dir
                .as_deref()
                .ok_or_else(|| anyhow::anyhow!("model_dir is not configured"))?,
        )?;
        let voice_path = safe_local_path(
            config
                .voice_reference_wav
                .as_deref()
                .ok_or_else(|| anyhow::anyhow!("voice_reference_wav is not configured"))?,
        )?;
        let consent_path = safe_local_path(
            config
                .voice_consent_evidence_path
                .as_deref()
                .ok_or_else(|| anyhow::anyhow!("voice consent evidence is not configured"))?,
        )?;
        let license_path = safe_local_path(
            config
                .model_license_evidence_path
                .as_deref()
                .ok_or_else(|| anyhow::anyhow!("model license evidence is not configured"))?,
        )?;

        anyhow::ensure!(
            consent_path.is_file(),
            "voice consent evidence file is missing"
        );
        anyhow::ensure!(
            license_path.is_file(),
            "model license evidence file is missing"
        );
        anyhow::ensure!(voice_path.is_file(), "voice reference WAV is missing");
        let voice_metadata = fs::metadata(&voice_path)?;
        anyhow::ensure!(
            (1_024..=MAX_VOICE_REFERENCE_BYTES).contains(&voice_metadata.len()),
            "voice reference WAV must be between 1 KiB and 10 MiB"
        );
        verify_model_bundle(&model_dir)?;

        let expected_voice_hash = config
            .voice_reference_sha256
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("voice reference SHA-256 is not configured"))?;
        anyhow::ensure!(
            is_sha256(expected_voice_hash),
            "voice reference SHA-256 is invalid"
        );
        anyhow::ensure!(
            sha256_file(&voice_path)? == expected_voice_hash,
            "voice reference SHA-256 mismatch"
        );

        let expected_runtime_hash = config
            .runtime_sha256
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("native host SHA-256 is not configured"))?;
        anyhow::ensure!(
            is_sha256(expected_runtime_hash),
            "native host SHA-256 is invalid"
        );
        let executable = std::env::current_exe()?;
        anyhow::ensure!(
            sha256_file(&executable)? == expected_runtime_hash,
            "native host binary SHA-256 mismatch"
        );
        let executable_dir = executable
            .parent()
            .ok_or_else(|| anyhow::anyhow!("native host directory is unavailable"))?;
        for dependency in config.runtime_dlls.as_deref().unwrap_or_default() {
            anyhow::ensure!(
                dependency.file_name.to_ascii_lowercase().ends_with(".dll")
                    && !dependency.file_name.contains('/')
                    && !dependency.file_name.contains('\\')
                    && dependency.file_name != ".dll",
                "invalid native runtime dependency name"
            );
            anyhow::ensure!(
                is_sha256(&dependency.sha256),
                "native runtime dependency SHA-256 is invalid"
            );
            let dependency_path = executable_dir.join(&dependency.file_name);
            anyhow::ensure!(
                sha256_file(&dependency_path)? == dependency.sha256,
                "native runtime dependency SHA-256 mismatch"
            );
        }

        let threads = config.threads.unwrap_or(2);
        anyhow::ensure!(
            (1..=8).contains(&threads),
            "ONNX thread count must be between 1 and 8"
        );
        let mut engine = LarasEngine::new(&model_dir, threads)?;
        let reference = wav::read_mono(&voice_path)?;
        let reference_duration_ms = (reference.len() as u64 * 1000) / SAMPLE_RATE as u64;
        anyhow::ensure!(
            (MIN_VOICE_REFERENCE_DURATION_MS..=MAX_VOICE_REFERENCE_DURATION_MS)
                .contains(&reference_duration_ms),
            "voice reference duration must be between 1 and 20 seconds"
        );
        engine.set_voice(&reference)?;

        Ok(Self { engine })
    }

    pub fn synthesize(&mut self, action: &str) -> Result<SuccessResponse, &'static str> {
        let phrase = match action {
            "synthesize-approved-announcement" => APPROVED_PHRASE,
            "synthesize-approved-wake-acknowledgement" => APPROVED_WAKE_ACK,
            _ => return Err("INVALID_REQUEST"),
        };
        let (samples, diag, _latents) = self
            .engine
            .synthesize(phrase, &Params::default(), None)
            .map_err(|_| "SYNTHESIS_FAILED")?;

        if samples.is_empty()
            || diag.rms < 0.005
            || samples.iter().any(|sample| !sample.is_finite())
        {
            return Err("SYNTHESIS_FAILED");
        }
        let duration_ms = (samples.len() as u64 * 1000) / SAMPLE_RATE as u64;
        if !(MIN_DURATION_MS..=MAX_DURATION_MS).contains(&duration_ms) {
            return Err("OUTPUT_TOO_LARGE");
        }

        let mut pcm = Vec::with_capacity(samples.len() * 2);
        for sample in samples {
            let value = (sample.clamp(-1.0, 1.0) * 32767.0).round() as i16;
            pcm.extend_from_slice(&value.to_le_bytes());
        }
        if pcm.len() > MAX_AUDIO_BYTES {
            return Err("OUTPUT_TOO_LARGE");
        }

        Ok(SuccessResponse {
            version: 1,
            ok: true,
            format: "pcm_s16le",
            sample_rate: SAMPLE_RATE as u32,
            channels: 1,
            duration_ms,
            audio_base64: STANDARD.encode(pcm),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pinned_model_provenance_digest_is_self_consistent() {
        let provenance: ModelProvenance = serde_json::from_str(MODEL_PROVENANCE_JSON).unwrap();
        let mut files: Vec<&ModelFile> = provenance.files.iter().collect();
        files.sort_by(|a, b| a.path.cmp(&b.path));
        let canonical = files
            .iter()
            .map(|file| format!("{}|{}|{}", file.path, file.bytes, file.sha256))
            .collect::<Vec<_>>()
            .join("\n");
        assert_eq!(
            hex::encode(Sha256::digest(canonical.as_bytes())),
            provenance.model_bundle_sha256
        );
        assert_eq!(
            files.iter().map(|file| file.bytes).sum::<u64>(),
            provenance.model_bundle_bytes
        );
    }

    #[test]
    fn approved_phrase_is_generic_and_has_no_student_identity() {
        assert!(APPROVED_PHRASE.contains("Perhatian, Panitia"));
        assert!(!APPROVED_PHRASE.contains("nama"));
        assert!(!APPROVED_PHRASE.contains("kelas"));
        assert!(!APPROVED_PHRASE.contains("OTP siswa"));
        assert_eq!(APPROVED_WAKE_ACK, "Ya, Panitia. SEPHIA siap membantu.");
        assert!(!APPROVED_WAKE_ACK.contains("nama"));
        assert!(!APPROVED_WAKE_ACK.contains("kelas"));
    }
}
