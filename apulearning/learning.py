# load all necessary libraries
import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf
import subprocess
import torch
import urllib.request
from pathlib import Path
from IPython.display import Audio, display
from transformers import (
    WhisperFeatureExtractor,
    WhisperForConditionalGeneration,
    WhisperProcessor,
)

plt.rcParams["figure.dpi"] = 150
plt.rcParams["font.size"] = 12

print(torch.__version__, librosa.__version__)
#
# %% Block 1 - Waveforms
# Notes:
# One frame = One sample
# frame per second = sample per second
#
# 1. a microphone will capture the value one sample 48000 timer per second.
#    +|      •  •
#  |    •      •
# 0|--•----------•----------•--   → time
#  |               •      •
# -|                 •  •
#   ↑ each dot = one sample (one snapshot)

# waveform: the overall signal is caled the waveform.
# the 48000 is the sample rate of the recording device.
# sample = sample rate * time
# my voice will have frequency which is calculated using ?
#
# Tasks:
# 1. download native reference clips with transcripts: "bonjour" and "comment ça va" (Lingua Libre, 48 kHz wav); the transcript is the ground truth
# 2. record myself saying the same two phrases (phone voice memo, .m4a): bonjour.m4a, comosava.m4a
# 3. convert my recording to wav with ffmpeg
# 4. load with sr=None; print shape, channels, sample rate, duration, min/max
# 5. convert to mono
# 6. visualize my recording at each stage: int16 samples in the wav, librosa floats in -1..1, peak-normalized
# 7. trim silence, peak-normalize, plot reference and mine on the same time axis
# 8. zoom into ~30 ms of a vowel (the "ou" in bonjour) and of an s sound (the "ç" in ça); play all clips
# 9. write notes: how the clips differ (length, loudness, shape)
# 10. optional: flip the sign and listen; subtract the clips and see why that fails
#
# %% task 1: download native reference clips with transcripts: "bonjour" and "comment ça va" (Lingua Libre, 48 kHz wav); the transcript is the ground truth
DATA = Path(globals().get("__file__", "learning.py")).resolve().parent / "data"
DATA.mkdir(exist_ok=True)

REFERENCE = {
    "bonjour": "https://upload.wikimedia.org/wikipedia/commons/a/a5/LL-Q150_%28fra%29-LoquaxFR-bonjour.wav",
    "comment ça va": "https://upload.wikimedia.org/wikipedia/commons/8/86/LL-Q150_%28fra%29-LoquaxFR-comment_%C3%A7a_va.wav",
}

reference_paths = {}
for transcript, url in REFERENCE.items():
    path = DATA / f"ref_{transcript.replace(' ', '_')}.wav"
    if not path.exists():
        request = urllib.request.Request(
            url, headers={"User-Agent": "learning-notebook/0.1 python-urllib"}
        )
        path.write_bytes(urllib.request.urlopen(request).read())
    reference_paths[transcript] = path
    print(transcript, "->", path.name, path.stat().st_size, "bytes")
    display(Audio(str(path)))

# %% task 2: record myself saying the same two phrases (phone voice memo, .m4a): bonjour.m4a, comosava.m4a
MY_RECORDINGS = {"bonjour": "bonjour.m4a", "comment ça va": "comosava.m4a"}
my_m4a_paths = {t: DATA / name for t, name in MY_RECORDINGS.items()}
missing = [p.name for p in my_m4a_paths.values() if not p.exists()]
if missing:
    raise FileNotFoundError(f"record these and put them in {DATA}: {missing}")

# %% task 3: convert my recording to wav with ffmpeg
my_wav_paths = {}
for transcript, m4a in my_m4a_paths.items():
    wav = m4a.with_suffix(".wav")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(m4a),
            "-c:a",
            "pcm_s16le",
            str(wav),
        ],
        check=True,
    )
    my_wav_paths[transcript] = wav
    print(
        f"{m4a.name}: {m4a.stat().st_size} bytes -> {wav.name}: {wav.stat().st_size} bytes"
    )

# %% task 4: load with sr=None; print shape, channels, sample rate, duration, min/max
clips = {}
for transcript in REFERENCE:
    for who, path in (
        ("ref", reference_paths[transcript]),
        ("me", my_wav_paths[transcript]),
    ):
        y, sr = librosa.load(path, sr=None, mono=False)
        clips[(who, transcript)] = (y, sr)
        channels = 1 if y.ndim == 1 else y.shape[0]
        print(
            f"{who:3} {transcript:14} shape={y.shape} channels={channels} sr={sr} "
            f"duration={y.shape[-1] / sr:.2f}s min={y.min():.3f} max={y.max():.3f}"
        )

# %% task 5: convert to mono
mono = {}
for key, (y, sr) in clips.items():
    mono[key] = (librosa.to_mono(y), sr)
    print(key, y.shape, "->", mono[key][0].shape)

# %% task 6: visualize my recording at each stage: int16 samples in the wav, librosa floats in -1..1, peak-normalized
fig, axes = plt.subplots(3, 2, figsize=(14, 8), sharex="col")
for col, (transcript, wav) in enumerate(my_wav_paths.items()):
    raw, sr = sf.read(wav, dtype="int16")
    if raw.ndim > 1:
        raw = raw[:, 0]
    floats = mono[("me", transcript)][0]
    peak = floats / np.abs(floats).max()
    times = np.arange(len(raw)) / sr
    print(
        f"{transcript}: m4a {my_m4a_paths[transcript].stat().st_size} bytes, wav {wav.stat().st_size} bytes"
    )
    axes[0, col].plot(times, raw)
    axes[0, col].set_title(f"me: {transcript} | int16 samples in the wav (channel 0)")
    axes[1, col].plot(times, floats)
    axes[1, col].set_ylim(-1, 1)
    axes[1, col].set_title("librosa floats in -1..1 (mono)")
    axes[2, col].plot(times, peak)
    axes[2, col].set_ylim(-1, 1)
    axes[2, col].set_title("peak-normalized")
    axes[2, col].set_xlabel("time (s)")
fig.tight_layout()
plt.show()

# %% task 7: trim silence, peak-normalize, plot reference and mine on the same time axis
prepared = {}
for key, (y, sr) in mono.items():
    trimmed, _ = librosa.effects.trim(y, top_db=30)
    prepared[key] = (trimmed / np.abs(trimmed).max(), sr)

