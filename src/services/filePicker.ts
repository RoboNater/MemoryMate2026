import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Picking a text file and reading it, on both platforms.
 *
 * Two importers need this now -- the JSON export/import in Settings and the
 * plain-text verse import (#15) -- and the platform split is the same for
 * both: `expo-document-picker` on native, a hidden `<input type="file">` on
 * web, where the document picker has no file to hand back a URI for.
 *
 * Cancelling returns `null` rather than throwing. A cancel is not a failure,
 * and the callers here all have a "something went wrong" path that would
 * otherwise tell the user their deliberate cancel was an error.
 */
export interface PickTextFileOptions {
  /** MIME type for the native document picker, e.g. `text/plain`. */
  mimeType: string;
  /** `accept` attribute for the web file input, e.g. `.txt,text/plain`. */
  accept: string;
}

/**
 * Show a file picker and return the chosen file's contents as text, or `null`
 * if the user cancelled.
 */
export async function pickTextFile(options: PickTextFileOptions): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickTextFileWeb(options.accept);
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: options.mimeType,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return FileSystem.readAsStringAsync(result.assets[0].uri);
}

/**
 * Web file picker.
 *
 * `cancel` matters: without it, dismissing the browser's file dialog fires no
 * event at all, so the promise never settles and whatever spinner the caller
 * turned on stays on forever.
 */
function pickTextFileWeb(accept: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await file.text());
      } catch {
        reject(new Error('Could not read that file.'));
      }
    };

    input.click();
  });
}
