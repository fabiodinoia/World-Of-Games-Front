import { Injectable } from '@angular/core';
import type { FirebaseStorage } from 'firebase/storage';
import { environment } from 'src/environments/environment';

/**
 * Uploads images to Firebase Storage and returns their public download URL.
 * The Firebase SDK is loaded lazily, on first upload, so it stays out of the
 * initial bundle and the app runs fine without a Firebase config.
 */
@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private storage?: Promise<FirebaseStorage>;

  async upload(path: string, file: File): Promise<string> {
    const { ref, uploadBytes, getDownloadURL } =
      await import('firebase/storage');
    const fileRef = ref(await this.getStorage(), path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  private getStorage(): Promise<FirebaseStorage> {
    if (!environment.firebase.apiKey) {
      return Promise.reject(
        new Error('Firebase is not configured (FIREBASE_API_KEY missing).'),
      );
    }
    this.storage ??= Promise.all([
      import('firebase/app'),
      import('firebase/storage'),
    ]).then(([app, storage]) =>
      storage.getStorage(app.initializeApp(environment.firebase)),
    );
    return this.storage;
  }
}