fig, axes = plt.subplots(2, 2, figsize=(14, 6), sharex="col", sharey=True)
for col, transcript in enumerate(REFERENCE):
    for row, who in enumerate(("ref", "me")):
        y, sr = prepared[(who, transcript)]
        axes[row, col].plot(np.arange(len(y)) / sr, y)
        axes[row, col].set_title(f"{who}: {transcript} ({len(y) / sr:.2f} s)")
    axes[1, col].set_xlabel("time (s)")
fig.tight_layout()
plt.show()

# %% task 8: zoom into ~30 ms of a vowel (the "ou" in bonjour) and of an s sound (the "ç" in ça); play all clips
ZOOM = {"bonjour": ("ou", 0.62), "comment ça va": ("ç", 0.46)}
WINDOW = 0.03

fig, axes = plt.subplots(2, 2, figsize=(14, 6))
for col, (transcript, (sound, fraction)) in enumerate(ZOOM.items()):
    for row, who in enumerate(("ref", "me")):
        y, sr = prepared[(who, transcript)]
        center = int(fraction * len(y))
        half = int(WINDOW * sr / 2)
        segment = y[max(center - half, 0) : center + half]
        axes[row, col].plot(np.arange(len(segment)) / sr * 1000, segment)
        axes[row, col].set_title(
            f"{who}: '{sound}' in {transcript}, 30 ms around {center / sr:.2f} s"
        )
    axes[1, col].set_xlabel("time (ms)")
fig.tight_layout()
plt.show()

for (who, transcript), (y, sr) in prepared.items():
    print(who, transcript)
    display(Audio(y, rate=sr))

# %% task 9: write notes: how the clips differ (length, loudness, shape)
for transcript in REFERENCE:
    for who in ("ref", "me"):
        y, sr = mono[(who, transcript)]
        trimmed = prepared[(who, transcript)][0]
        rms = np.sqrt(np.mean(y**2))
        print(
            f"{who:3} {transcript:14} sr={sr} full={len(y) / sr:.2f}s speech={len(trimmed) / sr:.2f}s "
            f"peak={np.abs(y).max():.3f} rms={rms:.4f}"
        )
# Notes:
#

# %% task 10: optional: flip the sign and listen; subtract the clips and see why that fails
y, sr = prepared[("ref", "bonjour")]
print("original, then flipped")
display(Audio(y, rate=sr))
display(Audio(-y, rate=sr))

ref, ref_sr = prepared[("ref", "bonjour")]
mine, my_sr = prepared[("me", "bonjour")]
if my_sr != ref_sr:
    mine = librosa.resample(mine, orig_sr=my_sr, target_sr=ref_sr)
length = min(len(ref), len(mine))
difference = ref[:length] - mine[:length]
fig, axes = plt.subplots(3, 1, figsize=(10, 6), sharex=True, sharey=True)
for ax, y, title in zip(
    axes, (ref[:length], mine[:length], difference), ("ref", "me", "ref - me")
):
    ax.plot(np.arange(length) / ref_sr, y)
    ax.set_title(title)
axes[2].set_xlabel("time (s)")
fig.tight_layout()
plt.show()
# display(Audio(difference, rate=ref_sr))


# %% Block 1 - Observations
# Q1. bonjour.wav is 294,990 bytes. It holds 1.54 s of 16-bit stereo audio at 48,000 Hz. Show the calculation
#     that predicts this size. Why is the .m4a only 17,291 bytes?
# My answer: (skipped)
# Answer: 1.536 s x 48,000 samples x 2 bytes (16-bit) x 2 channels = 294,912 bytes, plus 78 bytes of header
#     (format information at the start of the file). The wav is ~17x bigger than the m4a because wav stores
#     every sample, while AAC is lossy compression (it throws away detail the ear can't hear).
#
# Q2. A sample value of 0 means silence. What does a value of -0.3 mean physically (think of the air and the
#     microphone membrane)? Is -0.3 "quieter" than +0.3?
# My answer: -0.3 is the air vibrating after there has been a positive vibration from speakin, when i speak
#     there is a + vibration and once i close my mouth there is a -ve vibration.
# Answer: a sample (one number: the air pressure relative to normal at one instant) is + when the air is
#     squeezed together (microphone membrane pushed in) and - when it is spread apart (membrane pulled out).
#     The negatives do not come after speaking: every vibration swings both ways, about 113 times per second
#     for my voice. -0.3 is as loud as +0.3: loudness is the distance from 0, in either direction.
#
# Q3. After librosa.load, my bonjour peaks at 0.626. Was it normalized? What does peak normalization change,
#     and what does it NOT change about the waveform?
# My answer: it is not normalized it is scaled. It is dived by a numver why that number i dont know? maybe that
#     number represents 22khz which is the default input audio sample rate? peak normalization just scales it,
#     if dont know what it does not change
# Answer: scaled, not normalized. librosa divides the 16-bit integers by 32,768 (the largest value a 16-bit
#     sample can hold), not by 22 kHz. A waveform plot has two axes: up/down is amplitude (how big each sample
#     is; the 16-bit limit lives here), left/right is time (the sample rate lives here). Peak normalization
#     (scaling so the loudest point becomes exactly 1) multiplies every sample by the same number, so shape,
#     timing, pitch and the loudness of one part relative to another stay the same.
#
# Q4. My phone saved stereo and we averaged it to mono. Why did we lose nothing here? Describe one recording
#     where averaging the channels would be the wrong choice.
# My answer: it averages value from both channel.
# Answer: stereo (two channels recorded at once, left and right) from my phone holds two identical channels
#     (one microphone copied twice), and the average of two identical numbers is the same number, so mono
#     (one channel) lost nothing. Averaging is wrong when the channels differ: a call recording with one
#     speaker per channel (the voices get mixed), or one broken or noisy channel (it halves my voice and adds
#     the noise).
#
# Q5. In the 30 ms zoom of the "ou" in bonjour, suppose you count about 3.4 repeats of the pattern. What is the
#     pitch in Hz? Is that a typical male or female voice?
# My answer: dont know
# Answer: frequency (repeats per second; Hz) = repeats / time = 3.4 / 0.030 s = 113 Hz, a typical male voice
#     (roughly 85-180 Hz). One cycle (one full repeat of the pattern) lasts 1 / 113 = 8.8 ms, the period
#     (time for one repeat). Each repeat is one vocal-cord pulse, a tall spike, followed by weaker ringing of
#     the mouth and throat: that is the "big signal with a small signal inside" in the plots.
#
# Q6. Why does the zoom on the "ç" in ça look so different from the zoom on the "ou"? What is physically
#     different about how my mouth makes the two sounds?
# My answer: maybe the way we pronounce them?
# Answer: "ou" is voiced (made with the vocal cords vibrating), so the waveform repeats regularly. "ç" is
#     unvoiced (made without the vocal cords): air is forced through a narrow gap between tongue and teeth and
#     swirls randomly, so it looks like noise (a random mix of many tones). Check: hand on throat, "zzzz"
#     buzzes, "ssss" does not.
#
# Q7. The sign-flipped clip sounded the same as the original. What does that tell you about which properties
#     of a waveform carry the meaning of speech?
# My answer: dont know
# Answer: the meaning is not in single sample values but in the pattern over time: how fast it repeats
#     (pitch), which frequencies are mixed in (which vowel or consonant) and how that mix changes. Flipping
#     keeps all of that. That is why speech models read spectrograms (pictures of which frequencies are present
#     at each moment), not raw samples.
#
# Q8. I and the reference said the same word, yet "ref - me" is a big messy signal, not near zero. Give three
#     reasons why.
# My answer: recoding device, device distance, environment noise
# Answer: device and distance are right; background noise is not (my silences are exactly 0). The bigger
#     reasons: timing (I speak slower: 0.76 s vs 0.61 s, so the same sounds happen at different moments) and
#     pitch (different voices, so the cycles drift apart). Half a cycle out of step (4.4 ms) and my peaks meet
#     the reference's troughs, so subtracting doubles the signal instead of cancelling it.
#
# Q9. The silent parts of my clips are exactly 0, but the reference's are not. Why? Could that difference cause
#     a problem when a program compares the two clips?
# My answer: yes i think it does.
# Answer: my phone's noise suppression (processing that removes background sound) replaces quiet parts with
#     exact zeros. Problem: log-mel features (Block 5) take the logarithm of the energy and log(0) is
#     -infinity, so code must add a small floor value; real recordings never contain exact zeros. Digital
#     silence is also something a model trained on normal recordings never saw.
#
# Q10. Whisper needs 16,000 Hz audio. My trimmed bonjour is 0.76 s at 48,000 Hz. How many samples is that now,
#      and how many after resampling to 16,000 Hz? What could get lost?
# My answer: dont know
# Answer: 0.76 x 48,000 = 36,480 samples now; 0.76 x 16,000 = 12,160 after resampling (changing a recording's
#     sample rate). A sample rate captures frequencies only up to half of itself (the Nyquist frequency), so
#     16 kHz drops everything above 8 kHz, like part of the "ç" hiss. Speech stays understandable below 8 kHz,
#     which is why Whisper uses 16 kHz.

