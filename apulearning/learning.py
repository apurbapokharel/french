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
# 1. waveform: this is the term use to represnt the signal we get that represnts the spoken sound.
# It is converted to a signal.
# 2. sample: A converter then measures the voltage many thousands of times per second, and each measurement is one number, called a sample.
# 3. waveform: this is this list of sample plotted against time.
# 4. sample time: the number of sample per second is sample rate.
# 5. a .wav (which is the waveform, the digital representation of the speech) form stores whole numbers from  −32768 to 32767
#   (16-bit) and a librosa normalizes this in between -1 and 1.
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

# %% Block 2 - Sample rate
print("b")
# %% Block 3 - Resampling
# resample the clip to 16 kHz, the rate Whisper expects
print("b")
# %% Block 4 - Spectograms
print("b")
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
