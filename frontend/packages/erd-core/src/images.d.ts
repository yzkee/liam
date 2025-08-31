declare module '*.png' {
  const value: string | import('next/image').StaticImageData
  export default value
}

declare module '*.mp4' {
  const value: string
  export default value
}