# %% Block 2 - Sample rate
# Notes:
#
# Tasks:
# 1. for every clip print sample rate, number of samples and duration; check duration = samples / sample rate
# 2. compute bytes per second of a wav (sample rate x bytes per sample x channels) and predict the size of bonjour.wav
# 3. plot 5 ms of the "ou" in my bonjour with a dot for every sample, at 48 kHz and at every 3rd sample (16 kHz)
# 4. count the samples in one vocal-cord cycle and compute my pitch as sample rate / samples per cycle
# 5. make pure tones (440 Hz, 4 kHz, 7 kHz, 9 kHz) sampled at 16 kHz; plot and listen
# 6. explain why the 9 kHz tone comes out as 7 kHz (Nyquist limit = half the sample rate, aliasing)
# 7. find how much of my "ç" energy is above 8 kHz, i.e. what Whisper's 16 kHz would drop
# 8. write observations
#
# %% task 1: for every clip print sample rate, number of samples and duration; check duration = samples / sample rate
wav_paths = {}
for transcript in REFERENCE:
    wav_paths[("ref", transcript)] = reference_paths[transcript]
    wav_paths[("me", transcript)] = my_wav_paths[transcript]

for (who, transcript), (y, sr) in clips.items():
    samples = y.shape[-1]
    info = sf.info(wav_paths[(who, transcript)])
    print(
        f"{who:3} {transcript:14} sr={sr} samples={samples} "
        f"samples/sr={samples / sr:.4f}s  file says {info.duration:.4f}s"
    )

# %% task 2: compute bytes per second of a wav (sample rate x bytes per sample x channels) and predict the size of bonjour.wav
for (who, transcript), path in wav_paths.items():
    info = sf.info(path)
    bytes_per_sample = 2 if info.subtype == "PCM_16" else None
    bytes_per_second = info.samplerate * bytes_per_sample * info.channels
    predicted = info.frames * bytes_per_sample * info.channels
    actual = path.stat().st_size
    print(
        f"{who:3} {transcript:14} {info.samplerate} Hz x {bytes_per_sample} B x {info.channels} ch "
        f"= {bytes_per_second} B/s | predicted audio {predicted} B, file {actual} B, header {actual - predicted} B"
    )

for transcript, m4a in my_m4a_paths.items():
    duration = sf.info(my_wav_paths[transcript]).duration
    print(
        f"me  {transcript:14} m4a: {m4a.stat().st_size / duration:.0f} B/s ({m4a.stat().st_size * 8 / duration / 1000:.0f} kbit/s)"
    )

# %% task 3: plot 5 ms of the "ou" in my bonjour with a dot for every sample, at 48 kHz and at every 3rd sample (16 kHz)
y, sr = prepared[("me", "bonjour")]
center = int(ZOOM["bonjour"][1] * len(y))
half = int(0.005 * sr / 2)
segment = y[center - half : center + half]
times_ms = np.arange(len(segment)) / sr * 1000

fig, axes = plt.subplots(2, 1, figsize=(14, 6), sharex=True, sharey=True)
axes[0].plot(times_ms, segment, color="lightgray")
axes[0].plot(times_ms, segment, ".", markersize=4)
axes[0].set_title(f"me: 'ou' in bonjour, 5 ms at {sr} Hz = {len(segment)} samples")
axes[1].plot(times_ms, segment, color="lightgray")
axes[1].plot(times_ms[::3], segment[::3], "o", markersize=4)
axes[1].set_title(f"every 3rd sample = {sr // 3} Hz: {len(segment[::3])} samples")
axes[1].set_xlabel("time (ms)")
fig.tight_layout()
plt.show()

# %% task 4: count the samples in one vocal-cord cycle and compute my pitch as sample rate / samples per cycle
from scipy.signal import find_peaks

