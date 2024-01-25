import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const { ACCESS_KEY_ID, SECRET_ACCESS_KEY, ENDPOINT_URL } = process.env;

export const s3 = new AWS.S3({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
  endpoint: ENDPOINT_URL,
  s3ForcePathStyle: true,
});

export function uploadS3Json(path, obj, Bucket = "ai-pipeline-statistics") {
  return new Promise((r, reject) => {
    s3.upload(
      {
        Bucket,
        Key: path,
        Body: JSON.stringify(obj, null, 2),
        ContentType: "application/json",
      },
      (err, res) => {
        if (err) return reject(err);
        r(res);
      }
    );
  });
}

export function uploadS3Buffer(
  path,
  buffer,
  content_type,
  Bucket = "ai-pipeline-statistics"
) {
  return new Promise((r, reject) => {
    s3.upload(
      {
        Bucket,
        Key: path,
        Body: buffer,
        ContentType: content_type,
      },
      (err, res) => {
        if (err) return reject(err);
        r(res);
      }
    );
  });
}
