import type { NextApiRequest, NextApiResponse } from 'next'
import multer from 'multer'
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

type ResponseData = {
  message: string
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const ogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  },
});
const compressedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/compressed");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  },
});

const ogUpload = multer({ storage: ogStorage });
const compressedUpload = multer({storage: compressedStorage})

const prisma = new PrismaClient()

const POST = async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
  await new Promise((resolve, reject) => {
    ogUpload.single("file")(req as any, res as any, async (err) => {
      const request = req as any
      if (err) {
        res.status(500).json({message: "Error with the file upload"})
        return reject(err)
      }
      if (!request.file) {
        res.status(400).json({message: "Please provide a file"})
        return reject(err)
      }
      const metadata = await sharp(request.file.path).metadata()
      await prisma.image.create({
        data: {
          filename: request.file.originalname,
          path: request.file.path,
          width: metadata.width ?? -1,
          height: metadata.height ?? -1,
          size: request.file.size
        }
      })
      res.status(200).json({message: "Success"})

      resolve(null)
    })
  });
}

const GET = async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
  const images = await prisma.image.findMany()
  res.status(200).json({message: JSON.stringify(images)})
  console.log(images)
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'GET') {
    await GET(req, res)
    return
  }

  if (req.method !== "POST") return res.status(405).end();
  await POST(req, res)
}
