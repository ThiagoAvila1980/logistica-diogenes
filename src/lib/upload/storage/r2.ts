import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./types";

type R2Config = {
  accountId: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
};

export function createR2StorageProvider(config: R2Config): StorageProvider {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  return {
    name: "r2",

    async putObject(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return `${config.publicUrl}/${key}`;
    },

    async deleteObject(url) {
      const key = extractR2Key(url, config.publicUrl);
      if (!key) return;
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
        );
      } catch (err) {
        console.warn("[r2Storage.deleteObject]", key, err);
      }
    },
  };
}

function extractR2Key(url: string, publicBase: string): string | null {
  if (!url.startsWith(publicBase)) return null;
  const key = url.slice(publicBase.length).replace(/^\//, "");
  return key || null;
}
