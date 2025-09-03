declare module '*.png' {
  const value: string | import('next/image').StaticImageData
  export default value
}
