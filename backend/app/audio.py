"""Audio processing utilities for format conversion and buffering."""

import io
import struct
import numpy as np


class AudioBuffer:
    """Accumulates audio chunks during push-to-talk recording."""

    def __init__(self):
        self._chunks: list[bytes] = []

    def add_chunk(self, chunk: bytes) -> None:
        """Add a raw audio chunk to the buffer."""
        self._chunks.append(chunk)

    def get_all(self) -> bytes:
        """Get all accumulated audio as a single bytes object."""
        return b"".join(self._chunks)

    def clear(self) -> None:
        """Clear the buffer."""
        self._chunks.clear()

    @property
    def has_data(self) -> bool:
        return len(self._chunks) > 0

    @property
    def size_bytes(self) -> int:
        return sum(len(c) for c in self._chunks)


def create_wav_header(data_length: int, sample_rate: int = 16000,
                      channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Create a WAV file header for raw PCM data."""
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        36 + data_length,       # ChunkSize
        b'WAVE',
        b'fmt ',
        16,                     # Subchunk1Size (PCM)
        1,                      # AudioFormat (PCM)
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b'data',
        data_length
    )
    return header


def wrap_pcm_as_wav(pcm_data: bytes, sample_rate: int = 16000,
                    channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Wrap raw PCM data in a WAV container."""
    header = create_wav_header(len(pcm_data), sample_rate, channels, bits_per_sample)
    return header + pcm_data
