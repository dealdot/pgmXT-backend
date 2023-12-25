// TypeScript & ES6 Modules
import fs from 'fs'
import util from 'util'
import { error } from 'console'
import { PNG } from 'pngjs'

enum SIGNATURES {
  P5 = 'P5',
  P2 = 'P2',
  INVALID = 'invalid',
}

interface PgmData {
  signature: SIGNATURES
  width: number
  height: number
  maxval: number
  pixels: number[]
}

function isCharNewline(char: number): boolean {
  return char >= 0x09 && char <= 0x0D
}

function isCharWhitespace(char: number): boolean {
  return isCharNewline(char) || char === 0x20
}

function getPixelSize(maxval: number): number {
  return maxval < 256 ? 1 : 2
}

function parseSignature(signature: string): SIGNATURES {
  if (signature === 'P5')
    return SIGNATURES.P5

  else if (signature === 'P2')
    return SIGNATURES.P2

  else
    return SIGNATURES.INVALID
}

function isMaxvalValid(maxval: number): boolean {
  return maxval > 0 && maxval < 65536
}

async function readUntilWhitespace(file: number, fileSize: number, offset: number): Promise<[string, number]> {
  const currentByte = Buffer.alloc(1)
  let currentData = Buffer.alloc(0)
  let idx = offset

  while (idx < fileSize) {
    await util.promisify(fs.read)(file, currentByte, 0, 1, idx)

    if (currentByte[0] === '#'.charCodeAt(0)) {
      let haveFoundNewline = false
      while (true) {
        idx++
        await util.promisify(fs.read)(file, currentByte, 0, 1, idx)
        if (isCharNewline(currentByte[0]))
          haveFoundNewline = true

        if (haveFoundNewline && !isCharNewline(currentByte[0]))
          break
      }
    }

    if (isCharWhitespace(currentByte[0]) || idx === fileSize - 1)
      return [currentData.toString('hex'), idx + 1]

    else
      currentData = Buffer.concat([currentData, currentByte])

    idx++
  }

  return ['', idx]
}

async function readPixels(file: number, fileSize: number, offset: number, pixelSize: number, signature: SIGNATURES): Promise<number[]> {
  const pixels: number[] = []

  if (signature === SIGNATURES.P5) {
    const currentByte = Buffer.alloc(pixelSize)
    for (let idx = offset; idx < fileSize; idx += pixelSize) {
      await util.promisify(fs.read)(file, currentByte, 0, pixelSize, idx)
      pixels.push(currentByte.readUIntBE(0, pixelSize))
    }
  }
  else if (signature === SIGNATURES.P2) {
    let idx = offset
    while (idx < fileSize) {
      const [pixel, pixelEnd] = await readUntilWhitespace(file, fileSize, idx)
      idx = pixelEnd
      pixels.push(Number(pixel))
    }
  }

  return pixels
}

export async function readPgm(filePath: string): Promise<PgmData> {
  const file = await util.promisify(fs.open)(filePath, 'r')
  const fileInfo = await util.promisify(fs.stat)(filePath)
  const fileSize = fileInfo.size

  const [rawSignature, signatureEnd] = await readUntilWhitespace(file, fileSize, 0)
  const signature = parseSignature(rawSignature)
  if (signature === SIGNATURES.INVALID)
    throw new Error('Invalid PGM file signature.')

  const [width, widthEnd] = await readUntilWhitespace(file, fileSize, signatureEnd)
  const [height, heightEnd] = await readUntilWhitespace(file, fileSize, widthEnd)
  const [maxval, maxvalEnd] = await readUntilWhitespace(file, fileSize, heightEnd)
  if (!isMaxvalValid(Number(maxval)))
    throw new Error('Invalid PGM file Maxval.')

  const pixelSize = getPixelSize(Number(maxval))
  const pixels = await readPixels(file, fileSize, maxvalEnd, pixelSize, signature)

  return {
    signature,
    width: Number(width),
    height: Number(height),
    maxval: Number(maxval),
    pixels,
  }
}

export async function writePngFromPgm(pgmData: PgmData, outPath: string, colorMasks?: number[][]): Promise<void> {
  if (!colorMasks)
    colorMasks = [[1, 1, 1]]

  const newfile = new PNG({ width: pgmData.width, height: pgmData.height })

  for (let y = 0; y < newfile.height; y++) {
    for (let x = 0; x < newfile.width; x++) {
      const idx = newfile.width * y + x
      const pngIdx = idx << 2
      const pixel = (pgmData.pixels[idx] / pgmData.maxval) * 255

      const colorMaskIndex = Math.floor((Math.min(pixel, 254) / 255) * colorMasks.length)
      const colorMask = colorMasks[colorMaskIndex]

      let rgbPixels = [
        pixel * colorMask[0],
        pixel * colorMask[1],
        pixel * colorMask[2],
      ]
      rgbPixels = rgbPixels.map(p => Math.min(p, 255))
      newfile.data[pngIdx] = rgbPixels[0]
      newfile.data[pngIdx + 1] = rgbPixels[1]
      newfile.data[pngIdx + 2] = rgbPixels[2]
      newfile.data[pngIdx + 3] = 0xFF
    }
  }

  return new Promise((resolve, reject) => {
    newfile
      .pack()
      .pipe(fs.createWriteStream(outPath))
      .on('finish', () => resolve())
      .on('error', () => reject(error))
  })
}
