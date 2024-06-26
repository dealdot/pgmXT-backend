# chatgpt-backend
pgmXT backend build from express

### dev
pnpm run dev

### issues
1. 碰到使用 pnpm add sharp 的时候一系列错误提示，说什么 sharp 要单独安装 mac arm64格式之类的，查到是因为 node 版本过低，把 Node切到18.18，从而 nvm 版本也升级了这个错就没有了 见 https://github.com/lovell/sharp/issues/3807，但最后发现 sharp 也不支持 pgm 图片的导出，只能自己重写了
2. 解析 pgm 的库:  https://www.npmjs.com/package/node-pgm,使用 pgm 库解析 pgm 的 buffer 然后再使用 pngjs 进行转换为 png 图像，在线转换的网站  https://convertio.co/zh/pgm-png/


3. pgm 图像简介

PGM（Portable GrayMap）格式是一种简单的图像格式，属于Netpbm格式家族。PGM图像专注于灰度，不包含任何颜色信息。这种格式通常用于科学应用和图像处理中，因为它的简单性和易于编程处理的特点。

PGM格式有两种变体：P2（ASCII编码）和P5（二进制编码）。在PGM文件中，图像数据由灰度值组成，这些值定义了图像中每个像素的亮度。

在P5格式的PGM文件中，灰度 `255` 指的是：

- **灰度范围**：PGM图像的灰度范围通常是从0到最大灰度值（在头部信息中指定）。`255` 是常用的最大灰度值，表示每个像素用8位（一个字节）来表示，可以有256个不同的灰度级别（从0到255）。
- **最大灰度值**：在这个范围内，`0` 通常表示黑色，最大值（如 `255`）表示白色，而介于两者之间的值表示不同级别的灰色。
- **可变最大灰度值**：最大灰度值不一定是 `255`。它可以是其他值，取决于文件的头部信息。例如，如果最大灰度值设为 `15`，则图像的灰度级别范围是0到15。

因此，PGM图像的最大灰度值可以是不同的数值，这取决于你需要的灰度级别的精细度。更高的最大灰度值意味着可以表示更多的灰度级别，从而在灰度图像中获得更细腻的细节和对比度。

### License

This project is under the MIT License. Refer to the [LICENSE](https://github.com/dealdot/pgmXT-backend/blob/main/LICENSE) file for detailed information.