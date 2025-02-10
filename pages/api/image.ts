import type { NextApiRequest, NextApiResponse } from 'next'
import multer from 'multer'
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import fs from "fs"

export const config = {
  api: {
    bodyParser: false,
  },
};

const ogStorage = multer.diskStorage({
  destination: (_, file, cb) => {
    const uploadPath = "public/uploads"
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath)
    }
    cb(null, "public/uploads");
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  },
});

const ogUpload = multer({ storage: ogStorage });

const prisma = new PrismaClient()

const POST = async (req: NextApiRequest, res: NextApiResponse) => {
  await new Promise((resolve, reject) => {
    ogUpload.single("file")(req as any, res as any, async (err) => {
      const request = req as any
      console.log(request.file)
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
          path: request.file.path.replace('public/', ''),
          width: metadata.width ?? -1,
          height: metadata.height ?? -1,
          size: request.file.size
        }
      })
      res.status(200).json({status: "Success"})
      resolve(null)
    })
  });
}

const GET = async (_: NextApiRequest, res: NextApiResponse) => {
  const images = await prisma.image.findMany({
    include: {
      compressedImages: true
    }
  })
  res.status(200).json({images})
  console.log(images)
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await GET(req, res)
    return
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return
  }
  await POST(req, res)
}
