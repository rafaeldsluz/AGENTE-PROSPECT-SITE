import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("r2-uploader");

function getClient(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = config.r2;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

function buildKey(companyName: string, leadId: string): string {
  const slug = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
  return `previews/${slug}-${leadId.slice(0, 8)}.html`;
}

export async function uploadPageToR2(
  htmlFilePath: string,
  companyName: string,
  leadId: string
): Promise<string | null> {
  if (!config.r2.enabled) return null;

  try {
    const html = await fs.readFile(htmlFilePath, "utf-8");
    const key = buildKey(companyName, leadId);

    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: config.r2.bucket!,
        Key: key,
        Body: html,
        ContentType: "text/html; charset=utf-8",
        CacheControl: "public, max-age=604800",
      })
    );

    const publicUrl = `${config.r2.publicUrl}/${key}`;
    log.info({ company: companyName, key, publicUrl }, "Página enviada ao R2");
    return publicUrl;
  } catch (err) {
    log.error({ company: companyName, error: String(err) }, "Falha ao enviar para R2");
    return null;
  }
}