fig, axes = plt.subplots(2, 1, figsize=(14, 6))
for ax, who in zip(axes, ("ref", "me")):
    y, sr = prepared[(who, "bonjour")]
    center = int(ZOOM["bonjour"][1] * len(y))
    half = int(0.03 * sr / 2)
    segment = y[center - half : center + half]
    peaks, _ = find_peaks(segment, height=0.5 * segment.max(), distance=int(sr / 400))
    gaps = np.diff(peaks)
    samples_per_cycle = np.median(gaps)
    pitch = sr / samples_per_cycle
    print(f"{who:3} spike positions {peaks.tolist()}")
    print(
        f"    samples between spikes {gaps.tolist()} -> median {samples_per_cycle:.0f}"
    )
    print(
        f"    pitch = {sr} / {samples_per_cycle:.0f} = {pitch:.0f} Hz, one cycle = {1000 / pitch:.1f} ms"
    )
    ax.plot(np.arange(len(segment)), segment)
    ax.plot(peaks, segment[peaks], "rv")
    ax.set_title(
        f"{who}: 'ou' in bonjour, 30 ms | {samples_per_cycle:.0f} samples per cycle -> {pitch:.0f} Hz"
    )
axes[1].set_xlabel("sample number")
fig.tight_layout()
plt.show()

# %% task 5: make pure tones (440 Hz, 4 kHz, 7 kHz, 9 kHz) sampled at 16 kHz; plot and listen
# spoken sound is made up of different tones. And the recorder that collects a sample combines all these tones into one sample.
# In this task we are using constant sounds (tones at different freq) and using whisper's sample rate to see how well the recorded sample (the dots)
# caputre the actual sound i.e the tones.
# Conclusion: as you can see that the high tones are not properly caputures at 16khz sampling rate.
TONE_SR = 16000
TONES = [440, 4000, 7000, 9000]
t = np.arange(TONE_SR) / TONE_SR
tones = {f: 0.3 * np.sin(2 * np.pi * f * t) for f in TONES}

fig, axes = plt.subplots(2, 2, figsize=(14, 6))
fine_t = np.linspace(0, 0.002, 4000)
for ax, (f, tone) in zip(axes.flat, tones.items()):
    n = int(0.002 * TONE_SR)
    ax.plot(
        fine_t * 1000,
        0.3 * np.sin(2 * np.pi * f * fine_t),
        color="lightgray",
        label="real wave",
    )
    ax.plot(t[:n] * 1000, tone[:n], "o-", markersize=4, label="samples joined by lines")
    ax.legend(loc="upper right", fontsize=8)
    ax.set_title(f"{f} Hz sampled at {TONE_SR} Hz: {TONE_SR / f:.2f} samples per cycle")
    ax.set_xlabel("time (ms)")
fig.tight_layout()
plt.show()

tone_dir = DATA / "tones"
tone_dir.mkdir(exist_ok=True)
for f, tone in tones.items():
    sf.write(tone_dir / f"tone_{f}Hz_at_{TONE_SR}.wav", tone, TONE_SR)
    display(Audio(tone, rate=TONE_SR))
print("saved to", tone_dir)

# %% task 6: explain why the 9 kHz tone comes out as 7 kHz (Nyquist limit = half the sample rate, aliasing)
for f, tone in tones.items():
    spectrum = np.abs(np.fft.rfft(tone))
    freqs = np.fft.rfftfreq(len(tone), 1 / TONE_SR)
    print(
        f"made {f:5} Hz -> strongest frequency in the samples: {freqs[spectrum.argmax()]:.0f} Hz"
    )

fine_t = np.linspace(0, 0.001, 2000)
sample_t = np.arange(0, 0.001, 1 / TONE_SR)
fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(
    fine_t * 1000,
    np.sin(2 * np.pi * 9000 * fine_t),
    label="real 9000 Hz sound",
    alpha=0.6,
)
ax.plot(
    fine_t * 1000, -np.sin(2 * np.pi * 7000 * fine_t), label="7000 Hz sound", alpha=0.6
)
ax.plot(
    sample_t * 1000,
    np.sin(2 * np.pi * 9000 * sample_t),
    "ko",
    label=f"samples at {TONE_SR} Hz",
)
ax.set_title(
    f"1 ms: the {TONE_SR} Hz samples of a 9000 Hz tone fit a 7000 Hz tone exactly"
)
ax.set_xlabel("time (ms)")
ax.legend(loc="upper right")
fig.tight_layout()
plt.show()


# %% task 7: find how much of my "ç" energy is above 8 kHz, i.e. what Whisper's 16 kHz would drop
def energy_above(segment, sr, cutoff=8000):
    spectrum = np.abs(np.fft.rfft(segment * np.hanning(len(segment)))) ** 2
    freqs = np.fft.rfftfreq(len(segment), 1 / sr)
    return spectrum[freqs >= cutoff].sum() / spectrum.sum(), freqs, spectrum


fig, axes = plt.subplots(1, 2, figsize=(14, 5), sharey=True)
for ax, (transcript, (sound, fraction)) in zip(axes, ZOOM.items()):
    for who in ("ref", "me"):
        y, sr = prepared[(who, transcript)]
        center = int(fraction * len(y))
        half = int(0.03 * sr / 2)
        share, freqs, spectrum = energy_above(y[center - half : center + half], sr)
        print(
            f"{who:3} '{sound}' in {transcript:14}: {share:6.1%} of the energy is above 8 kHz"
        )
        ax.plot(
            freqs / 1000,
            10 * np.log10(spectrum + 1e-12),
            label=f"{who} ({share:.0%} above 8 kHz)",
            alpha=0.7,
        )
    ax.axvline(8, color="red", linestyle="--")
    ax.set_title(f"'{sound}' in {transcript}: energy per frequency (red line = 8 kHz)")
    ax.set_xlabel("frequency (kHz)")
    ax.legend()
axes[0].set_ylabel("energy (dB)")
fig.tight_layout()
plt.show()

# %% task 8: write observations
#

