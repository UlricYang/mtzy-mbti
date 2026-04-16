/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
