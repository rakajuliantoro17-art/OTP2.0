# SEPHIA Stage 34 — Target Panitia PC Benchmark

**Status:** repeatable Windows benchmark script and regression gates implemented; no target-PC benchmark has been executed.

## Benchmark script

After Stage 33 model and voice installation, run PowerShell 7:

    .\sephia\native-host\benchmark-native-host-windows.ps1 -HostExePath "$env:LOCALAPPDATA\SMANSASOO\SEPHIA\sephia-native-host.exe"

The script:
- launches the actual Native Messaging host with the configured extension origin;
- waits for the host's model/voice readiness handshake;
- measures cold startup to ready;
- sends three fixed synthesis requests and measures warm synthesis latency;
- measures process CPU time normalized to total machine capacity;
- reads peak working set;
- validates sample rate, channels, duration, and PCM byte ceiling;
- decodes and clears each response in memory without writing audio files.

Default acceptance limits:
- cold startup: 60 seconds maximum;
- warm synthesis p95: 8 seconds maximum;
- CPU: 85% of total machine capacity maximum;
- peak working set: 1,024 MiB maximum;
- PCM buffer: 700 KiB maximum.

The benchmark deliberately does not measure Chrome playback-start latency or human voice quality. Those remain separate acceptance steps.

## Required manual checks

1. Pair the actual HTTPS Panitia tab using the Chrome extension.
2. Activate SEPHIA manually; confirm the avatar and audio behavior.
3. Trigger a synthetic eligible notification and confirm one generic announcement only.
4. Press STOP during inference and playback; confirm no stale speech.
5. Reload/navigate/close Chrome; confirm the bridge disconnects and SEPHIA returns OFF.
6. Inspect the host process and network activity. There must be no external TTS request, local HTTP listener, generated audio file, transcript, or Laras dump file.
7. Obtain two independent listener approvals for the adult feminine Indonesian voice.
8. Save the benchmark JSON report and human acceptance record as release evidence; do not store audio output.

## Exit criteria

The target PC passes only when all numeric limits pass, the Chrome playback-start test is acceptable, two listeners approve voice quality, consent/license evidence is reviewed, and privacy/network inspection finds no prohibited activity. A passing benchmark alone does not authorize production deployment.