# %% Block 2 - Observations
# Q1. bonjour.wav has 73,728 samples at 48,000 Hz. How long is it? How many samples would the same recording
#     have at 16,000 Hz?
# My answer: it is 73728/48000 samples long. for the 2nd part divide by 16000 instead.
# Answer: number of samples = sample rate x duration. 73,728 / 48,000 = 1.536 s. At 16,000 Hz the same 1.536 s
#     is 1.536 x 16,000 = 24,576 samples, a third as many (multiply the duration, don't divide the samples).
#
# Q2. Task 2 predicted 294,912 bytes of audio for bonjour.wav. Show the calculation. Why is the real file
#     78 bytes bigger?
# My answer: dont know dont care
# Answer: a wav stores every sample: 48,000 x 2 bytes (16-bit) x 2 channels = 192,000 bytes per second, and
#     73,728 samples x 2 bytes x 2 channels = 294,912 bytes. The extra 78 bytes are the header (format
#     information at the start of the file). The m4a needs only ~90 kbit/s because AAC is lossy compression
#     (it throws away detail the ear can't hear).
#
# Q3. What is the difference between the frequency of a sound and the sample rate of a recording? Give an
#     example with numbers from my own clip.
# My answer: Frequency of a sound is the frequency of the voice that the person speaks, and then sample rate of
#     the recording device is how many times in a second does the recording device capture a sample. A sample
#     is a number which, at any given instant of recording, is a numerical representation of the voice that
#     is being spoken at that particular instance of capture.
# Answer: frequency (how many times per second a sound repeats; Hz = repeats per second) belongs to the sound.
#     The sample rate (how many snapshots the recorder takes per second) belongs to the recorder. A sample
#     (one number: the air pressure reaching the microphone at one instant) holds my voice plus any background
#     noise, added together. My voice repeats ~113 times per second and the phone takes 48,000 snapshots per
#     second, so each cycle (one full repeat of the pattern) gets about 425 samples.
#
# Q4. Task 4 found 400 samples between the spikes of my "ou". What pitch is that? If the clip were recorded at
#     16,000 Hz, how many samples would one cycle have?
# My answer: pitch is sampling rate/ sample so just plug in 48000 for first part and 16000 for the 2nd question
# Answer: pitch (the lowest frequency of a voice, set by how fast the vocal cords snap shut) = sample rate /
#     samples per cycle = 48,000 / 400 = 120 Hz. The second part is not 16,000 / 400 = 40 Hz: changing the
#     recorder never changes my pitch, only the samples per cycle. At 16,000 Hz: 16,000 / 120 = 133 samples.
#
# Q5. Task 4 gave 120 Hz for my "ou", but my average pitch over the whole clip is 113 Hz. How can both be right?
# My answer: 120 is for the ou only, for whole it can be smaller which is the case here or can be larger as well
#     depends on what was spoken.
# Answer: right. Pitch also moves while I speak (intonation: the rise and fall of pitch in a phrase), so one
#     30 ms moment of the "ou" (120 Hz) differs from the average over the whole clip (113 Hz).
#     Reference: 96 Hz vs 109 Hz.
#
# Q6. What is a pure tone? How is my "ou" related to tones (use the words harmonics and formants)?
# My answer: pure tone is a single frequency signal. forgot
# Answer: a pure tone (a sound with one single frequency, a smooth sine wave) is the simplest sound. Speech is a
#     mix of many tones at once. The vocal cords make harmonics (tones at whole-number multiples of the pitch:
#     120, 240, 360 Hz ...), and the shape of the mouth makes some of them stronger: those strong bands are
#     formants (frequency bands the mouth boosts). The vowel is decided by the formants, not the pitch:
#     "ou" ~300 and ~800 Hz, "u" ~300 and ~1,900 Hz. "ç" is unvoiced (made without the vocal cords): air
#     swirling through a narrow gap makes noise (a random mix of many tones), mostly between 4 and 10 kHz.
#
# Q7. At a sample rate of 16,000 Hz, what is the highest frequency you can capture, and why exactly half?
# My answer: ninquist rate, it is like a clock looking in one direction and looking in the reverse direction
#     lands in the same place so anything above half would be mirror
# Answer: 8,000 Hz, the Nyquist frequency (half the sample rate; the highest frequency it can capture). The
#     Nyquist rate is the reverse: the sample rate needed for a given frequency. To capture a tone you need at
#     least 2 samples per cycle, one in the up half and one in the down half, so 16,000 / 2 = 8,000 cycles per
#     second at most. Task 5: 440 Hz gets 36 samples per cycle (smooth), 9 kHz only 1.8 (impossible).
#
# Q8. Sampled at 16,000 Hz, what frequency does a 10,000 Hz tone show up as? And a 15,000 Hz tone?
# My answer: 10000 would be 6000 and 15000 would be 1000
# Answer: correct. Aliasing (a tone above the Nyquist frequency gives exactly the same samples as a lower tone,
#     so it shows up as a fake lower tone): frequencies mirror around 8,000 Hz. 9,000 -> 7,000,
#     10,000 -> 6,000, 15,000 -> 1,000. Clock picture: 9/16 of a turn forward lands where 7/16 backward does.
#
# Q9. Why can't aliasing be fixed after the sound has been sampled? What must be done instead?
# My answer: first part dont know. second part reomove the "something" after the half mark,
# Answer: after sampling, the fake and the real tone give identical numbers, so nothing is left to tell them
#     apart. The "something" is every tone above the Nyquist frequency, removed with a low-pass filter (lets
#     low frequencies through, blocks high ones) before sampling. Sampling happens twice in my pipeline: in the
#     phone (48 kHz, with a built-in filter at 24 kHz, so no aliasing) and in Block 3 resampling (changing a
#     recording's sample rate) from 48 to 16 kHz. Keeping every 3rd sample (y[::3]) skips the filter;
#     librosa.resample filters first.
#
# Q10. Task 7: my "ou" has 0% of its energy above 8 kHz and my "ç" has 8.5%. What does that mean for how well
#      Whisper (16 kHz) hears each of the two sounds?
# My answer: depends on how the words was pronounced more low freq or high freq hiss souund or something like
#     that. Whisper will be confused whenhearhing the c sound.
# Answer: "ou" is heard perfectly: all its energy is below 8 kHz. For "ç", proper resampling drops only the top
#     8.5% (reference 0.7%) and keeps the 4-8 kHz hiss that makes it sound like "s", so Whisper is not
#     confused; it was trained on 16 kHz audio and is used to this. Naive resampling is the danger: it would
#     fold that 8.5% back as fake tones below 8 kHz.

