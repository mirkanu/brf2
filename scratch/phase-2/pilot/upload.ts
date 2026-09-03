// Pilot uploader: uploads 7 sample files to R2 brf2-assets via S3 endpoint
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { readFile } from "node:fs/promises";

const endpoint = process.env.CLOUDFLARE_R2_S3_ENDPOINT!;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
const bucket = "brf2-assets";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 env vars");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

// accountId is in the endpoint host; we don't strictly need it for S3 ops.

type UploadSpec = {
  local: string;
  key: string;
  contentType: string;
  label: string;
};

const dir = "/home/workspace/1 Projects/brf2/scratch/phase-2/pilot/downloads";
const specs: UploadSpec[] = [
  // Issue PDFs
  { local: `${dir}/issue-05.pdf`, key: "pdfs/issues/issue-05.pdf", contentType: "application/pdf", label: "issue-05.pdf" },
  // Article PDFs (none of these are "issue" PDFs by content — they're journal articles;
  // we have only 1 candidate for the issue bucket in this pilot batch)
  { local: `${dir}/article-cprc.pdf`, key: "pdfs/articles/article-cprc-ch1.pdf", contentType: "application/pdf", label: "article-cprc.pdf" },
  { local: `${dir}/article-galashiels.pdf`, key: "pdfs/articles/article-galashiels.pdf", contentType: "application/pdf", label: "article-galashiels.pdf" },
  { local: `${dir}/article-cprc-union.pdf`, key: "pdfs/articles/article-cprc-union.pdf", contentType: "application/pdf", label: "article-cprc-union.pdf" },
  // MP3s
  { local: `${dir}/mp3-divineorigin.mp3`, key: "mp3/conferences/2018/divineorigin.mp3", contentType: "audio/mpeg", label: "mp3-divineorigin.mp3" },
  { local: `${dir}/mp3-reformedfamily.mp3`, key: "mp3/conferences/2018/reformedfamily.mp3", contentType: "audio/mpeg", label: "mp3-reformedfamily.mp3" },
  { local: `${dir}/mp3-spousalabuse.mp3`, key: "mp3/conferences/2018/spousalabuse.mp3", contentType: "audio/mpeg", label: "mp3-spousalabuse.mp3" },
];

async function uploadOne(spec: UploadSpec) {
  const body = await readFile(spec.local);
  const start = Date.now();
  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: spec.key,
      Body: body,
      ContentType: spec.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    },
  });
  await uploader.done();
  const ms = Date.now() - start;
  console.log(`OK  ${spec.label.padEnd(30)} ${spec.key.padEnd(60)} ${body.length} bytes  ${ms}ms`);
}

const t0 = Date.now();
await Promise.all(specs.map(uploadOne));
console.log(`\nDONE: ${specs.length} uploads in ${Date.now() - t0}ms`);