import JSZip from 'jszip';

/**
 * Opens a DBL bundle zip. Bundles are accepted with their files at the zip root
 * or inside one top-level folder, which is how DBL downloads and re-zipped
 * folders arrive.
 */
export async function openDblBundle(zipBuffer: Uint8Array) {
  const zipFile = await JSZip.loadAsync(zipBuffer);
  if (zipFile.file('metadata.xml')) return zipFile;

  const nested = zipFile.file(/^[^/]+\/metadata\.xml$/);
  if (nested.length !== 1) return zipFile;
  return zipFile.folder(nested[0].name.slice(0, -'/metadata.xml'.length)) ?? zipFile;
}
