import path, { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import express from 'express'
import sqlite3 from 'sqlite3'
import multer from 'multer'
// import sharp from 'sharp'
import { readPgmSync } from 'node-pgm'
import convertPgmToPng from './utils/pgm2png'
import type { CreateNewProjectProps, PGMSizeProps } from './types'
const app = express()
const port = 3008
const router = express.Router()

// app.use(express.static('public'))
// 把 upload 设置为 public 为访问
app.use('/upload', express.static(join(process.cwd(), 'upload')))

app.use(express.json())

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

// 设置跨域规则，开放所有域连接
app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

// 设置数据库文件夹路径
const dbDir = join(process.cwd(), 'data')
// 本地设置的绝对路径返回 类似 /Users/dealdot/Documents/dhforce/pgmXT-backend/upload/files-1702951513030.pgm
// 如果部署到服务器之后是什么情况，需要再适配一下
const uploadDir = join(process.cwd(), 'upload')
if (!existsSync(dbDir))
  mkdirSync(dbDir)

// 设置数据库路径
const dbPath = join(dbDir, 'pgm.db')

// 连接 SQLite 数据库,首次连接会创建数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message)
  }
  else {
    globalThis.console.log('Connected to the SQLite database.')
    createProjectTable()
  }
})

// 在连接数据时就创建表,如果存在则不会创建表，不用担心多次创建表 projects
function createProjectTable() {
  const sql = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    image TEXT NOT NULL,
    resolution REAL,
    origin_x REAL,
    origin_y REAL,
    origin_z REAL,
    negate INTEGER,
    occupied_thresh REAL,
    free_thresh REAL,
    pgm_url TEXT NOT NULL,
    png_url TEXT NOT NULL,
    yaml_url TEXT NOT NULL,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
)`

  db.run(sql, (err) => {
    if (err)
      console.error(err.message)

    else
      globalThis.console.log('Table \'projects\' created/verified.')
  })
}

// 定义一个全局变量存储 pgmSize
let currentPGMSize: PGMSizeProps

/*
// just for test get with querystring
router.get('/getMenu', async (req, res) => {
  res.status(200).json({ status: 'Success', message: '文件上传成功', data: { url: 'https://baidu.com/logo1.png' } })
  console.log('请求参数: ', req)
})

// just for test get with params
router.get('/getMenuId/:id', async (req, res) => {
  res.status(200).json({ status: 'Success', message: '文件上传成功', data: null })
  console.log('请求参数params: ', req.params)
})
*/

// 设置 multer 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir) // 确保这个文件夹已经存在
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
  },
})
// const convertPgmToPng = async (pgmFilePath: string): Promise<string> => {
//   const outputPath = path.join(path.dirname(pgmFilePath), `${path.basename(pgmFilePath, '.pgm')}.png`)
//   try {
//     await sharp(pgmFilePath).toFile(outputPath)
//     return outputPath
//   }
//   catch (err) {
//     console.error('Error converting image: ', err)
//     throw err
//   }
// }

// 定义 upload 函数
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /yaml|pgm/
    // const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (extname)
      return cb(null, true)

    cb(new Error(`Error: File upload only supports the following filetypes - ${filetypes}`))
  },
}).array('files')

router.post('/upload', async (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError)
      return res.status(500).json({ status: 'Fail', message: err.message, data: null })

    else if (err)
      return res.status(500).json({ status: 'Fail', message: err.message, data: null })

    // 文件上传成功
    const files = req.files as Express.Multer.File[]
    // 在返回 filename 的时候把pgm 转换为 png
    const fileName = files.map((file) => {
      // console.log('file info:', file)
      if (file.filename.endsWith('.pgm')) {
        const buffer = readFileSync(file.path)
        const pgm = readPgmSync(buffer)
        // 这里把 pgm.width, pgm.height返回前端,但发现要重写 api/upload 麻烦且返回的时候不太好确定返回的是 Pgm 还是 yaml
        const pngBuffer = convertPgmToPng(pgm.data, pgm.width, pgm.height)
        writeFileSync(`${file.destination}/${file.filename.replace('.pgm', '')}.png`, pngBuffer)
      }
      return file.filename
    })
    res.status(200).json({ status: 'Success', message: '文件上传成功', data: fileName })
  })
})

router.post('/create', async (req, res) => {
  const { project_name, image, resolution, origin, negate, occupied_thresh, free_thresh, pgm_url, png_url, yaml_url } = req.body as CreateNewProjectProps
  const [origin_x, origin_y, origin_z] = origin
  // 插入数据
  const sql = 'INSERT INTO projects (project_name, image, resolution, origin_x, origin_y, origin_z, negate, occupied_thresh, free_thresh, pgm_url, png_url, yaml_url,created_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  // 获取当前时间
  const now = new Date()

  try {
    db.run(sql, [project_name, image, resolution, origin_x, origin_y, origin_z, negate, occupied_thresh, free_thresh, pgm_url, png_url, yaml_url, now], (error) => {
      if (error)
        return res.status(500).json({ status: 'Fail', message: '数据库查询出错', data: null })
    })
    res.status(200).json({ status: 'Success', message: '创建项目成功', data: null })
  }
  catch (error) {
    res.status(400).json({ status: 'Fail', message: '创建项目失败', data: null })
  }
})

// just for test get with querystring
router.get('/getProjects', async (req, res) => {
  const sql = 'SELECT id, project_name, png_url, created_time FROM projects'
  db.all(sql, [], (err, rows: CreateNewProjectProps[]) => {
    if (err)
      return res.status(500).json({ status: 'Fail', message: '查询项目失败', data: err.message })
    res.status(200).json({ status: 'Success', message: '查询项目成功', data: rows })
  })
})

// get Project by projectId
router.get('/getProject/', async (req, res) => {
  const projectId = req.query.projectId
  // 验证 projectId 是否为有效数字
  if (!projectId || isNaN(Number(projectId)))
    return res.status(400).json({ status: 'Fail', message: '无效的项目ID', data: null })

  const sql = 'SELECT * FROM projects WHERE id = ?'

  db.get(sql, [projectId], (error, row: CreateNewProjectProps) => {
    if (error)
      return res.status(500).json({ status: 'Fail', message: '查询项目失败', data: error.message })
    if (row)
      res.status(200).json({ status: 'Success', message: '查询项目成功', data: row })
    else
      res.status(404).json({ status: 'Fail', message: '项目未找到', data: null })
  })
})
// getPGMArrayBuffer
router.get('/getPGMArrayBufferData/:fileName', async (req, res) => {
  const fieldName = req.params.fileName
  const filePath = path.join(uploadDir, fieldName)
  if (!existsSync(filePath))
    return res.status(404).json({ status: 'Fail', message: ' pgm文件不存在', data: null })
  const buffer = readFileSync(filePath)
  const pgm = readPgmSync(buffer)
  // 或者在这里返回前端 pgm.width, pgm.height 也可以,这样就不用存数据库了
  // 思路：把二进制数据转换为 base64字符串 即pgm.data.toString('base64),然后和其它数据一起返回，不过 base64增加约33%的数据大小
  // 因此还是把在上传文件的时候把 width, height返回前端存储在数据库中使用更好一些，这个时候处理也比较麻烦
  // 因此再多加一个接口专门用于返回 width, height
  if (pgm) {
    // console.log('pgmSize: ', pgm.width, pgm.height)
    // console.log('后端:', pgm.data)
    currentPGMSize = { width: pgm.width, height: pgm.height }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.send(pgm.data)
  }
})
router.get('/getCurrentPGMSize', async (req, res) => {
  if (currentPGMSize)
    res.status(200).json({ status: 'Success', message: '获取尺寸信息成功', data: currentPGMSize })

  else
    return res.status(404).json({ status: 'Fail', message: ' pgm文件尺寸信息不存在', data: null })
})
// delete project by projectId
router.delete('/delProject/:projectId', async (req, res) => {
  const projectId = req.params.projectId
  // 验证 projectId 是否为有效数字
  if (!projectId || isNaN(Number(projectId)))
    return res.status(400).json({ status: 'Fail', message: '无效的项目ID', data: null })

  const sql = 'DELETE FROM projects WHERE id = ?'

  db.run(sql, projectId, function (err) {
    if (err) {
      return res.status(500).json({ status: 'Fail', message: '数据库查询出错', data: null })
    }
    else {
      if (this.changes > 0)
        res.status(200).json({ status: 'Success', message: '项目删除成功', data: null })

      else
        res.status(404).json({ status: 'Fail', message: '项目未找到', data: null })
    }
  })
})

app.listen(port, () => globalThis.console.log(`Server is running on port ${port}`))

// 关闭数据库连接
process.on('SIGINT', () => {
  db.close((err) => {
    if (err)
      console.error(err.message)

    globalThis.console.log('Database connection closed.')
    process.exit(0)
  })
})
