import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs"
import { v4 as uuidv4 } from 'uuid';
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end()
    return
  }
  await new Promise(async (resolve, reject) => {
    const data = req.body
    if (!data.image_id) {
      res.status(403).json({message: 'Missing image_id to be compressed'})
      resolve(null)
      return
    }
    const image = await prisma.image.findUnique({where: {id: data.image_id}})
    if (!image) {
      res.status(403).json({message: 'Image not found'})
      resolve(null)
      return
    }
    const compressedDir = "public/uploads/compressed"
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir)
    }
    const compressedFileName = uuidv4() + path.extname(image.filename)
    const compressedPath = compressedDir + "/" + uuidv4() + path.extname(image.filename)
    const metadata = await sharp('public/' + image.path).metadata()

    await sharp('public/' + image.path)
      .resize({
        width: Math.round(metadata.width! * (data.width ?? 0.7)),
        height: Math.round(metadata.height! * (data.height ?? 0.7)),
      })
      .jpeg({ quality: data.quality ?? 70 })
      .toFile(compressedPath);

    const compressedMetadata = await sharp(compressedPath).metadata()
    await prisma.compressedImage.create({
      data: {
        filename: compressedFileName,
        path: compressedPath,
        width: compressedMetadata.width ?? -1,
        height: compressedMetadata.height ?? -1,
        size: fs.statSync(compressedPath).size,
        imageId: image.id
      }
    })

    res.status(200).json({path: compressedPath.replace('public/', '')})
  })
}