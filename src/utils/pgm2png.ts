import { PNG } from 'pngjs'

const convertPgmToPng = (pgmData: any, width: number, height: number) => {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x)
      const pngIdx = idx << 2
      png.data[pngIdx] = pgmData[idx] // red
      png.data[pngIdx + 1] = pgmData[idx] // green
      png.data[pngIdx + 2] = pgmData[idx] // blue
      png.data[pngIdx + 3] = 0xFF // alpha (opacity)
    }
  }

  return PNG.sync.write(png)
}

export default convertPgmToPng
