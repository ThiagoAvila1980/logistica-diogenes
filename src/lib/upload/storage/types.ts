export interface StorageProvider {
  name: string;
  putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string>;
  deleteObject(url: string): Promise<void>;
}
