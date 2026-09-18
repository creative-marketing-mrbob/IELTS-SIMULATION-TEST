// Supabase Storage-backed Speaking audio service.
// The app stores only storage paths in candidate data; playback uses signed URLs.

class AudioStorageService {
  private readonly sessionTokenKey = 'mrbob_ielts_curr_session_token_v4';

  private jsonHeaders(): HeadersInit {
    const sessionToken = localStorage.getItem(this.sessionTokenKey);
    return {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'X-Session-Token': sessionToken } : {})
    };
  }

  public getStoragePath(resultId: string, partId: number | string, extension = 'wav'): string {
    const cleanId = resultId.replace(/[^a-zA-Z0-9-_]/g, '');
    return `speaking-recordings/${cleanId}/part-${partId}.${extension}`;
  }

  private async blobToBase64(audioData: Blob | string): Promise<{ mimeType: string; base64: string }> {
    if (typeof audioData === 'string') {
      const match = audioData.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
      if (!match) throw new Error('Audio data URL is invalid.');
      return { mimeType: match[1], base64: match[2] };
    }

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(audioData);
    });
    return this.blobToBase64(dataUrl);
  }

  public async saveAudio(
    resultId: string,
    partId: number | string,
    audioData: Blob | string,
    durationSec?: number
  ): Promise<{ storagePath: string; audioUrl: string; mimeType: string; fileSize: number }> {
    if (audioData instanceof Blob && audioData.size <= 0) {
      throw new Error('Audio recording is empty.');
    }

    // Attempt 1: Direct signed upload to Supabase Storage CDN
    // Bypasses Vercel's 4.5MB serverless payload limit, removes Base64 33% bloat, takes 1-2s.
    try {
      let audioBlob: Blob;
      let detectedMime = 'audio/wav';

      if (audioData instanceof Blob) {
        audioBlob = audioData;
        detectedMime = audioData.type || 'audio/wav';
      } else {
        const match = audioData.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          const binaryStr = atob(match[2]);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          audioBlob = new Blob([bytes], { type: detectedMime });
        } else {
          throw new Error('Invalid audio data format.');
        }
      }

      const signRes = await fetch('/api/supabase/audio/signed-upload-url', {
        method: 'POST',
        headers: this.jsonHeaders(),
        body: JSON.stringify({
          resultId,
          partId,
          mimeType: detectedMime
        })
      });

      const signJson = await signRes.json().catch(() => null);
      if (signRes.ok && signJson?.success && signJson.data?.uploadUrl) {
        const { uploadUrl, storagePath, mimeType } = signJson.data;

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType || audioBlob.type || 'audio/wav',
            'x-upsert': 'true'
          },
          body: audioBlob
        });

        if (uploadRes.ok) {
          const confirmRes = await fetch('/api/supabase/audio/confirm', {
            method: 'POST',
            headers: this.jsonHeaders(),
            body: JSON.stringify({
              resultId,
              partId,
              storagePath,
              durationSec,
              fileSize: audioBlob.size,
              mimeType: mimeType || audioBlob.type
            })
          });

          const confirmJson = await confirmRes.json().catch(() => null);
          if (confirmRes.ok && confirmJson?.success) {
            return {
              storagePath,
              audioUrl: storagePath,
              mimeType: mimeType || audioBlob.type,
              fileSize: audioBlob.size
            };
          }
        }
      }
    } catch (err) {
      console.warn('Direct Supabase signed upload failed; attempting legacy proxy fallback:', err);
    }

    // Fallback: Legacy Base64 proxy upload via /api/supabase/audio/upload
    const payload = await this.blobToBase64(audioData);
    if (!payload.mimeType.startsWith('audio/') || !payload.base64) {
      throw new Error('Audio recording format is invalid.');
    }
    const response = await fetch('/api/supabase/audio/upload', {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({
        resultId,
        partId,
        mimeType: payload.mimeType,
        base64: payload.base64,
        durationSec
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      throw new Error(body?.error || 'Supabase audio upload failed.');
    }

    return {
      storagePath: body.data.storagePath,
      audioUrl: body.data.storagePath,
      mimeType: body.data.mimeType || payload.mimeType,
      fileSize: body.data.fileSize || (audioData instanceof Blob ? audioData.size : 0)
    };
  }

  public async getAudio(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    if (!storagePath.startsWith('speaking-recordings/')) return storagePath;

    const response = await fetch('/api/supabase/audio/signed-url', {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({ storagePath })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) return null;
    return body.data.audioUrl;
  }
}

export const audioStorage = new AudioStorageService();