# %% Block 3 - Resampling
# Notes:
#
# Tasks:
# 1. resample every clip from 48 kHz to 16 kHz properly with librosa.resample; print samples before and after
# 2. resample the naive way: keep every 3rd sample (y[::3]), no filter
# 3. test both ways on a 9 kHz tone made at 48 kHz: naive gives a fake 7 kHz tone, proper removes it
# 4. task 7 graph before and after resampling: energy per frequency of "ou" and "ç" at 48 kHz, proper 16 kHz and naive 16 kHz
# 5. check that librosa.load(path, sr=16000) gives the same result as loading at 48 kHz and resampling
# 6. save the 16 kHz clips as wav and listen to 48 kHz vs proper vs naive
# 7. write observations
#
# %% task 1: resample every clip from 48 kHz to 16 kHz properly with librosa.resample; print samples before and after
TARGET_SR = 16000
proper = {
    key: (librosa.resample(y, orig_sr=sr, target_sr=TARGET_SR), TARGET_SR)
    for key, (y, sr) in mono.items()
}
for key, (y, sr) in mono.items():
    y16 = proper[key][0]
    print(
        f"{key[0]:3} {key[1]:14} {sr} Hz: {len(y)} samples -> {TARGET_SR} Hz: {len(y16)} samples ({len(y) / len(y16):.2f}x fewer)"
    )

