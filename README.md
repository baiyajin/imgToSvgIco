# SVGcode：将栅格图像转换为 SVG 矢量图形的渐进式 Web 应用

SVGcode 是一个渐进式 Web 应用（PWA），可以将 JPG、PNG、GIF、WebP、AVIF 等栅格图像转换为 SVG 格式的矢量图形。该应用使用了文件系统访问 API、异步剪贴板 API、文件处理 API 和窗口控件叠加自定义等功能。

> **致谢与说明**  
> 本项目基于原作者 [Thomas Steiner](https://github.com/tomayac/SVGcode) 的开源项目 SVGcode 进行强化和改进。在此特别感谢原作者的开源贡献，让我们能够在这个优秀的基础上继续发展。原始项目地址：[https://github.com/tomayac/SVGcode](https://github.com/tomayac/SVGcode)

## 关于强化版本

本版本在原版 SVGcode 的基础上进行了多项优化和功能增强，包括但不限于：
- 性能优化和代码改进
- 用户体验提升
- 功能扩展和增强
- 中文文档和本地化支持

### 新增功能特性

#### 🎯 智能路径处理功能

1. **智能路径简化** - 使用 Douglas-Peucker 算法一键处理两点之间多余的节点，简化 SVG 路径，减少文件大小
2. **路径平滑处理** - 添加路径平滑度滑块，使用高斯平滑和 Catmull-Rom 样条平滑锯齿状路径
3. **智能路径合并** - 自动合并相同颜色且相邻的路径，进一步减少 SVG 文件大小
4. **自动去除小区域** - 智能识别并移除小于指定阈值的路径区域（噪点清理）
5. **路径轮廓提取** - 提取并显示图像的轮廓路径，支持可调轮廓宽度（0-20 像素）

#### 🖼️ 图像预处理增强

6. **智能主体提取** - 快速抠出图片上的主体，使用 Canvas API 实现背景移除和边缘检测
7. **边缘检测增强** - 在图像预处理中添加 Canny 边缘检测和 Sobel 边缘检测选项，提高转换质量

#### 🎨 SVG 优化功能

8. **智能色彩量化优化** - 自动优化色彩量化算法，减少颜色数量（2-256 级）同时保持视觉质量
9. **智能路径分组** - 按颜色或区域自动将路径分组，便于后续编辑和管理
10. **SVG 预览模式切换** - 支持正常、填充、轮廓、线框等多种预览方式，方便查看不同效果

#### ✏️ 交互式编辑功能

11. **路径节点可视化编辑器** - 允许用户手动编辑路径节点，拖拽调整节点位置，双击删除节点，实时预览编辑效果

#### 📊 信息显示功能

12. **路径统计信息面板** - 实时显示路径数量、节点数量、颜色数量、文件大小等统计信息，帮助用户了解 SVG 文件详情

#### 🚀 批量处理功能

13. **批处理功能** - 支持一次处理多张图片，批量转换为 SVG，自动导出处理结果

#### 💾 导出扩展功能

14. **导出格式扩展** - 支持导出为 PNG 等其他格式（在 SVG 基础上），方便在不同场景使用

### 功能使用说明

#### 路径简化和平滑
- **路径简化**：在 SVG 选项中调整"路径简化"滑块（0-10 像素），值越大简化程度越高
- **路径平滑**：在 SVG 选项中调整"路径平滑"滑块（0-100%），值越大平滑程度越高

#### 主体提取和边缘检测
- **主体提取**：勾选"提取主体"复选框，启用智能背景移除功能
- **边缘检测**：在图像预处理阶段可选择使用 Sobel 或 Canny 边缘检测算法

#### 路径优化选项
- **去除小区域**：调整"去除小区域"滑块（0-100 像素），移除小于指定尺寸的路径
- **路径轮廓**：调整"路径轮廓"滑块（0-20 像素），提取并显示路径轮廓
- **色彩量化**：调整"色彩量化"滑块（2-256 级），减少颜色数量
- **路径合并**：勾选"路径合并"复选框，自动合并相邻的同色路径
- **路径分组**：勾选"智能路径分组"复选框，按颜色或区域自动分组

#### 预览和编辑
- **预览模式**：在顶部菜单栏的下拉菜单中选择预览模式（正常/填充/轮廓/线框）
- **路径编辑器**：勾选"路径节点编辑器"复选框，启用后可拖拽调整节点位置，双击删除节点
- **统计信息**：处理完成后，右上角会显示路径统计信息面板

#### 批处理
- 点击"打开图像"按钮时，按住 Ctrl（Windows/Linux）或 Cmd（Mac）选择多个文件
- 系统会自动批量处理并导出所有图片

#### 导出格式
- 点击顶部菜单栏的"导出 PNG"按钮，将当前 SVG 导出为 PNG 格式

原版应用可在 [SVGco.de](https://svgco.de/) 访问，更多背景信息请参阅原作者的[文章](https://web.dev/svgcode/)或观看[视频](https://youtu.be/kcvfyQh6J-0?)。

<a href="https://svgco.de/">
  <img src="https://github.com/tomayac/SVGcode/raw/main/public/screenshots/desktop-dark.png" alt="SVGcode 应用截图" width="707" height="497" />
</a>

## 访问方式

除了在 [svgco.de](https://svgco.de/) 使用 Web 应用外，您也可以从以下商店安装 SVGcode：

<a href="https://svgco.de/"><img height="50px" src="https://raw.githubusercontent.com/tomayac/SVGcode/main/public/badges/web-browser.svg"></a>

<a href="https://www.microsoft.com/en-us/p/svgcode/9plhxdgsw1rj#activetab=pivot:overviewtab"><img height="50px" src="https://raw.githubusercontent.com/tomayac/SVGcode/main/public/badges/microsoft-store.svg"></a>

## 开发与贡献

1. Fork 本仓库
2. 从您的 Fork 克隆：
   ```bash
   git clone git@github.com:<您的 GitHub 账户>/SVGcode.git
   ```
3. 进入应用目录：`cd SVGcode`
4. 安装依赖：`npm i`
5. 启动应用：`npm start`
6. 在浏览器中打开应用：
   [http://localhost:3000](http://localhost:3000)
7. 查看[现有议题](https://github.com/tomayac/SVGcode/issues)或创建[新议题](https://github.com/tomayac/SVGcode/issues/new/choose)描述您的计划
8. 开始编码！Vite 会在更改时自动重新加载应用
9. 检查代码风格：`npm run lint`
10. 确保您的更改符合代码风格：`npm run fix`
11. 开启 Pull Request 来修复议题（见第 7 步）
12. 祝编码愉快，感谢您对 SVGcode 的关注！

## 贡献翻译

如果 SVGcode 尚未提供您的语言版本，欢迎贡献翻译。请复制 [`src/i18n/`](https://github.com/tomayac/SVGcode/blob/main/src/i18n/) 目录中的某个文件（大多数用户可能最熟悉 [`en-US.js`](https://github.com/tomayac/SVGcode/blob/main/src/i18n/en-US.js)）并翻译其中的字符串。新文件命名请遵循[语言标识标签](https://tools.ietf.org/rfc/bcp/bcp47.txt)（格式如 `$language-$REGION`，例如 `en-US`）。然后将语言代码添加到 [`src/js/i18n.js`](https://github.com/tomayac/SVGcode/blob/main/src/js/i18n.js) 中的 `SUPPORTED_LANGUAGES` 数组，将区域设置添加到同一文件中的 `SUPPORTED_LOCALES` 数组。感谢您的贡献！

## 致谢

### 原始项目作者

感谢 [Thomas Steiner](https://github.com/tomayac) 创建并开源了 SVGcode 项目，为我们的工作提供了坚实的基础。

### 核心技术依赖

SVGcode 建立在以下优秀工具的基础上：

- **[Potrace](http://potrace.sourceforge.net/)**：由 [Peter Selinger](https://www.mathstat.dal.ca/~selinger/) 开发的命令行工具，已[转换为 Web Assembly](https://www.npmjs.com/package/esm-potrace-wasm) 以便在 Web 应用中使用
- **[SVGO](https://github.com/svg/svgo)**：用于自动优化转换后的 SVG 文件

## 替代方案

以下项目必须满足以下条件：基于 Web、可免费使用且可选择保存 SVG、开源、不需要用户登录：

- [VTracer](https://www.visioncortex.org/vtracer/#) ([源代码](https://github.com/visioncortex/vtracer))
- [Image to SVG](https://tools.simonwillison.net/image-to-svg)（基于 [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs)）

## 许可证

GNU General Public License v2.0

（这是因为 Potrace 选择了 [GNU General Public License v2.0](http://potrace.sourceforge.net/#license)。）