# %% task 2: resample the naive way: keep every 3rd sample (y[::3]), no filter
naive = {key: (y[:: sr // TARGET_SR], TARGET_SR) for key, (y, sr) in mono.items()}
for key in mono:
    print(
        f"{key[0]:3} {key[1]:14} proper {len(proper[key][0])} samples, naive {len(naive[key][0])} samples"
    )


# %% task 3: test both ways on a 9 kHz tone made at 48 kHz: naive gives a fake 7 kHz tone, proper removes it
def strongest(y, sr):
    spectrum = np.abs(np.fft.rfft(y))
    return np.fft.rfftfreq(len(y), 1 / sr)[spectrum.argmax()]


t48 = np.arange(48000) / 48000
test_tones = {}
for f in (7000, 9000):
    tone48 = 0.3 * np.sin(2 * np.pi * f * t48)
    tone_proper = librosa.resample(tone48, orig_sr=48000, target_sr=TARGET_SR)
    tone_naive = tone48[::3]
    test_tones[f] = (tone48, tone_proper, tone_naive)
    for name, y in (("proper", tone_proper), ("naive", tone_naive)):
        rms = np.sqrt(np.mean(y[1000:-1000] ** 2))
        heard = f"{strongest(y, TARGET_SR):5.0f} Hz" if rms > 0.001 else "nothing left"
        print(
            f"{f} Hz tone, {name:6}: strongest frequency {heard}, loudness (rms) {rms:.3f}"
        )

tone48, tone_proper, tone_naive = test_tones[9000]
n48, n16 = int(0.002 * 48000), int(0.002 * TARGET_SR)
fig, axes = plt.subplots(3, 1, figsize=(14, 7), sharex=True, sharey=True)
axes[0].plot(t48[:n48] * 1000, tone48[:n48], "o-", markersize=3)
axes[0].set_title("9000 Hz tone made at 48 kHz (5.3 samples per cycle, captured fine)")
t16 = np.arange(n16) / TARGET_SR * 1000
axes[1].plot(t16, tone_naive[:n16], "o-", markersize=4, color="tab:red")
axes[1].set_title(
    "naive 16 kHz (every 3rd sample): a fake 7000 Hz tone, as loud as the original"
)
axes[2].plot(t16, tone_proper[1000 : 1000 + n16], "o-", markersize=4, color="tab:green")
axes[2].set_title(
    "proper 16 kHz (filter first): the 9000 Hz tone is removed, almost silence"
)
axes[2].set_xlabel("time (ms)")
fig.tight_layout()
plt.show()


# %% task 4: task 7 graph before and after resampling: energy per frequency of "ou" and "ç" at 48 kHz, proper 16 kHz and naive 16 kHz
def spectrum_db(segment, sr):
    power = np.abs(np.fft.rfft(segment * np.hanning(len(segment)))) ** 2
    return np.fft.rfftfreq(len(segment), 1 / sr), power


def band_share(freqs, power, low, high):
    return power[(freqs >= low) & (freqs < high)].sum() / power.sum()


versions = {"48 kHz original": mono, "16 kHz proper": proper, "16 kHz naive": naive}
fig, axes = plt.subplots(2, 2, figsize=(14, 8), sharey=True)
for col, (transcript, (sound, fraction)) in enumerate(ZOOM.items()):
    for row, who in enumerate(("ref", "me")):
        ax = axes[row, col]
        y48 = mono[(who, transcript)][0]
        trimmed, (start, _) = librosa.effects.trim(y48, top_db=30)
        center_s = (start + fraction * len(trimmed)) / mono[(who, transcript)][1]
        for name, clips_at in versions.items():
            y, sr = clips_at[(who, transcript)]
            center = int(center_s * sr)
            half = int(0.03 * sr / 2)
            freqs, power = spectrum_db(y[center - half : center + half], sr)
            share = band_share(freqs, power, 6000, 8000)
            print(
                f"{who:3} '{sound}' {name:16}: {share:6.2%} of the energy is in 6-8 kHz"
            )
            ax.plot(
                freqs / 1000,
                10 * np.log10(power + 1e-12),
                label=f"{name} ({share:.1%} in 6-8 kHz)",
                alpha=0.7,
            )
        ax.axvline(8, color="red", linestyle="--")
        ax.set_title(f"{who}: '{sound}' in {transcript}")
        ax.legend(fontsize=8)
    axes[1, col].set_xlabel("frequency (kHz)")
for ax in axes[:, 0]:
    ax.set_ylabel("energy (dB)")
fig.tight_layout()
plt.show()

# %% task 5: check that librosa.load(path, sr=16000) gives the same result as loading at 48 kHz and resampling
for key, path in wav_paths.items():
    loaded, sr = librosa.load(path, sr=TARGET_SR)
    mine = proper[key][0]
    length = min(len(loaded), len(mine))
    diff = np.abs(loaded[:length] - mine[:length]).max()
    print(
        f"{key[0]:3} {key[1]:14} load(sr=16000): {len(loaded)} samples, resample: {len(mine)} samples, biggest difference {diff:.2e}"
    )

# %% task 6: save the 16 kHz clips as wav and listen to 48 kHz vs proper vs naive
out_dir = DATA / "resampled"
out_dir.mkdir(exist_ok=True)
for name, clips_at in versions.items():
    for (who, transcript), (y, sr) in clips_at.items():
        path = (
            out_dir
            / f"{who}_{transcript.replace(' ', '_')}_{name.replace(' ', '_')}.wav"
        )
        sf.write(path, y, sr)
        display(Audio(y, rate=sr))
for f, (tone48, tone_proper, tone_naive) in test_tones.items():
    sf.write(out_dir / f"tone_{f}Hz_proper_16k.wav", tone_proper, TARGET_SR)
    sf.write(out_dir / f"tone_{f}Hz_naive_16k.wav", tone_naive, TARGET_SR)
print("saved to", out_dir)
print(f"listen: ffplay -nodisp -autoexit {out_dir}/me_comment_ça_va_16_kHz_naive.wav")

# %% task 7: write observations
#

# %% Block 3 - Observations
# Q1. Task 1: proper resampling (changing a recording's sample rate, with a filter first) turned my bonjour's
#     73,728 samples into 24,576. Why exactly 3 times fewer? Did the duration of the clip change?
# Answer: 48,000 / 16,000 = 3, so the same second holds 3 times fewer snapshots. The duration does not change:
#     73,728 / 48,000 = 1.536 s and 24,576 / 16,000 = 1.536 s. Only the number of samples per second changes,
#     never the length of the sound or its pitch.
#
# Q2. Task 2: proper and naive (keeping every 3rd sample, no filter) give exactly the same number of samples.
#     So what is the real difference between them?
# Answer: the values of the samples, not their number. Proper first runs a low-pass filter (lets low
#     frequencies through, blocks high ones) that removes everything above 8 kHz, the new Nyquist frequency
#     (half the sample rate; the highest frequency it can capture), and then keeps 1 of every 3 samples. Naive
#     keeps 1 of every 3 samples straight away, so the sound between 8 and 24 kHz folds back below 8 kHz as
#     fake tones (aliasing). Task 3: a 9 kHz tone becomes a fake 7 kHz tone with naive and disappears with
#     proper. Task 4: my "ç" has 16.0% of its energy in 6-8 kHz with naive and 4.9% with proper.

# %% Block 4 - Spectograms
# Notes:
# 1. A spectrogram (a picture of which frequencies are present at each moment) has time on the x-axis,
#    frequency on the y-axis and energy as colour.
# 2. It is made with the STFT (short-time Fourier transform: cut the signal into short overlapping pieces and
#    find the mix of tones in each piece). Each piece is a frame (a short slice of samples), shaped by a window
#    (a curve that fades the frame in and out so its edges don't create fake frequencies). The hop (how far the
#    next frame starts after the previous one) sets how many frames per second there are.
# 3. The FFT (fast Fourier transform: the algorithm that splits a frame into its tones) turns one frame into
#    energy per frequency, exactly what Block 2 task 7 plotted. A spectrogram is many of those, side by side.
# 4. Whisper uses frames of 400 samples (25 ms at 16 kHz) with a hop of 160 samples (10 ms): 100 frames per
#    second. Energy is shown in dB (decibels: a log scale, every 10 dB step is 10 times more energy).
#
# Tasks:
# 1. take one 25 ms frame of my "ou" at 16 kHz, find its tones with the FFT and mark the harmonics (whole-number multiples of the pitch)
# 2. cut my bonjour into frames like Whisper (400 samples, hop 160); count the frames and draw the first few on the waveform
# 3. spectrograms of all four clips at 16 kHz (reference and me, bonjour and comment ça va)
# 4. window length trade-off on my bonjour: 8 ms vs 25 ms vs 128 ms frames
# 5. draw my pitch curve and its harmonics on top of the spectrogram of bonjour (reference and me)
# 6. spectrogram of my "comment ça va": proper vs naive 16 kHz, and naive minus proper to see the aliasing
# 7. write observations
#
# %% task 1: take one 25 ms frame of my "ou" at 16 kHz, find its tones with the FFT and mark the harmonics (whole-number multiples of the pitch)
FRAME = 400
HOP = 160
speech16 = {
    key: librosa.effects.trim(y, top_db=30)[0] for key, (y, sr) in proper.items()
}

y = speech16[("me", "bonjour")]
center = int(ZOOM["bonjour"][1] * len(y))
frame = y[center - FRAME // 2 : center + FRAME // 2]
f0, _, _ = librosa.pyin(
    y, fmin=60, fmax=400, sr=TARGET_SR, frame_length=1024, hop_length=HOP
)
pitch = f0[center // HOP] if not np.isnan(f0[center // HOP]) else np.nanmedian(f0)

padded = 4096
power = np.abs(np.fft.rfft(frame * np.hanning(FRAME), n=padded)) ** 2
freqs = np.fft.rfftfreq(padded, 1 / TARGET_SR)
print(
    f"frame: {FRAME} samples = {FRAME / TARGET_SR * 1000:.0f} ms, pitch here {pitch:.0f} Hz"
)
print("harmonics:", ", ".join(f"{k * pitch:.0f}" for k in range(1, 9)), "Hz")

fig, axes = plt.subplots(2, 1, figsize=(14, 7))
axes[0].plot(np.arange(FRAME) / TARGET_SR * 1000, frame)
axes[0].set_title(f"one 25 ms frame of my 'ou' ({FRAME} samples)")
axes[0].set_xlabel("time (ms)")
axes[1].plot(freqs, 10 * np.log10(power + 1e-12))
for k in range(1, int(4000 // pitch) + 1):
    axes[1].axvline(k * pitch, color="red", linestyle=":", alpha=0.6)
axes[1].set_xlim(0, 4000)
axes[1].set_title(
    f"its tones: peaks at the harmonics, red lines at {pitch:.0f} Hz x 1, 2, 3 ..."
)
axes[1].set_xlabel("frequency (Hz)")
axes[1].set_ylabel("energy (dB)")
fig.tight_layout()
plt.show()

# %% task 2: cut my bonjour into frames like Whisper (400 samples, hop 160); count the frames and draw the first few on the waveform
y = speech16[("me", "bonjour")]
n_frames = 1 + (len(y) - FRAME) // HOP
stft_frames = librosa.stft(y, n_fft=FRAME, hop_length=HOP).shape[1]
print(
    f"{len(y)} samples, frame {FRAME}, hop {HOP}: 1 + ({len(y)} - {FRAME}) // {HOP} = {n_frames} frames"
)
print(
    f"librosa.stft pads half a frame at both ends, so it gives 1 + {len(y)} // {HOP} = {stft_frames} frames"
)
print(
    f"{TARGET_SR / HOP:.0f} frames per second, each frame overlaps the next by {FRAME - HOP} samples"
)

start = int(0.15 * TARGET_SR)
fig, ax = plt.subplots(figsize=(14, 5))
span = np.arange(start, start + 6 * HOP + FRAME)
ax.plot(span / TARGET_SR * 1000, y[span], color="gray")
colors = plt.cm.tab10.colors
for i in range(5):
    s0 = start + i * HOP
    ax.axvspan(
        s0 / TARGET_SR * 1000,
        (s0 + FRAME) / TARGET_SR * 1000,
        ymin=0.05 + i * 0.18,
        ymax=0.2 + i * 0.18,
        color=colors[i],
        alpha=0.5,
    )
    ax.text(s0 / TARGET_SR * 1000, 0, f" frame {i}", color=colors[i])
ax.set_title(
    "frames of 25 ms (400 samples), each starting 10 ms (160 samples) after the previous one"
)
ax.set_xlabel("time (ms)")
fig.tight_layout()
plt.show()

# %% task 3: spectrograms of all four clips at 16 kHz (reference and me, bonjour and comment ça va)
fig, axes = plt.subplots(2, 2, figsize=(14, 8), sharey=True, layout="constrained")
for col, transcript in enumerate(REFERENCE):
    for row, who in enumerate(("ref", "me")):
        y = speech16[(who, transcript)]
        db = librosa.amplitude_to_db(
            np.abs(librosa.stft(y, n_fft=FRAME, hop_length=HOP)), ref=np.max
        )
        img = librosa.display.specshow(
            db,
            sr=TARGET_SR,
            hop_length=HOP,
            x_axis="time",
            y_axis="hz",
            ax=axes[row, col],
            vmin=-80,
            vmax=0,
        )
        axes[row, col].set_title(f"{who}: {transcript}")
fig.colorbar(img, ax=axes, format="%+2.0f dB")
# 4. Whisper uses frames of 400 samples (25 ms at 16 kHz) with a hop of 160 samples (10 ms): 100 frames per
#    second. Energy is shown in dB (decibels: a log scale, every 10 dB step is 10 times more energy).
plt.show()

# %% task 4: window length trade-off on my bonjour: 8 ms vs 25 ms vs 128 ms frames
y = speech16[("me", "bonjour")]
fig, axes = plt.subplots(1, 3, figsize=(15, 5), sharey=True)
for ax, n_fft in zip(axes, (128, 400, 2048)):
    db = librosa.amplitude_to_db(
        np.abs(librosa.stft(y, n_fft=n_fft, hop_length=HOP)), ref=np.max
    )
    librosa.display.specshow(
        db,
        sr=TARGET_SR,
        hop_length=HOP,
        x_axis="time",
        y_axis="hz",
        ax=ax,
        vmin=-80,
        vmax=0,
    )
    ax.set_ylim(0, 4000)
    ax.set_title(
        f"{n_fft} samples = {n_fft / TARGET_SR * 1000:.0f} ms, {TARGET_SR / n_fft:.0f} Hz per row"
    )
fig.suptitle(
    "short frames: sharp in time, blurry in frequency | long frames: sharp in frequency, blurry in time"
)
fig.tight_layout()
plt.show()

# %% task 5: draw my pitch curve and its harmonics on top of the spectrogram of bonjour (reference and me)
fig, axes = plt.subplots(1, 2, figsize=(15, 5), sharey=True)
for ax, who in zip(axes, ("ref", "me")):
    y = speech16[(who, "bonjour")]
    db = librosa.amplitude_to_db(
        np.abs(librosa.stft(y, n_fft=1024, hop_length=HOP)), ref=np.max
    )
    librosa.display.specshow(
        db,
        sr=TARGET_SR,
        hop_length=HOP,
        x_axis="time",
        y_axis="hz",
        ax=ax,
        vmin=-80,
        vmax=0,
    )
    f0, voiced, _ = librosa.pyin(
        y, fmin=60, fmax=400, sr=TARGET_SR, frame_length=1024, hop_length=HOP
    )
    times = librosa.times_like(f0, sr=TARGET_SR, hop_length=HOP)
    for k in range(1, 6):
        ax.plot(
            times,
            f0 * k,
            color="cyan" if k == 1 else "white",
            linewidth=2 if k == 1 else 1,
            alpha=0.9,
        )
    ax.set_ylim(0, 1500)
    ax.set_title(
        f"{who}: bonjour | pitch (cyan) median {np.nanmedian(f0):.0f} Hz | harmonics x2..x5 (white)",
        fontsize=10,
    )
fig.tight_layout()
plt.show()

# %% task 6: spectrogram of my "comment ça va": proper vs naive 16 kHz, and naive minus proper to see the aliasing
key = ("me", "comment ça va")
y_proper = proper[key][0]
y_naive = naive[key][0]
s_proper = np.abs(librosa.stft(y_proper, n_fft=FRAME, hop_length=HOP))
s_naive = np.abs(librosa.stft(y_naive, n_fft=FRAME, hop_length=HOP))
top = s_proper.max()
db_proper = librosa.amplitude_to_db(s_proper, ref=top)
db_naive = librosa.amplitude_to_db(s_naive, ref=top)

fig, axes = plt.subplots(1, 3, figsize=(15, 5), sharey=True)
librosa.display.specshow(
    db_proper,
    sr=TARGET_SR,
    hop_length=HOP,
    x_axis="time",
    y_axis="hz",
    ax=axes[0],
    vmin=-80,
    vmax=0,
)
axes[0].set_title("proper 16 kHz")
librosa.display.specshow(
    db_naive,
    sr=TARGET_SR,
    hop_length=HOP,
    x_axis="time",
    y_axis="hz",
    ax=axes[1],
    vmin=-80,
    vmax=0,
)
axes[1].set_title("naive 16 kHz")
img = librosa.display.specshow(
    db_naive - db_proper,
    sr=TARGET_SR,
    hop_length=HOP,
    x_axis="time",
    y_axis="hz",
    ax=axes[2],
    cmap="coolwarm",
    vmin=-30,
    vmax=30,
)
axes[2].set_title("naive minus proper (red = extra from aliasing)", fontsize=10)
fig.colorbar(img, ax=axes[2], format="%+2.0f dB")
fig.tight_layout()
plt.show()

# %% task 7: write observations
#

# %% Block 5 - Log mel
# build log-mel by hand, then compare it with WhisperFeatureExtractor on the same clip
print("b")
# %% Block 6 - Whisper encoder decoder
# load a small model and look at the encoder and decoder
# follow the shapes: 30 s of audio -> 80x3000 mel frames -> 1500 encoder states
print("b")
# %% Block 7 - Run Whisper on the french clip
# look at the special tokens: <|startoftranscript|><|fr|><|transcribe|>
# look at the token IDs and the logits at each decoding step
# %% Block 8 - Notes: Whisper vs NLP seq2seq
# the decoder predicts one token at a time from earlier tokens and attends to the encoder
# greedy vs beam search
# forced prefix tokens
